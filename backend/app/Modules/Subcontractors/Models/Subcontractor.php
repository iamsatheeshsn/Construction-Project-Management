<?php

namespace App\Modules\Subcontractors\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subcontractor extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'trade',
        'contact_name',
        'email',
        'phone',
        'address',
        'status',
        'quality_score',
        'schedule_score',
        'cost_score',
        'safety_score',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quality_score' => 'decimal:2',
            'schedule_score' => 'decimal:2',
            'cost_score' => 'decimal:2',
            'safety_score' => 'decimal:2',
        ];
    }

    public function packages(): HasMany
    {
        return $this->hasMany(SubcontractPackage::class);
    }
}
