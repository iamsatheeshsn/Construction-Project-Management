<?php

namespace App\Modules\Procurement\Services;

use App\Core\Audit\Services\AuditTrail;
use App\Modules\Inventory\Models\Warehouse;
use App\Modules\Inventory\Services\StockService;
use App\Modules\Procurement\Models\GoodsReceipt;
use App\Modules\Procurement\Models\GoodsReceiptItem;
use App\Modules\Procurement\Models\MaterialRequest;
use App\Modules\Procurement\Models\MaterialRequestItem;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Models\PurchaseOrderItem;
use App\Modules\Procurement\Models\PurchaseRequest;
use App\Modules\Procurement\Models\PurchaseRequestItem;
use App\Modules\Procurement\Models\Supplier;
use App\Modules\Procurement\Models\SupplierQuotation;
use App\Modules\Projects\Models\Project;
use App\Shared\Support\DocumentNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProcurementService
{
    public function __construct(private StockService $stock) {}

    public function createMaterialRequest(Project $project, array $data, ?int $userId = null): MaterialRequest
    {
        $data['project_id'] = $project->id;
        $data['status'] = $data['status'] ?? 'draft';
        $data['requested_by'] = $userId;

        return MaterialRequest::query()->create($data);
    }

    public function updateMaterialRequest(Project $project, MaterialRequest $mr, array $data): MaterialRequest
    {
        $this->assertProject($project, $mr);
        $this->assertMrEditable($mr);
        $mr->update($data);

        return $mr->fresh();
    }

    public function addMaterialRequestItem(Project $project, MaterialRequest $mr, array $data): MaterialRequestItem
    {
        $this->assertProject($project, $mr);
        $this->assertMrEditable($mr);

        $data['material_request_id'] = $mr->id;

        return MaterialRequestItem::query()->create($data);
    }

    public function submitMaterialRequest(Project $project, MaterialRequest $mr): MaterialRequest
    {
        $this->assertProject($project, $mr);

        if ($mr->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft material requests can be submitted.'],
            ]);
        }

        $mr->update(['status' => 'submitted']);

        return $mr->fresh();
    }

    public function approveMaterialRequest(Project $project, MaterialRequest $mr, int $userId): MaterialRequest
    {
        $this->assertProject($project, $mr);

        if ($mr->status !== 'submitted') {
            throw ValidationException::withMessages([
                'status' => ['Only submitted material requests can be approved.'],
            ]);
        }

        $mr->update([
            'status' => 'approved',
            'approved_by' => $userId,
            'approved_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'procurement',
            'action' => 'material_request_approved',
            'entity_type' => 'material_request',
            'entity_id' => $mr->id,
            'project_id' => $project->id,
            'description' => "Material request {$mr->request_no} approved",
            'title' => 'Material request approved',
            'body' => "{$mr->request_no}: {$mr->title}",
            'new' => ['status' => 'approved'],
        ]);

        return $mr->fresh();
    }

    public function convertMrToPr(Project $project, MaterialRequest $mr, array $data, ?int $userId = null): PurchaseRequest
    {
        $this->assertProject($project, $mr);

        if ($mr->status !== 'approved') {
            throw ValidationException::withMessages([
                'status' => ['Only approved material requests can be converted to purchase requests.'],
            ]);
        }

        return DB::transaction(function () use ($project, $mr, $data, $userId) {
            $mr->loadMissing('items');

            $pr = PurchaseRequest::query()->create([
                'project_id' => $project->id,
                'material_request_id' => $mr->id,
                'request_no' => $data['request_no'] ?? ('PR-'.preg_replace('/^MR-?/i', '', $mr->request_no)),
                'title' => $data['title'] ?? $mr->title,
                'status' => 'draft',
                'notes' => $data['notes'] ?? $mr->notes,
                'requested_by' => $userId,
            ]);

            foreach ($mr->items as $item) {
                $rate = 0.0;
                if ($item->inventory_item_id) {
                    $rate = (float) (\App\Modules\Inventory\Models\InventoryItem::query()
                        ->where('id', $item->inventory_item_id)
                        ->value('default_rate') ?? 0);
                }

                PurchaseRequestItem::query()->create([
                    'purchase_request_id' => $pr->id,
                    'inventory_item_id' => $item->inventory_item_id,
                    'description' => $item->description,
                    'unit' => $item->unit,
                    'quantity' => $item->quantity,
                    'estimated_rate' => $rate,
                    'estimated_amount' => round((float) $item->quantity * $rate, 2),
                ]);
            }

            $mr->update(['status' => 'converted']);

            return $pr->load('items');
        });
    }

    public function createPurchaseRequest(Project $project, array $data, ?int $userId = null): PurchaseRequest
    {
        $data['project_id'] = $project->id;
        $data['status'] = $data['status'] ?? 'draft';
        $data['requested_by'] = $userId;

        return PurchaseRequest::query()->create($data);
    }

    public function updatePurchaseRequest(Project $project, PurchaseRequest $pr, array $data): PurchaseRequest
    {
        $this->assertProject($project, $pr);
        $this->assertPrEditable($pr);
        $pr->update($data);

        return $pr->fresh();
    }

    public function addPurchaseRequestItem(Project $project, PurchaseRequest $pr, array $data): PurchaseRequestItem
    {
        $this->assertProject($project, $pr);
        $this->assertPrEditable($pr);

        $qty = (float) ($data['quantity'] ?? 0);
        $rate = (float) ($data['estimated_rate'] ?? 0);
        $data['purchase_request_id'] = $pr->id;
        $data['estimated_amount'] = round($qty * $rate, 2);

        return PurchaseRequestItem::query()->create($data);
    }

    public function submitPurchaseRequest(Project $project, PurchaseRequest $pr): PurchaseRequest
    {
        $this->assertProject($project, $pr);

        if ($pr->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft purchase requests can be submitted.'],
            ]);
        }

        $pr->update(['status' => 'submitted']);

        return $pr->fresh();
    }

    public function approvePurchaseRequest(Project $project, PurchaseRequest $pr, int $userId): PurchaseRequest
    {
        $this->assertProject($project, $pr);

        if ($pr->status !== 'submitted') {
            throw ValidationException::withMessages([
                'status' => ['Only submitted purchase requests can be approved.'],
            ]);
        }

        $pr->update([
            'status' => 'approved',
            'approved_by' => $userId,
            'approved_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'procurement',
            'action' => 'purchase_request_approved',
            'entity_type' => 'purchase_request',
            'entity_id' => $pr->id,
            'project_id' => $project->id,
            'description' => "Purchase request {$pr->request_no} approved",
            'title' => 'Purchase request approved',
            'body' => "{$pr->request_no}: {$pr->title}",
            'new' => ['status' => 'approved'],
        ]);

        return $pr->fresh();
    }

    public function createPoFromPr(Project $project, PurchaseRequest $pr, array $data, ?int $userId = null): PurchaseOrder
    {
        $this->assertProject($project, $pr);

        if ($pr->status !== 'approved') {
            throw ValidationException::withMessages([
                'status' => ['Only approved purchase requests can be converted to purchase orders.'],
            ]);
        }

        Supplier::query()->findOrFail($data['supplier_id']);
        Warehouse::query()->findOrFail($data['warehouse_id']);

        return DB::transaction(function () use ($project, $pr, $data, $userId) {
            $pr->loadMissing('items');

            $po = PurchaseOrder::query()->create([
                'project_id' => $project->id,
                'purchase_request_id' => $pr->id,
                'supplier_id' => $data['supplier_id'],
                'warehouse_id' => $data['warehouse_id'],
                'po_no' => $data['po_no'] ?? ('PO-'.$pr->request_no),
                'title' => $data['title'] ?? $pr->title,
                'status' => 'draft',
                'currency' => strtoupper($data['currency'] ?? $project->currency ?? 'AED'),
                'order_date' => $data['order_date'] ?? now()->toDateString(),
                'expected_date' => $data['expected_date'] ?? null,
                'notes' => $data['notes'] ?? $pr->notes,
                'created_by' => $userId,
                'subtotal' => 0,
                'tax_amount' => (float) ($data['tax_amount'] ?? 0),
                'total_amount' => 0,
            ]);

            foreach ($pr->items as $item) {
                $rate = (float) ($item->estimated_rate ?? 0);
                PurchaseOrderItem::query()->create([
                    'purchase_order_id' => $po->id,
                    'inventory_item_id' => $item->inventory_item_id,
                    'description' => $item->description,
                    'unit' => $item->unit,
                    'quantity' => $item->quantity,
                    'received_quantity' => 0,
                    'rate' => $rate,
                    'amount' => round((float) $item->quantity * $rate, 2),
                ]);
            }

            $this->recalculatePoTotals($po);
            $pr->update(['status' => 'ordered']);

            return $po->fresh()->load('items');
        });
    }

    public function createPurchaseOrder(Project $project, array $data, ?int $userId = null): PurchaseOrder
    {
        Supplier::query()->findOrFail($data['supplier_id']);

        if (! empty($data['warehouse_id'])) {
            Warehouse::query()->findOrFail($data['warehouse_id']);
        }

        $data['project_id'] = $project->id;
        $data['status'] = $data['status'] ?? 'draft';
        $data['currency'] = strtoupper($data['currency'] ?? $project->currency ?? 'AED');
        $data['created_by'] = $userId;
        $data['subtotal'] = 0;
        $data['tax_amount'] = (float) ($data['tax_amount'] ?? 0);
        $data['total_amount'] = 0;

        return PurchaseOrder::query()->create($data);
    }

    public function updatePurchaseOrder(Project $project, PurchaseOrder $po, array $data): PurchaseOrder
    {
        $this->assertProject($project, $po);
        $this->assertPoEditable($po);

        if (isset($data['currency'])) {
            $data['currency'] = strtoupper($data['currency']);
        }

        $po->update($data);
        $this->recalculatePoTotals($po);

        return $po->fresh();
    }

    public function addPurchaseOrderItem(Project $project, PurchaseOrder $po, array $data): PurchaseOrderItem
    {
        $this->assertProject($project, $po);
        $this->assertPoEditable($po);

        $qty = (float) ($data['quantity'] ?? 0);
        $rate = (float) ($data['rate'] ?? 0);
        $data['purchase_order_id'] = $po->id;
        $data['received_quantity'] = 0;
        $data['amount'] = round($qty * $rate, 2);

        return DB::transaction(function () use ($po, $data) {
            $item = PurchaseOrderItem::query()->create($data);
            $this->recalculatePoTotals($po);

            return $item;
        });
    }

    public function issuePurchaseOrder(Project $project, PurchaseOrder $po): PurchaseOrder
    {
        $this->assertProject($project, $po);

        if ($po->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft purchase orders can be issued.'],
            ]);
        }

        if ($po->items()->count() === 0) {
            throw ValidationException::withMessages([
                'items' => ['Purchase order must have at least one item.'],
            ]);
        }

        $po->update([
            'status' => 'issued',
            'issued_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'procurement',
            'action' => 'purchase_order_issued',
            'entity_type' => 'purchase_order',
            'entity_id' => $po->id,
            'project_id' => $project->id,
            'description' => "Purchase order {$po->po_no} issued",
            'title' => 'Purchase order issued',
            'body' => "{$po->po_no}: ".number_format((float) $po->total_amount, 2).' '.$po->currency,
            'new' => ['status' => 'issued', 'total_amount' => $po->total_amount],
        ]);

        return $po->fresh();
    }

    public function createGoodsReceiptFromPo(Project $project, PurchaseOrder $po, array $data, ?int $userId = null): GoodsReceipt
    {
        $this->assertProject($project, $po);

        if (! in_array($po->status, ['issued', 'partially_received'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Goods receipt can only be created from issued or partially received purchase orders.'],
            ]);
        }

        $warehouseId = $data['warehouse_id'] ?? $po->warehouse_id;
        Warehouse::query()->findOrFail($warehouseId);

        return DB::transaction(function () use ($project, $po, $data, $warehouseId, $userId) {
            $po->loadMissing('items');

            $grn = GoodsReceipt::query()->create([
                'project_id' => $project->id,
                'purchase_order_id' => $po->id,
                'warehouse_id' => $warehouseId,
                'grn_no' => $data['grn_no'],
                'received_date' => $data['received_date'] ?? now()->toDateString(),
                'status' => 'draft',
                'notes' => $data['notes'] ?? null,
                'received_by' => $userId,
            ]);

            foreach ($po->items as $poItem) {
                $remaining = round((float) $poItem->quantity - (float) $poItem->received_quantity, 4);
                if ($remaining <= 0) {
                    continue;
                }

                GoodsReceiptItem::query()->create([
                    'goods_receipt_id' => $grn->id,
                    'purchase_order_item_id' => $poItem->id,
                    'inventory_item_id' => $poItem->inventory_item_id,
                    'description' => $poItem->description,
                    'unit' => $poItem->unit,
                    'quantity' => $remaining,
                    'unit_cost' => (float) $poItem->rate,
                ]);
            }

            if ($grn->items()->count() === 0) {
                throw ValidationException::withMessages([
                    'purchase_order' => ['No remaining quantities to receive on this purchase order.'],
                ]);
            }

            return $grn->load('items');
        });
    }

    public function addGoodsReceiptItem(Project $project, GoodsReceipt $grn, array $data): GoodsReceiptItem
    {
        $this->assertProject($project, $grn);
        $this->assertGrnDraft($grn);

        $data['goods_receipt_id'] = $grn->id;

        return GoodsReceiptItem::query()->create($data);
    }

    public function postGoodsReceipt(Project $project, GoodsReceipt $grn, ?int $userId = null): GoodsReceipt
    {
        $this->assertProject($project, $grn);

        if ($grn->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft goods receipts can be posted.'],
            ]);
        }

        return DB::transaction(function () use ($project, $grn, $userId) {
            $grn->loadMissing(['items.purchaseOrderItem', 'purchaseOrder.items']);

            foreach ($grn->items as $grItem) {
                if (! $grItem->purchase_order_item_id) {
                    continue;
                }

                $poItem = $grItem->purchaseOrderItem;
                if (! $poItem) {
                    continue;
                }

                $newReceived = round((float) $poItem->received_quantity + (float) $grItem->quantity, 4);
                if ($newReceived > (float) $poItem->quantity) {
                    throw ValidationException::withMessages([
                        'quantity' => ["Received quantity exceeds ordered quantity for item {$poItem->id}."],
                    ]);
                }

                $poItem->update(['received_quantity' => $newReceived]);
            }

            $po = $grn->purchaseOrder()->first();
            if ($po) {
                $po->load('items');
                $allReceived = $po->items->every(fn ($item) => (float) $item->received_quantity >= (float) $item->quantity);
                $anyReceived = $po->items->contains(fn ($item) => (float) $item->received_quantity > 0);
                $po->update([
                    'status' => $allReceived ? 'received' : ($anyReceived ? 'partially_received' : $po->status),
                ]);
            }

            $this->stock->postGoodsReceiptStock($grn, $userId);

            $grn->update([
                'status' => 'posted',
                'posted_at' => now(),
            ]);

            app(AuditTrail::class)->record([
                'module' => 'procurement',
                'action' => 'goods_receipt_posted',
                'entity_type' => 'goods_receipt',
                'entity_id' => $grn->id,
                'project_id' => $project->id,
                'description' => "Goods receipt {$grn->grn_no} posted",
                'title' => 'Goods receipt posted',
                'body' => "{$grn->grn_no} for PO {$po?->po_no}",
                'new' => ['status' => 'posted', 'po_status' => $po?->status],
            ]);

            return $grn->fresh()->load('items');
        });
    }

    public function createPoFromQuotation(Project $project, SupplierQuotation $quotation, array $data, ?int $userId = null): PurchaseOrder
    {
        if ((int) $quotation->project_id !== (int) $project->id) {
            abort(404);
        }

        if ($quotation->status !== 'awarded') {
            throw ValidationException::withMessages([
                'quotation' => ['Only awarded quotations can be converted to purchase orders.'],
            ]);
        }

        Warehouse::query()->findOrFail($data['warehouse_id']);

        return DB::transaction(function () use ($project, $quotation, $data, $userId) {
            $quotation->loadMissing(['items', 'rfq']);

            $poNo = $data['po_no'] ?? DocumentNumber::forProject('PO', 'purchase_orders', $project->id);

            $po = PurchaseOrder::query()->create([
                'project_id' => $project->id,
                'purchase_request_id' => $quotation->rfq?->purchase_request_id,
                'supplier_id' => $quotation->supplier_id,
                'warehouse_id' => $data['warehouse_id'],
                'po_no' => $poNo,
                'title' => $data['title'] ?? $quotation->rfq?->title ?? 'PO from '.$quotation->quote_no,
                'status' => 'draft',
                'currency' => strtoupper($data['currency'] ?? $quotation->currency ?? $project->currency ?? 'AED'),
                'order_date' => $data['order_date'] ?? now()->toDateString(),
                'expected_date' => $data['expected_date'] ?? null,
                'notes' => $data['notes'] ?? $quotation->notes,
                'created_by' => $userId,
                'subtotal' => 0,
                'tax_amount' => (float) ($data['tax_amount'] ?? $quotation->tax_amount ?? 0),
                'total_amount' => 0,
            ]);

            foreach ($quotation->items as $item) {
                PurchaseOrderItem::query()->create([
                    'purchase_order_id' => $po->id,
                    'inventory_item_id' => $item->inventory_item_id,
                    'description' => $item->description,
                    'unit' => $item->unit,
                    'quantity' => $item->quantity,
                    'received_quantity' => 0,
                    'rate' => (float) $item->rate,
                    'amount' => (float) $item->amount,
                ]);
            }

            $this->recalculatePoTotals($po);

            return $po->fresh()->load('items');
        });
    }

    public function recalculatePoTotals(PurchaseOrder $po): void
    {
        $subtotal = (float) PurchaseOrderItem::query()
            ->where('purchase_order_id', $po->id)
            ->sum('amount');

        $tax = (float) $po->tax_amount;
        $po->update([
            'subtotal' => round($subtotal, 2),
            'total_amount' => round($subtotal + $tax, 2),
        ]);
    }

    private function assertProject(Project $project, MaterialRequest|PurchaseRequest|PurchaseOrder|GoodsReceipt $doc): void
    {
        if ((int) $doc->project_id !== (int) $project->id) {
            abort(404);
        }
    }

    private function assertMrEditable(MaterialRequest $mr): void
    {
        if ($mr->status !== 'draft') {
            throw ValidationException::withMessages([
                'material_request' => ['Only draft material requests can be edited.'],
            ]);
        }
    }

    private function assertPrEditable(PurchaseRequest $pr): void
    {
        if ($pr->status !== 'draft') {
            throw ValidationException::withMessages([
                'purchase_request' => ['Only draft purchase requests can be edited.'],
            ]);
        }
    }

    private function assertPoEditable(PurchaseOrder $po): void
    {
        if ($po->status !== 'draft') {
            throw ValidationException::withMessages([
                'purchase_order' => ['Only draft purchase orders can be edited.'],
            ]);
        }
    }

    private function assertGrnDraft(GoodsReceipt $grn): void
    {
        if ($grn->status !== 'draft') {
            throw ValidationException::withMessages([
                'goods_receipt' => ['Only draft goods receipts can be edited.'],
            ]);
        }
    }
}
