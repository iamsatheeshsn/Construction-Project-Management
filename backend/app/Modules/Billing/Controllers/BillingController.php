<?php

namespace App\Modules\Billing\Controllers;

use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\PaymentApplication;
use App\Modules\Billing\Models\PaymentApplicationItem;
use App\Modules\Billing\Models\PaymentCertificate;
use App\Modules\Billing\Requests\CertifyPaymentApplicationRequest;
use App\Modules\Billing\Requests\StoreInvoiceRequest;
use App\Modules\Billing\Requests\StorePaymentApplicationItemRequest;
use App\Modules\Billing\Requests\StorePaymentApplicationRequest;
use App\Modules\Billing\Requests\StorePaymentRequest;
use App\Modules\Billing\Resources\InvoiceResource;
use App\Modules\Billing\Resources\PaymentApplicationItemResource;
use App\Modules\Billing\Resources\PaymentApplicationResource;
use App\Modules\Billing\Resources\PaymentCertificateResource;
use App\Modules\Billing\Resources\PaymentResource;
use App\Modules\Billing\Services\BillingService;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BillingController
{
    public function __construct(private BillingService $billing) {}

    public function indexApplications(Request $request, Project $project): AnonymousResourceCollection
    {
        $rows = PaymentApplication::query()
            ->where('project_id', $project->id)
            ->with(['contract:id,contract_no,title'])
            ->withCount('items')
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return PaymentApplicationResource::collection($rows);
    }

    public function storeApplication(StorePaymentApplicationRequest $request, Project $project): JsonResponse
    {
        $row = $this->billing->createApplication($project, $request->validated(), $request->user()?->id);

        return (new PaymentApplicationResource($row->loadCount('items')))->response()->setStatusCode(201);
    }

    public function showApplication(Project $project, int $application): PaymentApplicationResource
    {
        $model = PaymentApplication::query()
            ->where('project_id', $project->id)
            ->with(['contract:id,contract_no,title', 'items', 'certificate.invoice'])
            ->withCount('items')
            ->findOrFail($application);

        return new PaymentApplicationResource($model);
    }

    public function destroyApplication(Project $project, int $application): JsonResponse
    {
        PaymentApplication::query()->where('project_id', $project->id)->findOrFail($application)->delete();

        return response()->json(['message' => 'Payment application deleted.']);
    }

    public function storeApplicationItem(StorePaymentApplicationItemRequest $request, Project $project, int $application): JsonResponse
    {
        $model = PaymentApplication::query()->where('project_id', $project->id)->findOrFail($application);
        $item = $this->billing->addApplicationItem($project, $model, $request->validated());

        return (new PaymentApplicationItemResource($item))->response()->setStatusCode(201);
    }

    public function destroyApplicationItem(Project $project, int $application, int $item): JsonResponse
    {
        $model = PaymentApplication::query()->where('project_id', $project->id)->findOrFail($application);
        $itemModel = PaymentApplicationItem::query()->where('payment_application_id', $model->id)->findOrFail($item);
        $this->billing->deleteApplicationItem($project, $model, $itemModel);

        return response()->json(['message' => 'Item deleted.']);
    }

    public function submitApplication(Project $project, int $application): PaymentApplicationResource
    {
        $model = PaymentApplication::query()->where('project_id', $project->id)->findOrFail($application);

        return new PaymentApplicationResource($this->billing->submitApplication($project, $model)->loadCount('items'));
    }

    public function certifyApplication(CertifyPaymentApplicationRequest $request, Project $project, int $application): JsonResponse
    {
        $model = PaymentApplication::query()->where('project_id', $project->id)->findOrFail($application);
        $certificate = $this->billing->certifyApplication($project, $model, $request->validated(), (int) $request->user()->id);

        return (new PaymentCertificateResource($certificate))->response()->setStatusCode(201);
    }

    public function indexInvoices(Request $request, Project $project): AnonymousResourceCollection
    {
        $rows = Invoice::query()
            ->where('project_id', $project->id)
            ->with(['client:id,name'])
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return InvoiceResource::collection($rows);
    }

    public function storeInvoice(StoreInvoiceRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();
        $certificate = PaymentCertificate::query()
            ->where('project_id', $project->id)
            ->findOrFail($data['payment_certificate_id']);
        unset($data['payment_certificate_id']);

        $invoice = $this->billing->createInvoiceFromCertificate($project, $certificate, $data, $request->user()?->id);

        return (new InvoiceResource($invoice->load('client:id,name')))->response()->setStatusCode(201);
    }

    public function showInvoice(Project $project, int $invoice): InvoiceResource
    {
        $model = Invoice::query()
            ->where('project_id', $project->id)
            ->with(['client:id,name', 'payments'])
            ->findOrFail($invoice);

        return new InvoiceResource($model);
    }

    public function storePayment(StorePaymentRequest $request, Project $project, int $invoice): JsonResponse
    {
        $model = Invoice::query()->where('project_id', $project->id)->findOrFail($invoice);
        $payment = $this->billing->recordPayment($project, $model, $request->validated(), $request->user()?->id);

        return (new PaymentResource($payment))->response()->setStatusCode(201);
    }
}
