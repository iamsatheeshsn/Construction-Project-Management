<?php

namespace App\Modules\Equipment\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use App\Modules\Projects\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentUsageLog extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'project_id',
        'equipment_id',
        'equipment_assignment_id',
        'usage_date',
        'hours',
        'fuel_liters',
        'remarks',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'usage_date' => 'date',
            'hours' => 'decimal:2',
            'fuel_liters' => 'decimal:2',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(EquipmentAssignment::class, 'equipment_assignment_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
