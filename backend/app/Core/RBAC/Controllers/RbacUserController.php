<?php

namespace App\Core\RBAC\Controllers;

use App\Core\Audit\Services\AuditTrail;
use App\Core\RBAC\Models\Role;
use App\Core\RBAC\Models\TenantUser;
use App\Core\RBAC\Models\TenantUserRole;
use App\Core\SaaS\Services\UsageLimitService;
use App\Core\Tenant\TenantManager;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RbacUserController
{
    public function __construct(
        private TenantManager $tenants,
        private UsageLimitService $usage,
        private AuditTrail $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $users = TenantUser::query()
            ->with(['user:id,uuid,name,email,phone,last_login_at', 'roleAssignments.role'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('job_title', 'like', $term)
                        ->orWhereHas('user', function ($userQuery) use ($term) {
                            $userQuery->where('name', 'like', $term)
                                ->orWhere('email', 'like', $term);
                        });
                });
            })
            ->orderByDesc('id')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return response()->json($users);
    }

    public function invite(Request $request): JsonResponse
    {
        $tenant = $this->tenants->tenant();
        $tenantId = $tenant->id;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:8'],
            'job_title' => ['nullable', 'string', 'max:120'],
            'role_id' => [
                'nullable',
                'integer',
                Rule::exists('roles', 'id')->where(function ($q) use ($tenantId) {
                    $q->where(function ($inner) use ($tenantId) {
                        $inner->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
                    });
                }),
            ],
            'status' => ['nullable', Rule::in(['invited', 'active', 'suspended', 'left'])],
        ]);

        $this->usage->assertCanAddUser($tenant);

        $existingMembership = TenantUser::query()
            ->where('tenant_id', $tenantId)
            ->whereHas('user', fn ($q) => $q->where('email', $data['email']))
            ->first();

        if ($existingMembership) {
            throw ValidationException::withMessages([
                'email' => ['This user is already a member of the tenant.'],
            ]);
        }

        $generatedPassword = null;

        $result = DB::transaction(function () use ($data, $tenant, $tenantId, &$generatedPassword) {
            $user = User::query()->where('email', $data['email'])->first();
            $isNewUser = false;

            if ($user === null) {
                $isNewUser = true;
                $plainPassword = $data['password'] ?? Str::password(12);
                $generatedPassword = empty($data['password']) ? $plainPassword : null;

                $user = User::query()->create([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => $plainPassword,
                ]);
            } elseif (! empty($data['password'])) {
                $user->forceFill([
                    'password' => $data['password'],
                    'name' => $data['name'],
                ])->save();
            } else {
                $user->forceFill(['name' => $data['name']])->save();
            }

            $status = $data['status'] ?? 'active';

            $membership = TenantUser::query()->create([
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'status' => $status,
                'is_owner' => false,
                'job_title' => $data['job_title'] ?? null,
                'invited_at' => now(),
                'joined_at' => $status === 'active' ? now() : null,
            ]);

            $roleId = $data['role_id'] ?? Role::query()
                ->whereNull('tenant_id')
                ->where('code', 'viewer')
                ->value('id');

            if ($roleId) {
                TenantUserRole::query()->create([
                    'tenant_id' => $tenantId,
                    'tenant_user_id' => $membership->id,
                    'role_id' => $roleId,
                    'project_id' => null,
                ]);
            }

            $this->audit->record([
                'module' => 'identity',
                'action' => 'user_invited',
                'entity_type' => 'tenant_user',
                'entity_id' => $membership->id,
                'description' => 'Invited user '.$user->email.' to tenant '.$tenant->name,
                'new' => [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'status' => $membership->status,
                    'role_id' => $roleId,
                    'is_new_user' => $isNewUser,
                ],
                'notify' => false,
            ]);

            return $membership->load(['user:id,uuid,name,email,phone,last_login_at', 'roleAssignments.role']);
        });

        return response()->json([
            'message' => 'User invited.',
            'membership' => $result,
            'generated_password' => $generatedPassword,
        ], 201);
    }

    public function update(Request $request, TenantUser $membership): JsonResponse
    {
        $tenantId = $this->tenants->id();

        if ((int) $membership->tenant_id !== (int) $tenantId) {
            return response()->json(['message' => 'Membership does not belong to the current tenant.'], 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:120'],
            'status' => ['sometimes', Rule::in(['invited', 'active', 'suspended', 'left'])],
            'role_ids' => ['sometimes', 'array'],
            'role_ids.*' => [
                'integer',
                Rule::exists('roles', 'id')->where(function ($q) use ($tenantId) {
                    $q->where(function ($inner) use ($tenantId) {
                        $inner->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
                    });
                }),
            ],
        ]);

        if ($membership->is_owner && array_key_exists('status', $data) && $data['status'] === 'suspended') {
            throw ValidationException::withMessages([
                'status' => ['Cannot suspend the tenant owner.'],
            ]);
        }

        if ($membership->is_owner && array_key_exists('role_ids', $data)) {
            throw ValidationException::withMessages([
                'role_ids' => ['Cannot change roles for the tenant owner.'],
            ]);
        }

        $updated = DB::transaction(function () use ($membership, $data, $tenantId) {
            $old = [
                'status' => $membership->status,
                'job_title' => $membership->job_title,
                'name' => $membership->user?->name,
                'role_ids' => $membership->roleAssignments()
                    ->whereNull('project_id')
                    ->pluck('role_id')
                    ->all(),
            ];

            if (array_key_exists('job_title', $data)) {
                $membership->job_title = $data['job_title'];
            }

            if (array_key_exists('status', $data)) {
                $membership->status = $data['status'];
                if ($data['status'] === 'active' && $membership->joined_at === null) {
                    $membership->joined_at = now();
                }
            }

            $membership->save();

            if (array_key_exists('name', $data) && $membership->user) {
                $membership->user->forceFill(['name' => $data['name']])->save();
            }

            if (array_key_exists('role_ids', $data)) {
                TenantUserRole::query()
                    ->where('tenant_user_id', $membership->id)
                    ->whereNull('project_id')
                    ->delete();

                foreach (array_values(array_unique($data['role_ids'])) as $roleId) {
                    TenantUserRole::query()->create([
                        'tenant_id' => $tenantId,
                        'tenant_user_id' => $membership->id,
                        'role_id' => $roleId,
                        'project_id' => null,
                    ]);
                }
            }

            $fresh = $membership->fresh()->load(['user:id,uuid,name,email,phone,last_login_at', 'roleAssignments.role']);

            $this->audit->record([
                'module' => 'identity',
                'action' => 'user_updated',
                'entity_type' => 'tenant_user',
                'entity_id' => $membership->id,
                'description' => 'Updated tenant membership #'.$membership->id,
                'old' => $old,
                'new' => [
                    'status' => $fresh->status,
                    'job_title' => $fresh->job_title,
                    'name' => $fresh->user?->name,
                    'role_ids' => $fresh->roleAssignments
                        ->whereNull('project_id')
                        ->pluck('role_id')
                        ->values()
                        ->all(),
                ],
                'notify' => false,
            ]);

            return $fresh;
        });

        return response()->json([
            'message' => 'Membership updated.',
            'membership' => $updated,
        ]);
    }
}
