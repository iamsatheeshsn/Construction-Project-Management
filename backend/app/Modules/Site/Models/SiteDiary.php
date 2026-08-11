<?php

namespace App\Modules\Site\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use App\Modules\Projects\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SiteDiary extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'project_id',
        'report_date',
        'weather',
        'temperature_c',
        'work_completed',
        'work_planned',
        'issues',
        'delays',
        'visitors',
        'remarks',
        'status',
        'prepared_by',
        'approved_by',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'temperature_c' => 'decimal:2',
            'approved_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function labours(): HasMany
    {
        return $this->hasMany(SiteDiaryLabour::class);
    }

    public function equipment(): HasMany
    {
        return $this->hasMany(SiteDiaryEquipment::class);
    }

    public function materials(): HasMany
    {
        return $this->hasMany(SiteDiaryMaterial::class);
    }

    public function preparer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
