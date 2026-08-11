<?php

namespace App\Modules\Commercial\Controllers;

use App\Modules\Commercial\Models\Boq;
use App\Modules\Commercial\Models\BoqItem;
use App\Modules\Commercial\Requests\StoreBoqItemRequest;
use App\Modules\Commercial\Requests\StoreBoqRequest;
use App\Modules\Commercial\Requests\UpdateBoqItemRequest;
use App\Modules\Commercial\Requests\UpdateBoqRequest;
use App\Modules\Commercial\Resources\BoqItemResource;
use App\Modules\Commercial\Resources\BoqResource;
use App\Modules\Commercial\Services\BoqService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BoqController
{
    public function __construct(private BoqService $boqs) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $boqs = Boq::query()
            ->where('project_id', $project->id)
            ->withCount('items')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return BoqResource::collection($boqs);
    }

    public function store(StoreBoqRequest $request, Project $project): JsonResponse
    {
        $boq = $this->boqs->create($project, $request->validated(), $request->user()?->id);

        return (new BoqResource($boq->loadCount('items')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $boq): BoqResource
    {
        $model = Boq::query()
            ->where('project_id', $project->id)
            ->with(['items.wbs:id,code,name', 'items.costCode:id,code,name'])
            ->withCount('items')
            ->findOrFail($boq);

        return new BoqResource($model);
    }

    public function update(UpdateBoqRequest $request, Project $project, int $boq): BoqResource
    {
        $model = Boq::query()->where('project_id', $project->id)->findOrFail($boq);
        $updated = $this->boqs->update($project, $model, $request->validated());

        return new BoqResource($updated->loadCount('items'));
    }

    public function destroy(Project $project, int $boq): JsonResponse
    {
        $model = Boq::query()->where('project_id', $project->id)->findOrFail($boq);
        $model->delete();

        return response()->json(['message' => 'BOQ deleted.']);
    }

    public function approve(Request $request, Project $project, int $boq): BoqResource
    {
        $model = Boq::query()->where('project_id', $project->id)->findOrFail($boq);
        $approved = $this->boqs->approve($project, $model, (int) $request->user()->id);

        return new BoqResource($approved->loadCount('items'));
    }

    public function storeItem(StoreBoqItemRequest $request, Project $project, int $boq): JsonResponse
    {
        $model = Boq::query()->where('project_id', $project->id)->findOrFail($boq);
        $item = $this->boqs->addItem($project, $model, $request->validated());

        return (new BoqItemResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function updateItem(UpdateBoqItemRequest $request, Project $project, int $boq, int $item): BoqItemResource
    {
        $boqModel = Boq::query()->where('project_id', $project->id)->findOrFail($boq);
        $itemModel = BoqItem::query()->where('boq_id', $boqModel->id)->findOrFail($item);
        $updated = $this->boqs->updateItem($project, $boqModel, $itemModel, $request->validated());

        return new BoqItemResource($updated);
    }

    public function destroyItem(Project $project, int $boq, int $item): JsonResponse
    {
        $boqModel = Boq::query()->where('project_id', $project->id)->findOrFail($boq);
        $itemModel = BoqItem::query()->where('boq_id', $boqModel->id)->findOrFail($item);
        $this->boqs->deleteItem($project, $boqModel, $itemModel);

        return response()->json(['message' => 'BOQ item deleted.']);
    }
}
