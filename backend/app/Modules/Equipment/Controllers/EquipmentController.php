<?php

namespace App\Modules\Equipment\Controllers;

use App\Modules\Equipment\Models\Equipment;
use App\Modules\Equipment\Requests\StoreEquipmentRequest;
use App\Modules\Equipment\Requests\UpdateEquipmentRequest;
use App\Modules\Equipment\Resources\EquipmentResource;
use App\Modules\Equipment\Services\EquipmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EquipmentController
{
    public function __construct(private EquipmentService $equipment) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = Equipment::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', $term)->orWhere('code', 'like', $term);
                });
            })
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->orderBy('name')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return EquipmentResource::collection($items);
    }

    public function store(StoreEquipmentRequest $request): JsonResponse
    {
        $item = $this->equipment->createEquipment($request->validated());

        return (new EquipmentResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $equipment): EquipmentResource
    {
        return new EquipmentResource(Equipment::query()->findOrFail($equipment));
    }

    public function update(UpdateEquipmentRequest $request, int $equipment): EquipmentResource
    {
        $model = Equipment::query()->findOrFail($equipment);
        $updated = $this->equipment->updateEquipment($model, $request->validated());

        return new EquipmentResource($updated);
    }
}
