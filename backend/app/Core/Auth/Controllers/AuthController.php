<?php

namespace App\Core\Auth\Controllers;

use App\Core\Auth\Requests\ChangePasswordRequest;
use App\Core\Auth\Requests\LoginRequest;
use App\Core\Auth\Requests\RegisterTenantRequest;
use App\Core\Auth\Resources\UserResource;
use App\Core\RBAC\Models\Role;
use App\Core\RBAC\Models\TenantUser;
use App\Core\RBAC\Models\TenantUserRole;
use App\Core\RBAC\Services\PermissionService;
use App\Core\Tenant\Models\Tenant;
use App\Core\Tenant\TenantManager;
use App\Models\User;
use App\Modules\Organization\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController
{
    public function __construct(
        private TenantManager $tenants,
        private PermissionService $permissions,
    ) {}

    public function register(RegisterTenantRequest $request): JsonResponse
    {
        $data = $request->validated();

        $result = DB::transaction(function () use ($data) {
            $tenant = Tenant::query()->create([
                'name' => $data['company_name'],
                'legal_name' => $data['company_name'],
                'country_code' => $data['country_code'] ?? 'AE',
                'default_currency' => strtoupper($data['currency'] ?? 'AED'),
                'timezone' => 'Asia/Dubai',
                'locale' => 'en',
                'status' => 'trial',
                'trial_ends_at' => now()->addDays(14),
            ]);

            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'phone' => $data['phone'] ?? null,
                'preferred_locale' => 'en',
            ]);

            $membership = TenantUser::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'status' => 'active',
                'is_owner' => true,
                'job_title' => 'Company Owner',
                'joined_at' => now(),
            ]);

            $ownerRole = Role::query()->firstOrCreate(
                ['tenant_id' => null, 'code' => 'company_owner'],
                [
                    'name' => 'Company Owner',
                    'description' => 'Full access within a tenant',
                    'scope' => 'tenant',
                    'is_system' => true,
                ]
            );

            TenantUserRole::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'tenant_user_id' => $membership->id,
                'role_id' => $ownerRole->id,
                'project_id' => null,
            ]);

            $this->tenants->set($tenant);

            Company::query()->create([
                'tenant_id' => $tenant->id,
                'name' => $data['company_name'],
                'legal_name' => $data['company_name'],
                'country_code' => $data['country_code'] ?? 'AE',
                'is_primary' => true,
            ]);

            $planId = DB::table('subscription_plans')->where('code', 'starter')->value('id');
            if ($planId) {
                DB::table('subscriptions')->insert([
                    'tenant_id' => $tenant->id,
                    'plan_id' => $planId,
                    'status' => 'trialing',
                    'billing_cycle' => 'monthly',
                    'starts_at' => now()->toDateString(),
                    'ends_at' => now()->addDays(14)->toDateString(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $token = $user->createToken($data['device_name'] ?? 'spa')->plainTextToken;

            return compact('tenant', 'user', 'token');
        });

        $this->tenants->set($result['tenant']);

        return response()->json([
            'token' => $result['token'],
            'token_type' => 'Bearer',
            'user' => new UserResource($result['user']),
            'tenant' => [
                'id' => $result['tenant']->id,
                'uuid' => $result['tenant']->uuid,
                'name' => $result['tenant']->name,
                'slug' => $result['tenant']->slug,
                'status' => $result['tenant']->status,
                'default_currency' => $result['tenant']->default_currency,
            ],
            'permissions' => ['*'],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $membershipQuery = TenantUser::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->where('status', 'active');

        $scopedTenant = false;

        if (! empty($data['tenant_id'])) {
            $scopedTenant = true;
            $membershipQuery->where('tenant_id', $data['tenant_id']);
        } elseif (! empty($data['tenant_slug'])) {
            $scopedTenant = true;
            $tenantBySlug = Tenant::query()->where('slug', $data['tenant_slug'])->first();

            if ($tenantBySlug === null) {
                throw ValidationException::withMessages([
                    'tenant_slug' => ['No company workspace found for this tenant slug.'],
                ]);
            }

            $membershipQuery->where('tenant_id', $tenantBySlug->id);
        }

        $memberships = $membershipQuery->with('tenant')->get();

        if ($memberships->isEmpty() && ! $user->is_super_admin) {
            throw ValidationException::withMessages([
                $scopedTenant ? 'tenant_slug' : 'email' => [
                    $scopedTenant
                        ? 'You do not have access to this company workspace.'
                        : 'No active tenant membership found for this account.',
                ],
            ]);
        }

        // Super admins may open any tenant by slug/id even without membership.
        if ($user->is_super_admin && $memberships->isEmpty() && $scopedTenant) {
            $tenant = ! empty($data['tenant_id'])
                ? Tenant::query()->find($data['tenant_id'])
                : Tenant::query()->where('slug', $data['tenant_slug'])->first();

            if ($tenant === null) {
                throw ValidationException::withMessages([
                    'tenant_slug' => ['No company workspace found for this tenant slug.'],
                ]);
            }

            $this->tenants->set($tenant);
            $user->forceFill(['last_login_at' => now()])->save();
            $token = $user->createToken($data['device_name'] ?? 'spa')->plainTextToken;

            return response()->json([
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => new UserResource($user),
                'tenant' => [
                    'id' => $tenant->id,
                    'uuid' => $tenant->uuid,
                    'name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'status' => $tenant->status,
                    'default_currency' => $tenant->default_currency,
                ],
                'tenants' => $this->tenantChoicesFor($user),
                'permissions' => ['*'],
            ]);
        }

        if ($memberships->count() > 1 && empty($data['tenant_id']) && empty($data['tenant_slug']) && ! $user->is_super_admin) {
            return response()->json([
                'message' => 'Select a tenant to continue.',
                'tenants' => $memberships->map(fn (TenantUser $m) => [
                    'id' => $m->tenant->id,
                    'name' => $m->tenant->name,
                    'slug' => $m->tenant->slug,
                    'is_owner' => (bool) $m->is_owner,
                ])->values(),
            ], 409);
        }

        $membership = $memberships->first();
        $tenant = $membership?->tenant;

        if ($tenant) {
            $this->tenants->set($tenant);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken($data['device_name'] ?? 'spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'uuid' => $tenant->uuid,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'default_currency' => $tenant->default_currency,
            ] : null,
            'tenants' => $this->tenantChoicesFor($user),
            'permissions' => $user->is_super_admin
                ? ['*']
                : ($tenant ? $this->permissions->codesFor($user)->values() : []),
        ]);
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{id:int,name:string,slug:string,is_owner:bool}>
     */
    private function tenantChoicesFor(User $user)
    {
        if ($user->is_super_admin) {
            return Tenant::query()
                ->orderBy('name')
                ->get()
                ->map(fn (Tenant $t) => [
                    'id' => $t->id,
                    'name' => $t->name,
                    'slug' => $t->slug,
                    'is_owner' => false,
                ])
                ->values();
        }

        return TenantUser::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->with('tenant')
            ->get()
            ->map(fn (TenantUser $m) => [
                'id' => $m->tenant->id,
                'name' => $m->tenant->name,
                'slug' => $m->tenant->slug,
                'is_owner' => (bool) $m->is_owner,
            ])
            ->values();
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenant = $this->tenants->check() ? $this->tenants->tenant() : null;

        return response()->json([
            'user' => new UserResource($user),
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'uuid' => $tenant->uuid,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'default_currency' => $tenant->default_currency,
            ] : null,
            'tenants' => $this->tenantChoicesFor($user),
            'permissions' => $user->is_super_admin
                ? ['*']
                : ($tenant ? $this->permissions->codesFor($user)->values() : []),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'password' => $data['password'],
        ])->save();

        $currentId = $user->currentAccessToken()?->id;
        $user->tokens()
            ->when($currentId, fn ($q) => $q->where('id', '!=', $currentId))
            ->delete();

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function switchTenant(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tenant_id' => ['required_without:tenant_slug', 'integer'],
            'tenant_slug' => ['required_without:tenant_id', 'string'],
        ]);

        $tenant = ! empty($data['tenant_id'])
            ? Tenant::query()->findOrFail($data['tenant_id'])
            : Tenant::query()->where('slug', $data['tenant_slug'])->firstOrFail();

        $membership = TenantUser::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        if ($membership === null && ! $request->user()->is_super_admin) {
            return response()->json(['message' => 'Not a member of this tenant.'], 403);
        }

        $this->tenants->set($tenant);

        return response()->json([
            'tenant' => [
                'id' => $tenant->id,
                'uuid' => $tenant->uuid,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'default_currency' => $tenant->default_currency,
            ],
            'permissions' => $request->user()->is_super_admin
                ? ['*']
                : $this->permissions->codesFor($request->user())->values(),
        ]);
    }
}
