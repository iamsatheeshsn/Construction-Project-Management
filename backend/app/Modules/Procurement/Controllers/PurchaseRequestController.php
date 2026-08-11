<?php

namespace App\Modules\Procurement\Controllers;

use App\Modules\Procurement\Models\PurchaseRequest;
use App\Modules\Procurement\Requests\CreatePoFromPrRequest;
use App\Modules\Procurement\Requests\StorePurchaseRequestItemRequest;
use App\Modules\Procurement\Requests\StorePurchaseRequestRequest;
use App\Modules\Procurement\Requests\UpdatePurchaseRequestRequest;
use App\Modules\Procurement\Resources\PurchaseOrderResource;
use App\Modules\Procurement\Resources\PurchaseRequestItemResource;
use App\Modules\Procurement\Resources\PurchaseRequestResource;
use App\Modules\Procurement\Services\ProcurementService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PurchaseRequestController
{
    public function __construct(private ProcurementService $procurement) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $requests = PurchaseRequest::query()
            ->where('project_id', $project->id)
            ->withCount('items')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return PurchaseRequestResource::collection($requests);
    }

    public function store(StorePurchaseRequestRequest $request, Project $project): JsonResponse
    {
        $pr = $this->procurement->createPurchaseRequest($project, $request->validated(), $request->user()?->id);

        return (new PurchaseRequestResource($pr))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $purchaseRequest): PurchaseRequestResource
    {
        $model = PurchaseRequest::query()
            ->where('project_id', $project->id)
            ->with('items')
            ->withCount('items')
            ->findOrFail($purchaseRequest);

        return new PurchaseRequestResource($model);
    }

    public function update(UpdatePurchaseRequestRequest $request, Project $project, int $purchaseRequest): PurchaseRequestResource
    {
        $model = PurchaseRequest::query()->where('project_id', $project->id)->findOrFail($purchaseRequest);
        $updated = $this->procurement->updatePurchaseRequest($project, $model, $request->validated());

        return new PurchaseRequestResource($updated->loadCount('items'));
    }

    public function destroy(Project $project, int $purchaseRequest): JsonResponse
    {
        $model = PurchaseRequest::query()->where('project_id', $project->id)->findOrFail($purchaseRequest);

        if ($model->status !== 'draft') {
            return response()->json(['message' => 'Only draft purchase requests can be deleted.'], 422);
        }

        $model->delete();

        return response()->json(['message' => 'Purchase request deleted.']);
    }

    public function storeItem(StorePurchaseRequestItemRequest $request, Project $project, int $purchaseRequest): JsonResponse
    {
        $model = PurchaseRequest::query()->where('project_id', $project->id)->findOrFail($purchaseRequest);
        $item = $this->procurement->addPurchaseRequestItem($project, $model, $request->validated());

        return (new PurchaseRequestItemResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function submit(Project $project, int $purchaseRequest): PurchaseRequestResource
    {
        $model = PurchaseRequest::query()->where('project_id', $project->id)->findOrFail($purchaseRequest);
        $submitted = $this->procurement->submitPurchaseRequest($project, $model);

        return new PurchaseRequestResource($submitted->loadCount('items'));
    }

    public function approve(Request $request, Project $project, int $purchaseRequest): PurchaseRequestResource
    {
        $model = PurchaseRequest::query()->where('project_id', $project->id)->findOrFail($purchaseRequest);
        $approved = $this->procurement->approvePurchaseRequest($project, $model, (int) $request->user()->id);

        return new PurchaseRequestResource($approved->loadCount('items'));
    }

    public function createPo(CreatePoFromPrRequest $request, Project $project, int $purchaseRequest): JsonResponse
    {
        $model = PurchaseRequest::query()->where('project_id', $project->id)->findOrFail($purchaseRequest);
        $po = $this->procurement->createPoFromPr($project, $model, $request->validated(), $request->user()?->id);

        return (new PurchaseOrderResource($po))
            ->response()
            ->setStatusCode(201);
    }
}
