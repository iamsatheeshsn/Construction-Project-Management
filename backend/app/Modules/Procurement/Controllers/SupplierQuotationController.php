<?php

namespace App\Modules\Procurement\Controllers;

use App\Modules\Procurement\Models\Rfq;
use App\Modules\Procurement\Models\SupplierQuotation;
use App\Modules\Procurement\Requests\StoreSupplierQuotationRequest;
use App\Modules\Procurement\Resources\SupplierQuotationResource;
use App\Modules\Procurement\Services\RfqService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;

class SupplierQuotationController
{
    public function __construct(private RfqService $rfq) {}

    public function store(StoreSupplierQuotationRequest $request, Project $project, int $rfq): JsonResponse
    {
        $model = Rfq::query()->where('project_id', $project->id)->findOrFail($rfq);
        $quotation = $this->rfq->createQuotation($project, $model, $request->integer('supplier_id'), $request->validated());

        return (new SupplierQuotationResource($quotation->load('supplier')))
            ->response()
            ->setStatusCode(201);
    }

    public function submit(Project $project, int $quotation): SupplierQuotationResource
    {
        $model = SupplierQuotation::query()
            ->where('project_id', $project->id)
            ->findOrFail($quotation);

        $submitted = $this->rfq->submitQuotation($project, $model);

        return new SupplierQuotationResource($submitted->load(['supplier', 'items']));
    }
}
