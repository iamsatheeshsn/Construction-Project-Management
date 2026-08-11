<?php

namespace App\Core\RBAC\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantUserRole extends Model
{
    use BelongsToTenant;

    protected $table = 'tenant_user_roles';

    protected $fillable = [
        'tenant_id',
        'tenant_user_id',
        'role_id',
        'project_id',
    ];

    public function membership(): BelongsTo
    {
        return $this->belongsTo(TenantUser::class, 'tenant_user_id');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }
}
