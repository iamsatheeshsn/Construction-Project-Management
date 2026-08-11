<?php

namespace App\Modules\Procurement\Controllers;

use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Requests\StorePurchaseOrderItemRequest;
use App\Modules\Procurement\Requests\StorePurchaseOrderRequest;
use App\Modules\Procurement\Requests\UpdatePurchaseOrderRequest;
use App\Modules\Procurement\Resources\PurchaseOrderItemResource;
use App\Modules\Procurement\Resources\PurchaseOrderResource;
use App\Modules\Procurement\Services\ProcurementService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PurchaseOrderController
{
    public function __construct(private ProcurementService $procurement) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $orders = PurchaseOrder::query()
            ->where('project_id', $project->id)
            ->withCount('items')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return PurchaseOrderResource::collection($orders);
    }

    public function store(StorePurchaseOrderRequest $request, Project $project): JsonResponse
    {
        $po = $this->procurement->createPurchaseOrder($project, $request->validated(), $request->user()?->id);

        return (new PurchaseOrderResource($po))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $purchaseOrder): PurchaseOrderResource
    {
        $model = PurchaseOrder::query()
            ->where('project_id', $project->id)
            ->with(['items', 'supplier:id,code,name'])
            ->withCount('items')
            ->findOrFail($purchaseOrder);

        return new PurchaseOrderResource($model);
    }

    public function update(UpdatePurchaseOrderRequest $request, Project $project, int $purchaseOrder): PurchaseOrderResource
    {
        $model = PurchaseOrder::query()->where('project_id', $project->id)->findOrFail($purchaseOrder);
        $updated = $this->procurement->updatePurchaseOrder($project, $model, $request->validated());

        return new PurchaseOrderResource($updated->loadCount('items'));
    }

    public function destroy(Project $project, int $purchaseOrder): JsonResponse
    {
        $model = PurchaseOrder::query()->where('project_id', $project->id)->findOrFail($purchaseOrder);

        if ($model->status !== 'draft') {
            return response()->json(['message' => 'Only draft purchase orders can be deleted.'], 422);
        }

        $model->delete();

        return response()->json(['message' => 'Purchase order deleted.']);
    }

    public function storeItem(StorePurchaseOrderItemRequest $request, Project $project, int $purchaseOrder): JsonResponse
    {
        $model = PurchaseOrder::query()->where('project_id', $project->id)->findOrFail($purchaseOrder);
        $item = $this->procurement->addPurchaseOrderItem($project, $model, $request->validated());

        return (new PurchaseOrderItemResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function issue(Project $project, int $purchaseOrder): PurchaseOrderResource
    {
        $model = PurchaseOrder::query()->where('project_id', $project->id)->findOrFail($purchaseOrder);
        $issued = $this->procurement->issuePurchaseOrder($project, $model);

        return new PurchaseOrderResource($issued->loadCount('items'));
    }
}
