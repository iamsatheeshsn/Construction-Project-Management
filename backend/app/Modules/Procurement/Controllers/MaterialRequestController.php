<?php

namespace App\Modules\Procurement\Controllers;

use App\Modules\Procurement\Models\MaterialRequest;
use App\Modules\Procurement\Requests\ConvertMrToPrRequest;
use App\Modules\Procurement\Requests\StoreMaterialRequestItemRequest;
use App\Modules\Procurement\Requests\StoreMaterialRequestRequest;
use App\Modules\Procurement\Requests\UpdateMaterialRequestRequest;
use App\Modules\Procurement\Resources\MaterialRequestItemResource;
use App\Modules\Procurement\Resources\MaterialRequestResource;
use App\Modules\Procurement\Resources\PurchaseRequestResource;
use App\Modules\Procurement\Services\ProcurementService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MaterialRequestController
{
    public function __construct(private ProcurementService $procurement) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $requests = MaterialRequest::query()
            ->where('project_id', $project->id)
            ->withCount('items')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return MaterialRequestResource::collection($requests);
    }

    public function store(StoreMaterialRequestRequest $request, Project $project): JsonResponse
    {
        $mr = $this->procurement->createMaterialRequest($project, $request->validated(), $request->user()?->id);

        return (new MaterialRequestResource($mr))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $materialRequest): MaterialRequestResource
    {
        $model = MaterialRequest::query()
            ->where('project_id', $project->id)
            ->with('items')
            ->withCount('items')
            ->findOrFail($materialRequest);

        return new MaterialRequestResource($model);
    }

    public function update(UpdateMaterialRequestRequest $request, Project $project, int $materialRequest): MaterialRequestResource
    {
        $model = MaterialRequest::query()->where('project_id', $project->id)->findOrFail($materialRequest);
        $updated = $this->procurement->updateMaterialRequest($project, $model, $request->validated());

        return new MaterialRequestResource($updated->loadCount('items'));
    }

    public function destroy(Project $project, int $materialRequest): JsonResponse
    {
        $model = MaterialRequest::query()->where('project_id', $project->id)->findOrFail($materialRequest);

        if ($model->status !== 'draft') {
            return response()->json(['message' => 'Only draft material requests can be deleted.'], 422);
        }

        $model->delete();

        return response()->json(['message' => 'Material request deleted.']);
    }

    public function storeItem(StoreMaterialRequestItemRequest $request, Project $project, int $materialRequest): JsonResponse
    {
        $model = MaterialRequest::query()->where('project_id', $project->id)->findOrFail($materialRequest);
        $item = $this->procurement->addMaterialRequestItem($project, $model, $request->validated());

        return (new MaterialRequestItemResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function submit(Project $project, int $materialRequest): MaterialRequestResource
    {
        $model = MaterialRequest::query()->where('project_id', $project->id)->findOrFail($materialRequest);
        $submitted = $this->procurement->submitMaterialRequest($project, $model);

        return new MaterialRequestResource($submitted->loadCount('items'));
    }

    public function approve(Request $request, Project $project, int $materialRequest): MaterialRequestResource
    {
        $model = MaterialRequest::query()->where('project_id', $project->id)->findOrFail($materialRequest);
        $approved = $this->procurement->approveMaterialRequest($project, $model, (int) $request->user()->id);

        return new MaterialRequestResource($approved->loadCount('items'));
    }

    public function convertToPr(ConvertMrToPrRequest $request, Project $project, int $materialRequest): JsonResponse
    {
        $model = MaterialRequest::query()->where('project_id', $project->id)->findOrFail($materialRequest);
        $pr = $this->procurement->convertMrToPr($project, $model, $request->validated(), $request->user()?->id);

        return (new PurchaseRequestResource($pr))
            ->response()
            ->setStatusCode(201);
    }
}
