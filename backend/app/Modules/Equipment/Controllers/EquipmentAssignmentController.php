<?php

namespace App\Modules\Equipment\Controllers;

use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Models\EquipmentAssignment;
use App\Modules\Equipment\Models\EquipmentUsageLog;
use App\Modules\Equipment\Requests\StoreEquipmentAssignmentRequest;
use App\Modules\Equipment\Requests\StoreEquipmentUsageLogRequest;
use App\Modules\Equipment\Requests\UpdateEquipmentAssignmentRequest;
use App\Modules\Equipment\Resources\EquipmentAssignmentResource;
use App\Modules\Equipment\Resources\EquipmentUsageLogResource;
use App\Modules\Equipment\Services\EquipmentService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EquipmentAssignmentController
{
    public function __construct(private EquipmentService $equipment) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $assignments = EquipmentAssignment::query()
            ->where('project_id', $project->id)
            ->with('equipment')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return EquipmentAssignmentResource::collection($assignments);
    }

    public function store(StoreEquipmentAssignmentRequest $request, Project $project): JsonResponse
    {
        $equipmentModel = Equipment::query()->findOrFail($request->integer('equipment_id'));
        $assignment = $this->equipment->assignToProject($project, $equipmentModel, $request->validated(), $request->user()?->id);

        return (new EquipmentAssignmentResource($assignment->load('equipment')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $equipmentAssignment): EquipmentAssignmentResource
    {
        $model = EquipmentAssignment::query()
            ->where('project_id', $project->id)
            ->with('equipment')
            ->findOrFail($equipmentAssignment);

        return new EquipmentAssignmentResource($model);
    }

    public function update(UpdateEquipmentAssignmentRequest $request, Project $project, int $equipmentAssignment): EquipmentAssignmentResource
    {
        $model = EquipmentAssignment::query()->where('project_id', $project->id)->findOrFail($equipmentAssignment);
        $updated = $this->equipment->updateAssignment($project, $model, $request->validated());

        return new EquipmentAssignmentResource($updated->load('equipment'));
    }

    public function destroy(Project $project, int $equipmentAssignment): JsonResponse
    {
        $model = EquipmentAssignment::query()->where('project_id', $project->id)->findOrFail($equipmentAssignment);

        if ($model->status !== 'planned') {
            return response()->json(['message' => 'Only planned assignments can be deleted.'], 422);
        }

        $model->delete();

        return response()->json(['message' => 'Equipment assignment deleted.']);
    }

    public function activate(Project $project, int $equipmentAssignment): EquipmentAssignmentResource
    {
        $model = EquipmentAssignment::query()->where('project_id', $project->id)->findOrFail($equipmentAssignment);
        $activated = $this->equipment->activateAssignment($project, $model);

        return new EquipmentAssignmentResource($activated);
    }

    public function complete(Project $project, int $equipmentAssignment): EquipmentAssignmentResource
    {
        $model = EquipmentAssignment::query()->where('project_id', $project->id)->findOrFail($equipmentAssignment);
        $completed = $this->equipment->completeAssignment($project, $model);

        return new EquipmentAssignmentResource($completed);
    }

    public function indexUsage(Request $request, Project $project): AnonymousResourceCollection
    {
        $logs = EquipmentUsageLog::query()
            ->where('project_id', $project->id)
            ->with('equipment')
            ->when($request->filled('equipment_id'), fn ($q) => $q->where('equipment_id', $request->integer('equipment_id')))
            ->orderByDesc('usage_date')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return EquipmentUsageLogResource::collection($logs);
    }

    public function storeUsage(StoreEquipmentUsageLogRequest $request, Project $project): JsonResponse
    {
        $log = $this->equipment->logUsage($project, $request->validated(), $request->user()?->id);

        return (new EquipmentUsageLogResource($log->load('equipment')))
            ->response()
            ->setStatusCode(201);
    }
}
