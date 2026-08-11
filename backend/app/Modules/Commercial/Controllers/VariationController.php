<?php

namespace App\Modules\Commercial\Controllers;

use App\Modules\Commercial\Models\Variation;
use App\Modules\Commercial\Models\VariationItem;
use App\Modules\Commercial\Requests\DecideVariationRequest;
use App\Modules\Commercial\Requests\StoreVariationItemRequest;
use App\Modules\Commercial\Requests\StoreVariationRequest;
use App\Modules\Commercial\Resources\VariationItemResource;
use App\Modules\Commercial\Resources\VariationResource;
use App\Modules\Commercial\Services\VariationService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class VariationController
{
    public function __construct(private VariationService $variations) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $rows = Variation::query()
            ->where('project_id', $project->id)
            ->with(['contract:id,contract_no,title'])
            ->withCount('items')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return VariationResource::collection($rows);
    }

    public function store(StoreVariationRequest $request, Project $project): JsonResponse
    {
        $row = $this->variations->create($project, $request->validated(), $request->user()?->id);

        return (new VariationResource($row->loadCount('items')))->response()->setStatusCode(201);
    }

    public function show(Project $project, int $variation): VariationResource
    {
        $model = Variation::query()
            ->where('project_id', $project->id)
            ->with(['contract:id,contract_no,title', 'items'])
            ->withCount('items')
            ->findOrFail($variation);

        return new VariationResource($model);
    }

    public function destroy(Project $project, int $variation): JsonResponse
    {
        Variation::query()->where('project_id', $project->id)->findOrFail($variation)->delete();

        return response()->json(['message' => 'Variation deleted.']);
    }

    public function storeItem(StoreVariationItemRequest $request, Project $project, int $variation): JsonResponse
    {
        $model = Variation::query()->where('project_id', $project->id)->findOrFail($variation);
        $item = $this->variations->addItem($project, $model, $request->validated());

        return (new VariationItemResource($item))->response()->setStatusCode(201);
    }

    public function destroyItem(Project $project, int $variation, int $item): JsonResponse
    {
        $model = Variation::query()->where('project_id', $project->id)->findOrFail($variation);
        $itemModel = VariationItem::query()->where('variation_id', $model->id)->findOrFail($item);
        $this->variations->deleteItem($project, $model, $itemModel);

        return response()->json(['message' => 'Variation item deleted.']);
    }

    public function submit(Project $project, int $variation): VariationResource
    {
        $model = Variation::query()->where('project_id', $project->id)->findOrFail($variation);

        return new VariationResource($this->variations->submit($project, $model)->loadCount('items'));
    }

    public function decide(DecideVariationRequest $request, Project $project, int $variation): VariationResource
    {
        $model = Variation::query()->where('project_id', $project->id)->findOrFail($variation);

        return new VariationResource(
            $this->variations->decide($project, $model, $request->validated('status'), (int) $request->user()->id)->loadCount('items')
        );
    }
}
