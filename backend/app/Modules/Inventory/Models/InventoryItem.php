<?php

namespace App\Modules\Inventory\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'sku',
        'name',
        'description',
        'unit',
        'category',
        'default_rate',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'default_rate' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }
}
