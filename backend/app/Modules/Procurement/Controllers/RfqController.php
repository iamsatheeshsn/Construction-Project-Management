<?php

namespace App\Modules\Procurement\Controllers;

use App\Modules\Procurement\Models\PurchaseRequest;
use App\Modules\Procurement\Models\Rfq;
use App\Modules\Procurement\Requests\AwardRfqRequest;
use App\Modules\Procurement\Requests\CreateRfqFromPrRequest;
use App\Modules\Procurement\Requests\InviteRfqSuppliersRequest;
use App\Modules\Procurement\Resources\PurchaseOrderResource;
use App\Modules\Procurement\Resources\RfqResource;
use App\Modules\Procurement\Resources\SupplierQuotationResource;
use App\Modules\Procurement\Services\RfqService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RfqController
{
    public function __construct(private RfqService $rfq) {}

    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $rfqs = Rfq::query()
            ->where('project_id', $project->id)
            ->withCount(['items', 'suppliers', 'quotations'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return RfqResource::collection($rfqs);
    }

    public function store(CreateRfqFromPrRequest $request, Project $project): JsonResponse
    {
        $pr = PurchaseRequest::query()
            ->where('project_id', $project->id)
            ->findOrFail($request->integer('purchase_request_id'));

        $rfq = $this->rfq->createRfqFromPr($project, $pr, $request->validated(), $request->user()?->id);

        return (new RfqResource($rfq->loadCount(['items', 'suppliers', 'quotations'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, int $rfq): RfqResource
    {
        $model = Rfq::query()
            ->where('project_id', $project->id)
            ->with(['items', 'suppliers.supplier', 'awardedQuotation'])
            ->withCount(['items', 'suppliers', 'quotations'])
            ->findOrFail($rfq);

        return new RfqResource($model);
    }

    public function invite(InviteRfqSuppliersRequest $request, Project $project, int $rfq): RfqResource
    {
        $model = Rfq::query()->where('project_id', $project->id)->findOrFail($rfq);
        $updated = $this->rfq->inviteSuppliers($project, $model, $request->input('supplier_ids'));

        return new RfqResource($updated->loadCount(['items', 'suppliers', 'quotations']));
    }

    public function send(Project $project, int $rfq): RfqResource
    {
        $model = Rfq::query()->where('project_id', $project->id)->findOrFail($rfq);
        $sent = $this->rfq->sendRfq($project, $model);

        return new RfqResource($sent->loadCount(['items', 'suppliers', 'quotations']));
    }

    public function award(AwardRfqRequest $request, Project $project, int $rfq): JsonResponse
    {
        $model = Rfq::query()->where('project_id', $project->id)->findOrFail($rfq);
        $result = $this->rfq->awardQuotation($project, $model, $request->integer('quotation_id'), $request->validated(), $request->user()?->id);

        return response()->json([
            'rfq' => new RfqResource($result['rfq']),
            'quotation' => new SupplierQuotationResource($result['quotation']),
            'purchase_order' => $result['purchase_order'] ? new PurchaseOrderResource($result['purchase_order']) : null,
        ]);
    }

    public function quotations(Project $project, int $rfq): AnonymousResourceCollection
    {
        $model = Rfq::query()->where('project_id', $project->id)->findOrFail($rfq);
        $quotes = $this->rfq->compareQuotations($project, $model);

        return SupplierQuotationResource::collection($quotes);
    }
}
