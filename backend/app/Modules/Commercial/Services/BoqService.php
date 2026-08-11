<?php

namespace App\Modules\Commercial\Services;

use App\Modules\Commercial\Models\Boq;
use App\Modules\Commercial\Models\BoqItem;
use App\Modules\Projects\Models\Project;
use App\Core\Audit\Services\AuditTrail;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BoqService
{
    public function create(Project $project, array $data, ?int $userId = null): Boq
    {
        $data['project_id'] = $project->id;
        $data['created_by'] = $userId;
        $data['currency'] = strtoupper($data['currency'] ?? $project->currency ?? 'AED');
        $data['status'] = $data['status'] ?? 'draft';
        $data['version'] = $data['version'] ?? '1.0';
        $data['total_amount'] = 0;

        return Boq::query()->create($data);
    }

    public function update(Project $project, Boq $boq, array $data): Boq
    {
        $this->assertProject($project, $boq);

        if (isset($data['currency'])) {
            $data['currency'] = strtoupper($data['currency']);
        }

        if (($data['status'] ?? null) === 'approved' && $boq->status !== 'approved') {
            throw ValidationException::withMessages([
                'status' => ['Use the approve endpoint to approve a BOQ.'],
            ]);
        }

        $boq->update($data);

        return $boq->fresh();
    }

    public function addItem(Project $project, Boq $boq, array $data): BoqItem
    {
        $this->assertProject($project, $boq);
        $this->assertEditable($boq);

        return DB::transaction(function () use ($boq, $data) {
            $qty = (float) ($data['quantity'] ?? 0);
            $rate = (float) ($data['rate'] ?? 0);
            $data['boq_id'] = $boq->id;
            $data['amount'] = round($qty * $rate, 2);
            $data['sort_order'] = $data['sort_order'] ?? (
                ((int) BoqItem::query()->where('boq_id', $boq->id)->max('sort_order')) + 1
            );

            $item = BoqItem::query()->create($data);
            $this->recalculateTotal($boq);

            return $item->load(['wbs:id,code,name', 'costCode:id,code,name']);
        });
    }

    public function updateItem(Project $project, Boq $boq, BoqItem $item, array $data): BoqItem
    {
        $this->assertProject($project, $boq);
        $this->assertEditable($boq);

        if ($item->boq_id !== $boq->id) {
            abort(404);
        }

        return DB::transaction(function () use ($boq, $item, $data) {
            $qty = array_key_exists('quantity', $data) ? (float) $data['quantity'] : (float) $item->quantity;
            $rate = array_key_exists('rate', $data) ? (float) $data['rate'] : (float) $item->rate;
            $data['amount'] = round($qty * $rate, 2);

            $item->update($data);
            $this->recalculateTotal($boq);

            return $item->fresh()->load(['wbs:id,code,name', 'costCode:id,code,name']);
        });
    }

    public function deleteItem(Project $project, Boq $boq, BoqItem $item): void
    {
        $this->assertProject($project, $boq);
        $this->assertEditable($boq);

        if ($item->boq_id !== $boq->id) {
            abort(404);
        }

        DB::transaction(function () use ($boq, $item) {
            $item->delete();
            $this->recalculateTotal($boq);
        });
    }

    public function approve(Project $project, Boq $boq, int $userId): Boq
    {
        $this->assertProject($project, $boq);

        if ($boq->status === 'approved') {
            return $boq;
        }

        $boq->update([
            'status' => 'approved',
            'approved_by' => $userId,
            'approved_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'boq',
            'action' => 'approved',
            'entity_type' => 'boq',
            'entity_id' => $boq->id,
            'project_id' => $project->id,
            'description' => "BOQ \"{$boq->title}\" v{$boq->version} approved",
            'title' => 'BOQ approved',
            'body' => "{$boq->title} (v{$boq->version}) was approved.",
            'new' => ['status' => 'approved', 'total_amount' => $boq->total_amount],
        ]);

        return $boq->fresh();
    }

    public function recalculateTotal(Boq $boq): void
    {
        $total = (float) BoqItem::query()->where('boq_id', $boq->id)->sum('amount');
        $boq->update(['total_amount' => round($total, 2)]);
    }

    private function assertProject(Project $project, Boq $boq): void
    {
        if ($boq->project_id !== $project->id) {
            abort(404);
        }
    }

    private function assertEditable(Boq $boq): void
    {
        if (in_array($boq->status, ['approved', 'superseded'], true)) {
            throw ValidationException::withMessages([
                'boq' => ['Approved/superseded BOQs cannot be edited. Create a new version instead.'],
            ]);
        }
    }
}
