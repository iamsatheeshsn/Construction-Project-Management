<?php

namespace App\Modules\Planning\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use App\Modules\Projects\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'project_id',
        'wbs_id',
        'milestone_id',
        'parent_task_id',
        'task_code',
        'name',
        'description',
        'status',
        'priority',
        'planned_start_date',
        'planned_end_date',
        'baseline_start_date',
        'baseline_end_date',
        'actual_start_date',
        'actual_end_date',
        'duration_days',
        'progress_percent',
        'assigned_to',
        'sort_order',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'planned_start_date' => 'date',
            'planned_end_date' => 'date',
            'baseline_start_date' => 'date',
            'baseline_end_date' => 'date',
            'actual_start_date' => 'date',
            'actual_end_date' => 'date',
            'duration_days' => 'decimal:2',
            'progress_percent' => 'decimal:2',
            'sort_order' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function wbs(): BelongsTo
    {
        return $this->belongsTo(WbsNode::class, 'wbs_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_task_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_task_id');
    }

    public function predecessorLinks(): HasMany
    {
        return $this->hasMany(TaskDependency::class, 'successor_task_id');
    }

    public function successorLinks(): HasMany
    {
        return $this->hasMany(TaskDependency::class, 'predecessor_task_id');
    }
}
