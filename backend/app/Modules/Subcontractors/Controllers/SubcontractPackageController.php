<?php

namespace App\Modules\Subcontractors\Controllers;

use App\Modules\Projects\Models\Project;
use App\Modules\Subcontractors\Models\SubcontractPackage;
use App\Modules\Subcontractors\Models\SubcontractPackageItem;
use App\Modules\Subcontractors\Requests\StoreSubcontractPackageItemRequest;
use App\Modules\Subcontractors\Requests\StoreSubcontractPackageRequest;
use App\Modules\Subcontractors\Requests\UpdateSubcontractPackageRequest;
use App\Modules\Subcontractors\Resources\SubcontractPackageItemResource;
use App\Modules\Subcontractors\Resources\SubcontractPackageResource;
use App\Modules\Subcontractors\Services\SubcontractorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SubcontractPackageController
{
    public function __construct(private SubcontractorService $subcontractors) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $packages = SubcontractPackage::query()
            ->where('project_id', $project->id)
            ->with('subcontractor')
            ->withCount('items')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return SubcontractPackageResource::collection($packages);
    }

    public function store(StoreSubcontractPackageRequest $request, Project $project): JsonResponse
    {
        $package = $this->subcontractors->createPackage($project, $request->validated(), $request->user()?->id);

        return (new SubcontractPackageResource($package->load('subcontractor')->loadCount('items')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $subcontractPackage): SubcontractPackageResource
    {
        $model = SubcontractPackage::query()
            ->where('project_id', $project->id)
            ->with(['subcontractor', 'items'])
            ->withCount('items')
            ->findOrFail($subcontractPackage);

        return new SubcontractPackageResource($model);
    }

    public function update(UpdateSubcontractPackageRequest $request, Project $project, int $subcontractPackage): SubcontractPackageResource
    {
        $model = SubcontractPackage::query()->where('project_id', $project->id)->findOrFail($subcontractPackage);
        $updated = $this->subcontractors->updatePackage($project, $model, $request->validated());

        return new SubcontractPackageResource($updated->load('subcontractor')->loadCount('items'));
    }

    public function destroy(Project $project, int $subcontractPackage): JsonResponse
    {
        $model = SubcontractPackage::query()->where('project_id', $project->id)->findOrFail($subcontractPackage);

        if ($model->status !== 'draft') {
            return response()->json(['message' => 'Only draft packages can be deleted.'], 422);
        }

        $model->delete();

        return response()->json(['message' => 'Subcontract package deleted.']);
    }

    public function storeItem(StoreSubcontractPackageItemRequest $request, Project $project, int $subcontractPackage): JsonResponse
    {
        $model = SubcontractPackage::query()->where('project_id', $project->id)->findOrFail($subcontractPackage);
        $item = $this->subcontractors->addPackageItem($project, $model, $request->validated());

        return (new SubcontractPackageItemResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function destroyItem(Project $project, int $subcontractPackage, int $item): JsonResponse
    {
        $model = SubcontractPackage::query()->where('project_id', $project->id)->findOrFail($subcontractPackage);
        $packageItem = SubcontractPackageItem::query()->findOrFail($item);
        $this->subcontractors->deletePackageItem($project, $model, $packageItem);

        return response()->json(['message' => 'Package item deleted.']);
    }

    public function award(Project $project, int $subcontractPackage): SubcontractPackageResource
    {
        $model = SubcontractPackage::query()->where('project_id', $project->id)->findOrFail($subcontractPackage);
        $awarded = $this->subcontractors->awardPackage($project, $model);

        return new SubcontractPackageResource($awarded->loadCount('items'));
    }

    public function activate(Project $project, int $subcontractPackage): SubcontractPackageResource
    {
        $model = SubcontractPackage::query()->where('project_id', $project->id)->findOrFail($subcontractPackage);
        $activated = $this->subcontractors->activatePackage($project, $model);

        return new SubcontractPackageResource($activated->loadCount('items'));
    }

    public function complete(Project $project, int $subcontractPackage): SubcontractPackageResource
    {
        $model = SubcontractPackage::query()->where('project_id', $project->id)->findOrFail($subcontractPackage);
        $completed = $this->subcontractors->completePackage($project, $model);

        return new SubcontractPackageResource($completed->loadCount('items'));
    }
}
