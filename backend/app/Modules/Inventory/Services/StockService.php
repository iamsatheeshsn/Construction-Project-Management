<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\MaterialIssue;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\StockTransaction;
use App\Modules\Procurement\Models\GoodsReceipt;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockService
{
    public function postGoodsReceiptStock(GoodsReceipt $grn, ?int $userId = null): void
    {
        DB::transaction(function () use ($grn, $userId) {
            $grn->loadMissing('items');

            foreach ($grn->items as $item) {
                if ((float) $item->quantity <= 0 || ! $item->inventory_item_id) {
                    continue;
                }

                $this->adjustBalance(
                    warehouseId: (int) $grn->warehouse_id,
                    inventoryItemId: (int) $item->inventory_item_id,
                    projectId: $grn->project_id,
                    quantityDelta: (float) $item->quantity,
                    unitCost: (float) $item->unit_cost,
                    txnType: 'in',
                    referenceType: 'goods_receipt',
                    referenceId: $grn->id,
                    userId: $userId
                );
            }
        });
    }

    public function postMaterialIssueStock(MaterialIssue $issue, ?int $userId = null): void
    {
        DB::transaction(function () use ($issue, $userId) {
            $issue->loadMissing('items');

            foreach ($issue->items as $item) {
                if ((float) $item->quantity <= 0 || ! $item->inventory_item_id) {
                    continue;
                }

                $this->adjustBalance(
                    warehouseId: (int) $issue->warehouse_id,
                    inventoryItemId: (int) $item->inventory_item_id,
                    projectId: $issue->project_id,
                    quantityDelta: -1 * (float) $item->quantity,
                    unitCost: 0,
                    txnType: 'consumption',
                    referenceType: 'material_issue',
                    referenceId: $issue->id,
                    userId: $userId,
                    preventOversell: true
                );
            }
        });
    }

    public function adjustBalance(
        int $warehouseId,
        int $inventoryItemId,
        ?int $projectId,
        float $quantityDelta,
        float $unitCost,
        string $txnType,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $userId = null,
        bool $preventOversell = false
    ): StockBalance {
        $balance = StockBalance::query()->firstOrNew([
            'warehouse_id' => $warehouseId,
            'inventory_item_id' => $inventoryItemId,
            'project_id' => $projectId,
        ]);

        $currentQty = (float) ($balance->quantity ?? 0);
        $newQty = round($currentQty + $quantityDelta, 4);

        if ($preventOversell && $newQty < 0) {
            throw ValidationException::withMessages([
                'stock' => ['Insufficient stock for inventory item #'.$inventoryItemId.'.'],
            ]);
        }

        if ($quantityDelta > 0) {
            $currentCost = (float) ($balance->avg_unit_cost ?? 0);
            $incomingCost = $unitCost > 0 ? $unitCost : $currentCost;
            $balance->avg_unit_cost = $currentQty + $quantityDelta > 0
                ? round((($currentQty * $currentCost) + ($quantityDelta * $incomingCost)) / ($currentQty + $quantityDelta), 4)
                : $incomingCost;
        }

        $balance->quantity = $newQty;
        $balance->warehouse_id = $warehouseId;
        $balance->inventory_item_id = $inventoryItemId;
        $balance->project_id = $projectId;
        $balance->save();

        StockTransaction::query()->create([
            'warehouse_id' => $warehouseId,
            'inventory_item_id' => $inventoryItemId,
            'project_id' => $projectId,
            'txn_type' => $txnType,
            'quantity' => abs($quantityDelta),
            'unit_cost' => $unitCost,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'created_by' => $userId,
            'created_at' => now(),
        ]);

        return $balance;
    }
}
