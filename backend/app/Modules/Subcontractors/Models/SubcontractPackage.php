<?php

namespace App\Modules\Subcontractors\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use App\Modules\Projects\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SubcontractPackage extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'project_id',
        'subcontractor_id',
        'package_no',
        'title',
        'description',
        'status',
        'currency',
        'contract_value',
        'retention_percent',
        'start_date',
        'end_date',
        'awarded_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'contract_value' => 'decimal:2',
            'retention_percent' => 'decimal:2',
            'awarded_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function subcontractor(): BelongsTo
    {
        return $this->belongsTo(Subcontractor::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SubcontractPackageItem::class);
    }
}
