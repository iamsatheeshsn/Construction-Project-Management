<?php

namespace App\Core\RBAC\Models;

use App\Core\Tenant\Models\Tenant;
use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TenantUser extends Model
{
    use BelongsToTenant;

    protected $table = 'tenant_users';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'status',
        'is_owner',
        'job_title',
        'invited_at',
        'joined_at',
    ];

    protected function casts(): array
    {
        return [
            'is_owner' => 'boolean',
            'invited_at' => 'datetime',
            'joined_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function roleAssignments(): HasMany
    {
        return $this->hasMany(TenantUserRole::class);
    }
}
