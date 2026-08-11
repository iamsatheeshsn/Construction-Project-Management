<?php

namespace App\Modules\Subcontractors\Services;

use App\Core\Audit\Services\AuditTrail;
use App\Core\Tenant\TenantManager;
use App\Modules\Projects\Models\Project;
use App\Modules\Subcontractors\Models\Subcontractor;
use App\Modules\Subcontractors\Models\SubcontractPackage;
use App\Modules\Subcontractors\Models\SubcontractPackageItem;
use App\Shared\Support\DocumentNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubcontractorService
{
    public function createSubcontractor(array $data): Subcontractor
    {
        if (empty($data['code'])) {
            $tenantId = app(TenantManager::class)->id();
            $data['code'] = DocumentNumber::forTenant('SUB', 'subcontractors', (int) $tenantId);
        }

        $data['status'] = $data['status'] ?? 'active';

        return Subcontractor::query()->create($data);
    }

    public function updateSubcontractor(Subcontractor $subcontractor, array $data): Subcontractor
    {
        $subcontractor->update($data);

        return $subcontractor->fresh();
    }

    public function createPackage(Project $project, array $data, ?int $userId = null): SubcontractPackage
    {
        Subcontractor::query()->findOrFail($data['subcontractor_id']);

        $packageNo = $data['package_no'] ?? DocumentNumber::forProject('PKG', 'subcontract_packages', $project->id);

        return SubcontractPackage::query()->create([
            'project_id' => $project->id,
            'subcontractor_id' => $data['subcontractor_id'],
            'package_no' => $packageNo,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => 'draft',
            'currency' => strtoupper($data['currency'] ?? $project->currency ?? 'AED'),
            'contract_value' => 0,
            'retention_percent' => $data['retention_percent'] ?? 0,
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
            'created_by' => $userId,
        ]);
    }

    public function updatePackage(Project $project, SubcontractPackage $package, array $data): SubcontractPackage
    {
        $this->assertProject($project, $package);
        $this->assertDraft($package);

        if (isset($data['currency'])) {
            $data['currency'] = strtoupper($data['currency']);
        }

        $package->update($data);

        return $package->fresh();
    }

    public function addPackageItem(Project $project, SubcontractPackage $package, array $data): SubcontractPackageItem
    {
        $this->assertProject($project, $package);
        $this->assertDraft($package);

        return DB::transaction(function () use ($package, $data) {
            $qty = (float) ($data['quantity'] ?? 0);
            $rate = (float) ($data['rate'] ?? 0);
            $data['subcontract_package_id'] = $package->id;
            $data['amount'] = round($qty * $rate, 2);

            $item = SubcontractPackageItem::query()->create($data);
            $this->recalculateContractValue($package);

            return $item;
        });
    }

    public function deletePackageItem(Project $project, SubcontractPackage $package, SubcontractPackageItem $item): void
    {
        $this->assertProject($project, $package);
        $this->assertDraft($package);

        if ($item->subcontract_package_id !== $package->id) {
            abort(404);
        }

        DB::transaction(function () use ($package, $item) {
            $item->delete();
            $this->recalculateContractValue($package);
        });
    }

    public function awardPackage(Project $project, SubcontractPackage $package): SubcontractPackage
    {
        $this->assertProject($project, $package);

        if ($package->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft packages can be awarded.'],
            ]);
        }

        if ($package->items()->count() === 0) {
            throw ValidationException::withMessages([
                'items' => ['Package must have at least one item before awarding.'],
            ]);
        }

        $package->update([
            'status' => 'awarded',
            'awarded_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'subcontractors',
            'action' => 'package_awarded',
            'entity_type' => 'subcontract_package',
            'entity_id' => $package->id,
            'project_id' => $project->id,
            'description' => "Subcontract package {$package->package_no} awarded",
            'title' => 'Subcontract package awarded',
            'body' => "{$package->package_no}: {$package->title}",
            'new' => ['status' => 'awarded', 'contract_value' => $package->contract_value],
        ]);

        return $package->fresh()->load(['subcontractor', 'items']);
    }

    public function activatePackage(Project $project, SubcontractPackage $package): SubcontractPackage
    {
        $this->assertProject($project, $package);

        if ($package->status !== 'awarded') {
            throw ValidationException::withMessages([
                'status' => ['Only awarded packages can be activated.'],
            ]);
        }

        $package->update(['status' => 'active']);

        return $package->fresh()->load(['subcontractor', 'items']);
    }

    public function completePackage(Project $project, SubcontractPackage $package): SubcontractPackage
    {
        $this->assertProject($project, $package);

        if ($package->status !== 'active') {
            throw ValidationException::withMessages([
                'status' => ['Only active packages can be completed.'],
            ]);
        }

        $package->update([
            'status' => 'completed',
            'end_date' => $package->end_date ?? now()->toDateString(),
        ]);

        return $package->fresh()->load(['subcontractor', 'items']);
    }

    public function recalculateContractValue(SubcontractPackage $package): void
    {
        $total = (float) SubcontractPackageItem::query()
            ->where('subcontract_package_id', $package->id)
            ->sum('amount');

        $package->update(['contract_value' => round($total, 2)]);
    }

    private function assertProject(Project $project, SubcontractPackage $package): void
    {
        if ((int) $package->project_id !== (int) $project->id) {
            abort(404);
        }
    }

    private function assertDraft(SubcontractPackage $package): void
    {
        if ($package->status !== 'draft') {
            throw ValidationException::withMessages([
                'package' => ['Only draft packages can be edited.'],
            ]);
        }
    }
}
