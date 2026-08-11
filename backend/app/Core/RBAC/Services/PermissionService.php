<?php

namespace App\Core\RBAC\Services;

use App\Core\RBAC\Models\TenantUser;
use App\Core\Tenant\TenantManager;
use App\Models\User;
use Illuminate\Support\Collection;

class PermissionService
{
    public function __construct(private TenantManager $tenants) {}

    /**
     * @return Collection<int, string>
     */
    public function codesFor(User $user, ?int $projectId = null): Collection
    {
        if ($user->is_super_admin) {
            return collect(['*']);
        }

        $tenantId = $this->tenants->id();
        if ($tenantId === null) {
            return collect();
        }

        $membership = TenantUser::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($membership === null) {
            return collect();
        }

        if ($membership->is_owner) {
            return collect(['*']);
        }

        $assignments = $membership->roleAssignments()
            ->with('role.permissions')
            ->where(function ($query) use ($projectId): void {
                $query->whereNull('project_id');
                if ($projectId !== null) {
                    $query->orWhere('project_id', $projectId);
                }
            })
            ->get();

        return $assignments
            ->flatMap(fn ($assignment) => $assignment->role?->permissions ?? collect())
            ->pluck('code')
            ->unique()
            ->values();
    }

    public function can(User $user, string $permission, ?int $projectId = null): bool
    {
        $codes = $this->codesFor($user, $projectId);

        return $codes->contains('*') || $codes->contains($permission);
    }
}
