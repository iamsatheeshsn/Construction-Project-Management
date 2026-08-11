<?php

namespace App\Core\SaaS\Services;

use App\Core\RBAC\Models\TenantUser;
use App\Core\SaaS\Models\Subscription;
use App\Core\SaaS\Models\TenantFeature;
use App\Core\Tenant\Models\Tenant;
use App\Modules\Projects\Models\Project;
use Illuminate\Validation\ValidationException;

class UsageLimitService
{
    public function snapshot(Tenant $tenant): array
    {
        $subscription = Subscription::query()
            ->with('plan')
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('id')
            ->first();

        $plan = $subscription?->plan;
        $usersUsed = TenantUser::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('status', ['active', 'invited'])
            ->count();
        $projectsUsed = Project::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->count();

        return [
            'tenant_id' => $tenant->id,
            'plan' => $plan ? [
                'id' => $plan->id,
                'code' => $plan->code,
                'name' => $plan->name,
                'max_users' => $plan->max_users,
                'max_projects' => $plan->max_projects,
            ] : null,
            'subscription_status' => $subscription?->status,
            'users' => [
                'used' => $usersUsed,
                'max' => $plan?->max_users,
                'remaining' => $plan?->max_users === null ? null : max(0, $plan->max_users - $usersUsed),
            ],
            'projects' => [
                'used' => $projectsUsed,
                'max' => $plan?->max_projects,
                'remaining' => $plan?->max_projects === null ? null : max(0, $plan->max_projects - $projectsUsed),
            ],
            'trial_ends_at' => optional($tenant->trial_ends_at)?->toIso8601String(),
            'tenant_status' => $tenant->status,
            'features' => TenantFeature::query()
                ->where('tenant_id', $tenant->id)
                ->orderBy('feature_key')
                ->get(['feature_key', 'is_enabled', 'limits_json']),
        ];
    }

    public function assertCanAddUser(Tenant $tenant): void
    {
        $snap = $this->snapshot($tenant);
        $max = $snap['users']['max'];
        if ($max !== null && $snap['users']['used'] >= $max) {
            throw ValidationException::withMessages([
                'email' => ["User limit reached for this tenant's plan ({$max}). Upgrade the subscription plan."],
            ]);
        }
    }

    public function assertCanAddProject(Tenant $tenant): void
    {
        $snap = $this->snapshot($tenant);
        $max = $snap['projects']['max'];
        if ($max !== null && $snap['projects']['used'] >= $max) {
            throw ValidationException::withMessages([
                'name' => ["Project limit reached for this tenant's plan ({$max}). Upgrade the subscription plan."],
            ]);
        }
    }

    public function featureEnabled(Tenant $tenant, string $featureKey): bool
    {
        $row = TenantFeature::query()
            ->where('tenant_id', $tenant->id)
            ->where('feature_key', $featureKey)
            ->first();

        return $row ? (bool) $row->is_enabled : true;
    }
}
