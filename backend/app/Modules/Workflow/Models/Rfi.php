<?php

namespace App\Modules\Workflow\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use App\Modules\Projects\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Rfi extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'project_id',
        'rfi_no',
        'subject',
        'description',
        'discipline',
        'status',
        'priority',
        'submitted_by',
        'assigned_to',
        'due_date',
        'responded_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'responded_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(RfiResponse::class)->orderBy('created_at');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(RfiAttachment::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
