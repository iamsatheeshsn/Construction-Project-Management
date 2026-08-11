<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\InventoryItem;
use App\Modules\Inventory\Models\Warehouse;
use Illuminate\Database\Eloquent\Collection;

class InventoryCatalogService
{
    public function listItems(array $filters = []): Collection
    {
        return InventoryItem::query()
            ->when(! empty($filters['search']), function ($q) use ($filters) {
                $term = '%'.$filters['search'].'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', $term)
                        ->orWhere('sku', 'like', $term);
                });
            })
            ->when(isset($filters['is_active']), fn ($q) => $q->where('is_active', (bool) $filters['is_active']))
            ->orderBy('name')
            ->get();
    }

    public function createItem(array $data): InventoryItem
    {
        $data['unit'] = $data['unit'] ?? 'nos';
        $data['default_rate'] = $data['default_rate'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        return InventoryItem::query()->create($data);
    }

    public function updateItem(InventoryItem $item, array $data): InventoryItem
    {
        $item->update($data);

        return $item->fresh();
    }

    public function listWarehouses(?int $projectId = null): Collection
    {
        return Warehouse::query()
            ->when($projectId !== null, function ($q) use ($projectId) {
                $q->where(function ($inner) use ($projectId) {
                    $inner->where('project_id', $projectId)
                        ->orWhereNull('project_id');
                });
            })
            ->orderBy('name')
            ->get();
    }

    public function createWarehouse(array $data): Warehouse
    {
        $data['status'] = $data['status'] ?? 'active';
        $data['is_default'] = $data['is_default'] ?? false;

        return Warehouse::query()->create($data);
    }
}
