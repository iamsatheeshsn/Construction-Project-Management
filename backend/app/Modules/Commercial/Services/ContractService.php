<?php

namespace App\Modules\Commercial\Services;

use App\Modules\Commercial\Models\Boq;
use App\Modules\Commercial\Models\BoqItem;
use App\Modules\Commercial\Models\Contract;
use App\Modules\Commercial\Models\ContractItem;
use App\Modules\Projects\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ContractService
{
    public function create(Project $project, array $data, ?int $userId = null): Contract
    {
        return DB::transaction(function () use ($project, $data, $userId) {
            $importBoqId = $data['import_boq_id'] ?? null;
            unset($data['import_boq_id']);

            $data['project_id'] = $project->id;
            $data['created_by'] = $userId;
            $data['currency'] = strtoupper($data['currency'] ?? $project->currency ?? 'AED');
            $data['status'] = $data['status'] ?? 'draft';
            $data['contract_type'] = $data['contract_type'] ?? 'main';
            $data['client_id'] = $data['client_id'] ?? $project->client_id;
            $data['contract_value'] = $data['contract_value'] ?? 0;

            $contract = Contract::query()->create($data);

            if ($importBoqId) {
                $this->importFromBoq($project, $contract, (int) $importBoqId);
            }

            return $contract->load(['client:id,name,code'])->loadCount('items');
        });
    }

    public function update(Project $project, Contract $contract, array $data): Contract
    {
        $this->assertProject($project, $contract);

        if (isset($data['currency'])) {
            $data['currency'] = strtoupper($data['currency']);
        }

        $contract->update($data);

        return $contract->fresh()->load(['client:id,name,code'])->loadCount('items');
    }

    public function addItem(Project $project, Contract $contract, array $data): ContractItem
    {
        $this->assertProject($project, $contract);

        return DB::transaction(function () use ($project, $contract, $data) {
            $qty = (float) ($data['quantity'] ?? 0);
            $rate = (float) ($data['rate'] ?? 0);
            $data['contract_id'] = $contract->id;
            $data['amount'] = round($qty * $rate, 2);
            $data['sort_order'] = $data['sort_order'] ?? (
                ((int) ContractItem::query()->where('contract_id', $contract->id)->max('sort_order')) + 1
            );

            if (! empty($data['boq_item_id'])) {
                $boqItem = BoqItem::query()->findOrFail($data['boq_item_id']);
                $boqProjectId = Boq::query()->where('id', $boqItem->boq_id)->value('project_id');
                if ((int) $boqProjectId !== (int) $project->id) {
                    throw ValidationException::withMessages([
                        'boq_item_id' => ['BOQ item must belong to this project.'],
                    ]);
                }
            }

            $item = ContractItem::query()->create($data);
            $this->recalculateValue($contract);

            return $item->load('boqItem:id,item_no,description');
        });
    }

    public function updateItem(Project $project, Contract $contract, ContractItem $item, array $data): ContractItem
    {
        $this->assertProject($project, $contract);
        if ($item->contract_id !== $contract->id) {
            abort(404);
        }

        return DB::transaction(function () use ($contract, $item, $data) {
            $qty = array_key_exists('quantity', $data) ? (float) $data['quantity'] : (float) $item->quantity;
            $rate = array_key_exists('rate', $data) ? (float) $data['rate'] : (float) $item->rate;
            $data['amount'] = round($qty * $rate, 2);
            $item->update($data);
            $this->recalculateValue($contract);

            return $item->fresh()->load('boqItem:id,item_no,description');
        });
    }

    public function deleteItem(Project $project, Contract $contract, ContractItem $item): void
    {
        $this->assertProject($project, $contract);
        if ($item->contract_id !== $contract->id) {
            abort(404);
        }

        DB::transaction(function () use ($contract, $item) {
            $item->delete();
            $this->recalculateValue($contract);
        });
    }

    public function importFromBoq(Project $project, Contract $contract, int $boqId): void
    {
        $boq = Boq::query()->where('project_id', $project->id)->findOrFail($boqId);

        $items = BoqItem::query()
            ->where('boq_id', $boq->id)
            ->orderBy('sort_order')
            ->orderBy('item_no')
            ->get();

        $sort = ((int) ContractItem::query()->where('contract_id', $contract->id)->max('sort_order'));

        foreach ($items as $boqItem) {
            $sort++;
            ContractItem::query()->create([
                'contract_id' => $contract->id,
                'boq_item_id' => $boqItem->id,
                'description' => $boqItem->description,
                'unit' => $boqItem->unit,
                'quantity' => $boqItem->quantity,
                'rate' => $boqItem->rate,
                'amount' => $boqItem->amount,
                'sort_order' => $sort,
            ]);
        }

        $this->recalculateValue($contract);

        if ((float) $contract->contract_value > 0 && empty($project->contract_value)) {
            $project->update(['contract_value' => $contract->contract_value]);
        } elseif ((float) $contract->fresh()->contract_value > 0) {
            $project->update(['contract_value' => $contract->fresh()->contract_value]);
        }
    }

    public function recalculateValue(Contract $contract): void
    {
        $total = (float) ContractItem::query()->where('contract_id', $contract->id)->sum('amount');
        $contract->update(['contract_value' => round($total, 2)]);
    }

    private function assertProject(Project $project, Contract $contract): void
    {
        if ($contract->project_id !== $project->id) {
            abort(404);
        }
    }
}
