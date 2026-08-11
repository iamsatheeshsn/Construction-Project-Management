<?php

namespace App\Modules\Subcontractors\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubcontractPackageItem extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'subcontract_package_id',
        'description',
        'unit',
        'quantity',
        'rate',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'rate' => 'decimal:4',
            'amount' => 'decimal:2',
        ];
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(SubcontractPackage::class, 'subcontract_package_id');
    }
}
