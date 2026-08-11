<?php

namespace App\Modules\Commercial\Services;

use App\Core\Audit\Services\AuditTrail;
use App\Modules\Commercial\Models\Contract;
use App\Modules\Commercial\Models\Variation;
use App\Modules\Commercial\Models\VariationItem;
use App\Modules\Projects\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VariationService
{
    public function create(Project $project, array $data, ?int $userId = null): Variation
    {
        if (! empty($data['contract_id'])) {
            Contract::query()->where('project_id', $project->id)->findOrFail($data['contract_id']);
        }

        $data['project_id'] = $project->id;
        $data['created_by'] = $userId;
        $data['status'] = $data['status'] ?? 'draft';
        $data['cost_impact'] = $data['cost_impact'] ?? 0;
        $data['time_impact_days'] = $data['time_impact_days'] ?? 0;

        return Variation::query()->create($data);
    }

    public function update(Project $project, Variation $variation, array $data): Variation
    {
        $this->assertProject($project, $variation);
        $this->assertEditable($variation);

        if (! empty($data['contract_id'])) {
            Contract::query()->where('project_id', $project->id)->findOrFail($data['contract_id']);
        }

        $variation->update($data);

        return $variation->fresh();
    }

    public function addItem(Project $project, Variation $variation, array $data): VariationItem
    {
        $this->assertProject($project, $variation);
        $this->assertEditable($variation);

        return DB::transaction(function () use ($variation, $data) {
            $qty = (float) ($data['quantity'] ?? 0);
            $rate = (float) ($data['rate'] ?? 0);
            $data['variation_id'] = $variation->id;
            $data['amount'] = round($qty * $rate, 2);

            $item = VariationItem::query()->create($data);
            $this->recalculate($variation);

            return $item;
        });
    }

    public function deleteItem(Project $project, Variation $variation, VariationItem $item): void
    {
        $this->assertProject($project, $variation);
        $this->assertEditable($variation);
        if ($item->variation_id !== $variation->id) {
            abort(404);
        }

        DB::transaction(function () use ($variation, $item) {
            $item->delete();
            $this->recalculate($variation);
        });
    }

    public function submit(Project $project, Variation $variation): Variation
    {
        $this->assertProject($project, $variation);
        if ($variation->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft variations can be submitted.'],
            ]);
        }

        $variation->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'variations',
            'action' => 'submitted',
            'entity_type' => 'variation',
            'entity_id' => $variation->id,
            'project_id' => $project->id,
            'description' => "Variation {$variation->variation_no} submitted",
            'title' => 'Variation submitted',
            'body' => "{$variation->variation_no}: {$variation->title}",
            'new' => ['status' => 'submitted', 'cost_impact' => $variation->cost_impact],
        ]);

        return $variation->fresh();
    }

    public function decide(Project $project, Variation $variation, string $status, int $userId): Variation
    {
        $this->assertProject($project, $variation);

        if (! in_array($status, ['approved', 'rejected', 'implemented'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Decision must be approved, rejected, or implemented.'],
            ]);
        }

        $variation->update([
            'status' => $status,
            'decided_by' => $userId,
            'decided_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'variations',
            'action' => $status,
            'entity_type' => 'variation',
            'entity_id' => $variation->id,
            'project_id' => $project->id,
            'description' => "Variation {$variation->variation_no} {$status}",
            'title' => 'Variation '.$status,
            'body' => "{$variation->variation_no}: {$variation->title}",
            'notify_user_ids' => array_values(array_filter([$variation->created_by])),
            'new' => ['status' => $status, 'cost_impact' => $variation->cost_impact],
        ]);

        return $variation->fresh();
    }

    public function recalculate(Variation $variation): void
    {
        $total = (float) VariationItem::query()->where('variation_id', $variation->id)->sum('amount');
        $variation->update(['cost_impact' => round($total, 2)]);
    }

    private function assertProject(Project $project, Variation $variation): void
    {
        if ($variation->project_id !== $project->id) {
            abort(404);
        }
    }

    private function assertEditable(Variation $variation): void
    {
        if (! in_array($variation->status, ['draft', 'cost_assessment'], true)) {
            throw ValidationException::withMessages([
                'variation' => ['This variation can no longer be edited.'],
            ]);
        }
    }
}
