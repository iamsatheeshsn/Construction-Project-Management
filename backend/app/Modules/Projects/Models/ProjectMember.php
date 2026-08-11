<?php

namespace App\Modules\Projects\Models;

use App\Core\RBAC\Models\Role;
use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectMember extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'project_id',
        'user_id',
        'role_id',
        'is_lead',
        'joined_at',
        'left_at',
    ];

    protected function casts(): array
    {
        return [
            'is_lead' => 'boolean',
            'joined_at' => 'date',
            'left_at' => 'date',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }
}
