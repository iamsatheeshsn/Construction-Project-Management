<?php

namespace App\Modules\Inventory\Controllers;

use App\Modules\Inventory\Models\InventoryItem;
use App\Modules\Inventory\Requests\StoreInventoryItemRequest;
use App\Modules\Inventory\Requests\UpdateInventoryItemRequest;
use App\Modules\Inventory\Resources\InventoryItemResource;
use App\Modules\Inventory\Services\InventoryCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InventoryItemController
{
    public function __construct(private InventoryCatalogService $catalog) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = InventoryItem::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', $term)->orWhere('sku', 'like', $term);
                });
            })
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return InventoryItemResource::collection($items);
    }

    public function store(StoreInventoryItemRequest $request): JsonResponse
    {
        $item = $this->catalog->createItem($request->validated());

        return (new InventoryItemResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateInventoryItemRequest $request, int $item): InventoryItemResource
    {
        $model = InventoryItem::query()->findOrFail($item);
        $updated = $this->catalog->updateItem($model, $request->validated());

        return new InventoryItemResource($updated);
    }
}
