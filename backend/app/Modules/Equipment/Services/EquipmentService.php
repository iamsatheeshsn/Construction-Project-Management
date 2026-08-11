<?php

namespace App\Modules\Equipment\Services;

use App\Core\Audit\Services\AuditTrail;
use App\Core\Tenant\TenantManager;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\EquipmentAssignment;
use App\Modules\Equipment\Models\EquipmentUsageLog;
use App\Modules\Projects\Models\Project;
use App\Shared\Support\DocumentNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EquipmentService
{
    public function createEquipment(array $data): Equipment
    {
        if (empty($data['code'])) {
            $tenantId = app(TenantManager::class)->id();
            $data['code'] = DocumentNumber::forTenant('EQ', 'equipment', (int) $tenantId);
        }

        $data['status'] = $data['status'] ?? 'available';
        $data['ownership'] = $data['ownership'] ?? 'owned';
        $data['daily_rate'] = $data['daily_rate'] ?? 0;

        return Equipment::query()->create($data);
    }

    public function updateEquipment(Equipment $equipment, array $data): Equipment
    {
        $equipment->update($data);

        return $equipment->fresh();
    }

    public function assignToProject(Project $project, Equipment $equipment, array $data, ?int $userId = null): EquipmentAssignment
    {
        if ($equipment->status === 'retired') {
            throw ValidationException::withMessages([
                'equipment' => ['Retired equipment cannot be assigned.'],
            ]);
        }

        $assignmentNo = $data['assignment_no'] ?? DocumentNumber::forProject('EA', 'equipment_assignments', $project->id);

        return EquipmentAssignment::query()->create([
            'project_id' => $project->id,
            'equipment_id' => $equipment->id,
            'assignment_no' => $assignmentNo,
            'operator_name' => $data['operator_name'] ?? null,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'] ?? null,
            'daily_rate' => $data['daily_rate'] ?? $equipment->daily_rate ?? 0,
            'status' => $data['status'] ?? 'planned',
            'notes' => $data['notes'] ?? null,
            'created_by' => $userId,
        ]);
    }

    public function updateAssignment(Project $project, EquipmentAssignment $assignment, array $data): EquipmentAssignment
    {
        $this->assertProject($project, $assignment);

        if (! in_array($assignment->status, ['planned'], true)) {
            throw ValidationException::withMessages([
                'assignment' => ['Only planned assignments can be edited.'],
            ]);
        }

        $assignment->update($data);

        return $assignment->fresh();
    }

    public function activateAssignment(Project $project, EquipmentAssignment $assignment): EquipmentAssignment
    {
        $this->assertProject($project, $assignment);

        if ($assignment->status !== 'planned') {
            throw ValidationException::withMessages([
                'status' => ['Only planned assignments can be activated.'],
            ]);
        }

        return DB::transaction(function () use ($project, $assignment) {
            $assignment->update(['status' => 'active']);

            $equipment = $assignment->equipment()->first();
            if ($equipment) {
                $equipment->update(['status' => 'assigned']);
            }

            app(AuditTrail::class)->record([
                'module' => 'equipment',
                'action' => 'assignment_activated',
                'entity_type' => 'equipment_assignment',
                'entity_id' => $assignment->id,
                'project_id' => $project->id,
                'description' => "Equipment assignment {$assignment->assignment_no} activated",
                'title' => 'Equipment assignment activated',
                'body' => "{$assignment->assignment_no}",
                'new' => ['status' => 'active'],
            ]);

            return $assignment->fresh()->load('equipment');
        });
    }

    public function completeAssignment(Project $project, EquipmentAssignment $assignment): EquipmentAssignment
    {
        $this->assertProject($project, $assignment);

        if ($assignment->status !== 'active') {
            throw ValidationException::withMessages([
                'status' => ['Only active assignments can be completed.'],
            ]);
        }

        return DB::transaction(function () use ($project, $assignment) {
            $assignment->update([
                'status' => 'completed',
                'end_date' => $assignment->end_date ?? now()->toDateString(),
            ]);

            $equipment = $assignment->equipment()->first();
            if ($equipment) {
                $hasOtherActive = EquipmentAssignment::query()
                    ->where('equipment_id', $equipment->id)
                    ->where('id', '!=', $assignment->id)
                    ->where('status', 'active')
                    ->exists();

                if (! $hasOtherActive) {
                    $equipment->update(['status' => 'available']);
                }
            }

            return $assignment->fresh()->load('equipment');
        });
    }

    public function logUsage(Project $project, array $data, ?int $userId = null): EquipmentUsageLog
    {
        $equipment = Equipment::query()->findOrFail($data['equipment_id']);

        if (! empty($data['equipment_assignment_id'])) {
            $assignment = EquipmentAssignment::query()
                ->where('project_id', $project->id)
                ->findOrFail($data['equipment_assignment_id']);

            if ((int) $assignment->equipment_id !== (int) $equipment->id) {
                throw ValidationException::withMessages([
                    'equipment_assignment_id' => ['Assignment does not belong to the specified equipment.'],
                ]);
            }
        }

        $data['project_id'] = $project->id;
        $data['recorded_by'] = $userId;

        return EquipmentUsageLog::query()->create($data);
    }

    private function assertProject(Project $project, EquipmentAssignment $assignment): void
    {
        if ((int) $assignment->project_id !== (int) $project->id) {
            abort(404);
        }
    }
}
