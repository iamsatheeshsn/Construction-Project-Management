<?php

namespace App\Modules\Inventory\Services;

use App\Core\Audit\Services\AuditTrail;
use App\Modules\Inventory\Models\MaterialIssue;
use App\Modules\Inventory\Models\MaterialIssueItem;
use App\Modules\Inventory\Models\Warehouse;
use App\Modules\Projects\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MaterialIssueService
{
    public function __construct(private StockService $stock) {}

    public function create(Project $project, array $data, ?int $userId = null): MaterialIssue
    {
        Warehouse::query()->findOrFail($data['warehouse_id']);

        $data['project_id'] = $project->id;
        $data['status'] = $data['status'] ?? 'draft';
        $data['issue_date'] = $data['issue_date'] ?? now()->toDateString();
        $data['issued_by'] = $userId;

        return MaterialIssue::query()->create($data);
    }

    public function update(Project $project, MaterialIssue $issue, array $data): MaterialIssue
    {
        $this->assertProject($project, $issue);
        $this->assertDraft($issue);

        if (! empty($data['warehouse_id'])) {
            Warehouse::query()->findOrFail($data['warehouse_id']);
        }

        $issue->update($data);

        return $issue->fresh();
    }

    public function addItem(Project $project, MaterialIssue $issue, array $data): MaterialIssueItem
    {
        $this->assertProject($project, $issue);
        $this->assertDraft($issue);

        $data['material_issue_id'] = $issue->id;

        return MaterialIssueItem::query()->create($data);
    }

    public function post(Project $project, MaterialIssue $issue, ?int $userId = null): MaterialIssue
    {
        $this->assertProject($project, $issue);

        if ($issue->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft material issues can be posted.'],
            ]);
        }

        if ($issue->items()->count() === 0) {
            throw ValidationException::withMessages([
                'items' => ['Material issue must have at least one item.'],
            ]);
        }

        return DB::transaction(function () use ($project, $issue, $userId) {
            $this->stock->postMaterialIssueStock($issue, $userId);

            $issue->update([
                'status' => 'posted',
                'posted_at' => now(),
            ]);

            app(AuditTrail::class)->record([
                'module' => 'inventory',
                'action' => 'material_issue_posted',
                'entity_type' => 'material_issue',
                'entity_id' => $issue->id,
                'project_id' => $project->id,
                'description' => "Material issue {$issue->issue_no} posted",
                'title' => 'Material issue posted',
                'body' => "{$issue->issue_no} on {$issue->issue_date->toDateString()}",
                'new' => ['status' => 'posted'],
            ]);

            return $issue->fresh()->load('items.inventoryItem:id,sku,name');
        });
    }

    private function assertProject(Project $project, MaterialIssue $issue): void
    {
        if ((int) $issue->project_id !== (int) $project->id) {
            abort(404);
        }
    }

    private function assertDraft(MaterialIssue $issue): void
    {
        if ($issue->status !== 'draft') {
            throw ValidationException::withMessages([
                'issue' => ['Only draft material issues can be edited.'],
            ]);
        }
    }
}
