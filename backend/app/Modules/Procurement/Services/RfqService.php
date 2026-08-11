<?php

namespace App\Modules\Procurement\Services;

use App\Core\Audit\Services\AuditTrail;
use App\Modules\Procurement\Models\PurchaseRequest;
use App\Modules\Procurement\Models\Rfq;
use App\Modules\Procurement\Models\RfqItem;
use App\Modules\Procurement\Models\RfqSupplier;
use App\Modules\Procurement\Models\Supplier;
use App\Modules\Procurement\Models\SupplierQuotation;
use App\Modules\Procurement\Models\SupplierQuotationItem;
use App\Modules\Projects\Models\Project;
use App\Shared\Support\DocumentNumber;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RfqService
{
    public function __construct(private ProcurementService $procurement) {}

    public function createRfqFromPr(Project $project, PurchaseRequest $pr, array $data, ?int $userId = null): Rfq
    {
        $this->assertProject($project, $pr);

        if ($pr->status !== 'approved') {
            throw ValidationException::withMessages([
                'purchase_request' => ['Only approved purchase requests can be converted to RFQs.'],
            ]);
        }

        return DB::transaction(function () use ($project, $pr, $data, $userId) {
            $pr->loadMissing('items');

            $rfqNo = $data['rfq_no'] ?? DocumentNumber::forProject('RFQ', 'rfqs', $project->id);

            $rfq = Rfq::query()->create([
                'project_id' => $project->id,
                'purchase_request_id' => $pr->id,
                'rfq_no' => $rfqNo,
                'title' => $data['title'] ?? $pr->title,
                'status' => 'draft',
                'due_date' => $data['due_date'] ?? null,
                'notes' => $data['notes'] ?? $pr->notes,
                'created_by' => $userId,
            ]);

            foreach ($pr->items as $item) {
                RfqItem::query()->create([
                    'rfq_id' => $rfq->id,
                    'inventory_item_id' => $item->inventory_item_id,
                    'description' => $item->description,
                    'unit' => $item->unit,
                    'quantity' => $item->quantity,
                ]);
            }

            return $rfq->load('items');
        });
    }

    public function inviteSuppliers(Project $project, Rfq $rfq, array $supplierIds): Rfq
    {
        $this->assertProject($project, $rfq);

        if ($rfq->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Suppliers can only be invited on draft RFQs.'],
            ]);
        }

        foreach ($supplierIds as $supplierId) {
            Supplier::query()->findOrFail($supplierId);

            RfqSupplier::query()->firstOrCreate(
                ['rfq_id' => $rfq->id, 'supplier_id' => $supplierId],
                ['invited_at' => now()]
            );
        }

        return $rfq->fresh()->load('suppliers.supplier');
    }

    public function sendRfq(Project $project, Rfq $rfq): Rfq
    {
        $this->assertProject($project, $rfq);

        if ($rfq->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft RFQs can be sent.'],
            ]);
        }

        if ($rfq->suppliers()->count() < 1) {
            throw ValidationException::withMessages([
                'suppliers' => ['At least one supplier must be invited before sending the RFQ.'],
            ]);
        }

        $rfq->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'procurement',
            'action' => 'rfq_sent',
            'entity_type' => 'rfq',
            'entity_id' => $rfq->id,
            'project_id' => $project->id,
            'description' => "RFQ {$rfq->rfq_no} sent to suppliers",
            'title' => 'RFQ sent',
            'body' => "{$rfq->rfq_no}: {$rfq->title}",
            'new' => ['status' => 'sent'],
        ]);

        return $rfq->fresh();
    }

    public function createQuotation(Project $project, Rfq $rfq, int $supplierId, array $data): SupplierQuotation
    {
        $this->assertProject($project, $rfq);

        if (! in_array($rfq->status, ['sent', 'quoted'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Quotations can only be created for sent or quoted RFQs.'],
            ]);
        }

        Supplier::query()->findOrFail($supplierId);

        if (! $rfq->suppliers()->where('supplier_id', $supplierId)->exists()) {
            throw ValidationException::withMessages([
                'supplier_id' => ['Supplier has not been invited to this RFQ.'],
            ]);
        }

        return DB::transaction(function () use ($project, $rfq, $supplierId, $data) {
            $rfq->loadMissing('items');
            $rawItems = collect($data['items'] ?? [])->values();
            $itemRates = $rawItems->filter(fn ($row) => ! empty($row['rfq_item_id']))->keyBy('rfq_item_id');

            $quoteNo = $data['quote_no'] ?? DocumentNumber::forProject('Q', 'supplier_quotations', $project->id);

            $quotation = SupplierQuotation::query()->create([
                'project_id' => $project->id,
                'rfq_id' => $rfq->id,
                'supplier_id' => $supplierId,
                'quote_no' => $quoteNo,
                'status' => 'draft',
                'currency' => strtoupper($data['currency'] ?? $project->currency ?? 'AED'),
                'valid_until' => $data['valid_until'] ?? null,
                'tax_amount' => (float) ($data['tax_amount'] ?? 0),
                'lead_time_days' => $data['lead_time_days'] ?? null,
                'notes' => $data['notes'] ?? null,
                'subtotal' => 0,
                'total_amount' => 0,
            ]);

            foreach ($rfq->items->values() as $index => $rfqItem) {
                $payload = $itemRates->get($rfqItem->id) ?? $rawItems->get($index) ?? [];
                $rate = (float) ($payload['rate'] ?? 0);
                $qty = (float) ($payload['quantity'] ?? $rfqItem->quantity);

                SupplierQuotationItem::query()->create([
                    'supplier_quotation_id' => $quotation->id,
                    'rfq_item_id' => $rfqItem->id,
                    'inventory_item_id' => $rfqItem->inventory_item_id,
                    'description' => $rfqItem->description,
                    'unit' => $rfqItem->unit,
                    'quantity' => $qty,
                    'rate' => $rate,
                    'amount' => round($qty * $rate, 2),
                    'lead_time_days' => $payload['lead_time_days'] ?? null,
                ]);
            }

            $this->recalculateQuotationTotals($quotation);

            return $quotation->fresh()->load('items');
        });
    }

    public function submitQuotation(Project $project, SupplierQuotation $quotation): SupplierQuotation
    {
        $this->assertProject($project, $quotation);

        if ($quotation->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft quotations can be submitted.'],
            ]);
        }

        $quotation->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $rfq = $quotation->rfq()->first();
        if ($rfq && $rfq->status === 'sent') {
            $rfq->update(['status' => 'quoted']);
        }

        return $quotation->fresh();
    }

    public function awardQuotation(Project $project, Rfq $rfq, int $quotationId, array $data, ?int $userId = null): array
    {
        $this->assertProject($project, $rfq);

        if (! in_array($rfq->status, ['sent', 'quoted'], true)) {
            throw ValidationException::withMessages([
                'status' => ['RFQ must be sent or quoted before awarding.'],
            ]);
        }

        $quotation = SupplierQuotation::query()
            ->where('rfq_id', $rfq->id)
            ->where('project_id', $project->id)
            ->findOrFail($quotationId);

        if ($quotation->status !== 'submitted') {
            throw ValidationException::withMessages([
                'quotation' => ['Only submitted quotations can be awarded.'],
            ]);
        }

        return DB::transaction(function () use ($project, $rfq, $quotation, $data, $userId) {
            $quotation->update(['status' => 'awarded']);

            SupplierQuotation::query()
                ->where('rfq_id', $rfq->id)
                ->where('id', '!=', $quotation->id)
                ->where('status', 'submitted')
                ->update(['status' => 'rejected']);

            $rfq->update([
                'status' => 'awarded',
                'awarded_quotation_id' => $quotation->id,
                'awarded_at' => now(),
            ]);

            app(AuditTrail::class)->record([
                'module' => 'procurement',
                'action' => 'rfq_awarded',
                'entity_type' => 'rfq',
                'entity_id' => $rfq->id,
                'project_id' => $project->id,
                'description' => "RFQ {$rfq->rfq_no} awarded to quotation {$quotation->quote_no}",
                'title' => 'RFQ awarded',
                'body' => "{$rfq->rfq_no}: {$quotation->quote_no}",
                'new' => ['awarded_quotation_id' => $quotation->id, 'status' => 'awarded'],
            ]);

            $result = ['rfq' => $rfq->fresh()->load('awardedQuotation'), 'quotation' => $quotation->fresh()->load('items'), 'purchase_order' => null];

            if (! empty($data['create_po'])) {
                if (empty($data['warehouse_id'])) {
                    throw ValidationException::withMessages([
                        'warehouse_id' => ['Warehouse is required when creating a purchase order.'],
                    ]);
                }

                $po = $this->procurement->createPoFromQuotation($project, $quotation, $data, $userId);
                $result['purchase_order'] = $po;
            }

            return $result;
        });
    }

    public function compareQuotations(Project $project, Rfq $rfq): Collection
    {
        $this->assertProject($project, $rfq);

        return SupplierQuotation::query()
            ->where('rfq_id', $rfq->id)
            ->with(['supplier', 'items'])
            ->orderBy('total_amount')
            ->get();
    }

    public function recalculateQuotationTotals(SupplierQuotation $quotation): void
    {
        $subtotal = (float) SupplierQuotationItem::query()
            ->where('supplier_quotation_id', $quotation->id)
            ->sum('amount');

        $tax = (float) $quotation->tax_amount;
        $quotation->update([
            'subtotal' => round($subtotal, 2),
            'total_amount' => round($subtotal + $tax, 2),
        ]);
    }

    private function assertProject(Project $project, PurchaseRequest|Rfq|SupplierQuotation $doc): void
    {
        $projectId = match (true) {
            $doc instanceof PurchaseRequest => $doc->project_id,
            $doc instanceof Rfq => $doc->project_id,
            $doc instanceof SupplierQuotation => $doc->project_id,
        };

        if ((int) $projectId !== (int) $project->id) {
            abort(404);
        }
    }
}
