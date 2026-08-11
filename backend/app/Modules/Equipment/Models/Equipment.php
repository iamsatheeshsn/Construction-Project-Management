<?php

namespace App\Modules\Equipment\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Equipment extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'equipment';

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'category',
        'ownership',
        'status',
        'manufacturer',
        'model',
        'serial_no',
        'daily_rate',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'daily_rate' => 'decimal:2',
        ];
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(EquipmentAssignment::class);
    }

    public function usageLogs(): HasMany
    {
        return $this->hasMany(EquipmentUsageLog::class);
    }
}
