<?php

namespace App\Modules\Procurement\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Modules\Inventory\Models\InventoryItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RfqItem extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rfq_id',
        'inventory_item_id',
        'description',
        'unit',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
        ];
    }

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class);
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }
}
