<?php

namespace App\Modules\Inventory\Controllers;

use App\Modules\Inventory\Models\MaterialIssue;
use App\Modules\Inventory\Requests\StoreMaterialIssueItemRequest;
use App\Modules\Inventory\Requests\StoreMaterialIssueRequest;
use App\Modules\Inventory\Requests\UpdateMaterialIssueRequest;
use App\Modules\Inventory\Resources\MaterialIssueItemResource;
use App\Modules\Inventory\Resources\MaterialIssueResource;
use App\Modules\Inventory\Services\MaterialIssueService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MaterialIssueController
{
    public function __construct(private MaterialIssueService $issues) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $issues = MaterialIssue::query()
            ->where('project_id', $project->id)
            ->withCount('items')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return MaterialIssueResource::collection($issues);
    }

    public function store(StoreMaterialIssueRequest $request, Project $project): JsonResponse
    {
        $issue = $this->issues->create($project, $request->validated(), $request->user()?->id);

        return (new MaterialIssueResource($issue))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $materialIssue): MaterialIssueResource
    {
        $model = MaterialIssue::query()
            ->where('project_id', $project->id)
            ->with(['items.inventoryItem:id,sku,name,unit', 'warehouse:id,code,name'])
            ->withCount('items')
            ->findOrFail($materialIssue);

        return new MaterialIssueResource($model);
    }

    public function update(UpdateMaterialIssueRequest $request, Project $project, int $materialIssue): MaterialIssueResource
    {
        $model = MaterialIssue::query()->where('project_id', $project->id)->findOrFail($materialIssue);
        $updated = $this->issues->update($project, $model, $request->validated());

        return new MaterialIssueResource($updated->loadCount('items'));
    }

    public function destroy(Project $project, int $materialIssue): JsonResponse
    {
        $model = MaterialIssue::query()->where('project_id', $project->id)->findOrFail($materialIssue);

        if ($model->status !== 'draft') {
            return response()->json(['message' => 'Only draft material issues can be deleted.'], 422);
        }

        $model->delete();

        return response()->json(['message' => 'Material issue deleted.']);
    }

    public function storeItem(StoreMaterialIssueItemRequest $request, Project $project, int $materialIssue): JsonResponse
    {
        $model = MaterialIssue::query()->where('project_id', $project->id)->findOrFail($materialIssue);
        $item = $this->issues->addItem($project, $model, $request->validated());

        return (new MaterialIssueItemResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function post(Request $request, Project $project, int $materialIssue): MaterialIssueResource
    {
        $model = MaterialIssue::query()->where('project_id', $project->id)->findOrFail($materialIssue);
        $posted = $this->issues->post($project, $model, $request->user()?->id);

        return new MaterialIssueResource($posted->loadCount('items'));
    }
}
