<?php

namespace App\Modules\Inventory\Controllers;

use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\Warehouse;
use App\Modules\Inventory\Requests\StoreWarehouseRequest;
use App\Modules\Inventory\Resources\StockBalanceResource;
use App\Modules\Inventory\Resources\WarehouseResource;
use App\Modules\Inventory\Services\InventoryCatalogService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WarehouseController
{
    public function __construct(private InventoryCatalogService $catalog) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $warehouses = Warehouse::query()
            ->when($request->filled('project_id'), fn ($q) => $q->where(function ($inner) use ($request) {
                $projectId = (int) $request->integer('project_id');
                $inner->where('project_id', $projectId)->orWhereNull('project_id');
            }))
            ->orderBy('name')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return WarehouseResource::collection($warehouses);
    }

    public function store(StoreWarehouseRequest $request): JsonResponse
    {
        $warehouse = $this->catalog->createWarehouse($request->validated());

        return (new WarehouseResource($warehouse))
            ->response()
            ->setStatusCode(201);
    }

    public function projectStock(Request $request, Project $project): AnonymousResourceCollection
    {
        $warehouseIds = Warehouse::query()
            ->where(function ($q) use ($project) {
                $q->where('project_id', $project->id)->orWhereNull('project_id');
            })
            ->pluck('id');

        $balances = StockBalance::query()
            ->whereIn('warehouse_id', $warehouseIds)
            ->where(function ($q) use ($project) {
                $q->where('project_id', $project->id)->orWhereNull('project_id');
            })
            ->when($request->filled('warehouse_id'), fn ($q) => $q->where('warehouse_id', $request->integer('warehouse_id')))
            ->with(['warehouse:id,code,name', 'inventoryItem:id,sku,name,unit'])
            ->orderBy('warehouse_id')
            ->paginate(min((int) $request->integer('per_page', 10), 200));

        return StockBalanceResource::collection($balances);
    }
}
