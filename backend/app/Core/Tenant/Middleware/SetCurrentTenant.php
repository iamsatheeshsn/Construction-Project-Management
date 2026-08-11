<?php

namespace App\Core\Tenant\Middleware;

use App\Core\RBAC\Models\TenantUser;
use App\Core\Tenant\Models\Tenant;
use App\Core\Tenant\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetCurrentTenant
{
    public function __construct(private TenantManager $tenants) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);
        }

        if ($user->is_super_admin && ! $request->headers->has('X-Tenant-ID') && ! $request->headers->has('X-Tenant-Slug')) {
            return $next($request);
        }

        $tenant = $this->resolveTenant($request);

        if ($tenant === null) {
            return response()->json([
                'message' => 'Tenant context is required. Pass X-Tenant-ID or X-Tenant-Slug.',
            ], 400);
        }

        $membership = TenantUser::query()
            ->where('tenant_id', $tenant->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($membership === null && ! $user->is_super_admin) {
            return response()->json([
                'message' => 'You are not an active member of this tenant.',
            ], 403);
        }

        $this->tenants->set($tenant);
        $request->attributes->set('tenant', $tenant);
        $request->attributes->set('tenant_membership', $membership);

        return $next($request);
    }

    protected function resolveTenant(Request $request): ?Tenant
    {
        if ($request->headers->has('X-Tenant-ID')) {
            return Tenant::query()->find($request->header('X-Tenant-ID'));
        }

        if ($request->headers->has('X-Tenant-Slug')) {
            return Tenant::query()->where('slug', $request->header('X-Tenant-Slug'))->first();
        }

        // Fallback: single active membership
        $memberships = TenantUser::query()
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->with('tenant')
            ->get();

        if ($memberships->count() === 1) {
            return $memberships->first()->tenant;
        }

        return null;
    }
}
