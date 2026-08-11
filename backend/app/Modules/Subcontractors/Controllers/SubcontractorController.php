<?php

namespace App\Modules\Subcontractors\Controllers;

use App\Modules\Subcontractors\Models\Subcontractor;
use App\Modules\Subcontractors\Requests\StoreSubcontractorRequest;
use App\Modules\Subcontractors\Requests\UpdateSubcontractorRequest;
use App\Modules\Subcontractors\Resources\SubcontractorResource;
use App\Modules\Subcontractors\Services\SubcontractorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SubcontractorController
{
    public function __construct(private SubcontractorService $subcontractors) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = Subcontractor::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', $term)->orWhere('code', 'like', $term);
                });
            })
            ->when($request->filled('trade'), fn ($q) => $q->where('trade', $request->string('trade')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderBy('name')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return SubcontractorResource::collection($items);
    }

    public function store(StoreSubcontractorRequest $request): JsonResponse
    {
        $item = $this->subcontractors->createSubcontractor($request->validated());

        return (new SubcontractorResource($item))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $subcontractor): SubcontractorResource
    {
        return new SubcontractorResource(Subcontractor::query()->findOrFail($subcontractor));
    }

    public function update(UpdateSubcontractorRequest $request, int $subcontractor): SubcontractorResource
    {
        $model = Subcontractor::query()->findOrFail($subcontractor);
        $updated = $this->subcontractors->updateSubcontractor($model, $request->validated());

        return new SubcontractorResource($updated);
    }
}
