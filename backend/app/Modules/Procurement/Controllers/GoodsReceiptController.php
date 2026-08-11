<?php

namespace App\Modules\Procurement\Controllers;

use App\Modules\Procurement\Models\GoodsReceipt;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Requests\StoreGoodsReceiptItemRequest;
use App\Modules\Procurement\Requests\StoreGoodsReceiptRequest;
use App\Modules\Procurement\Resources\GoodsReceiptItemResource;
use App\Modules\Procurement\Resources\GoodsReceiptResource;
use App\Modules\Procurement\Services\ProcurementService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GoodsReceiptController
{
    public function __construct(private ProcurementService $procurement) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $receipts = GoodsReceipt::query()
            ->where('project_id', $project->id)
            ->withCount('items')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return GoodsReceiptResource::collection($receipts);
    }

    public function store(StoreGoodsReceiptRequest $request, Project $project): JsonResponse
    {
        $po = PurchaseOrder::query()
            ->where('project_id', $project->id)
            ->findOrFail($request->integer('purchase_order_id'));

        $grn = $this->procurement->createGoodsReceiptFromPo($project, $po, $request->validated(), $request->user()?->id);

        return (new GoodsReceiptResource($grn))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $goodsReceipt): GoodsReceiptResource
    {
        $model = GoodsReceipt::query()
            ->where('project_id', $project->id)
            ->with(['items', 'warehouse:id,code,name', 'purchaseOrder:id,po_no,title'])
            ->withCount('items')
            ->findOrFail($goodsReceipt);

        return new GoodsReceiptResource($model);
    }

    public function storeItem(StoreGoodsReceiptItemRequest $request, Project $project, int $goodsReceipt): JsonResponse
    {
        $model = GoodsReceipt::query()->where('project_id', $project->id)->findOrFail($goodsReceipt);
        $item = $this->procurement->addGoodsReceiptItem($project, $model, $request->validated());

        return (new GoodsReceiptItemResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function post(Request $request, Project $project, int $goodsReceipt): GoodsReceiptResource
    {
        $model = GoodsReceipt::query()->where('project_id', $project->id)->findOrFail($goodsReceipt);
        $posted = $this->procurement->postGoodsReceipt($project, $model, $request->user()?->id);

        return new GoodsReceiptResource($posted->loadCount('items'));
    }
}
