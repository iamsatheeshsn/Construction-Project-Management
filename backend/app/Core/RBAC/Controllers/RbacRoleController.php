<?php

namespace App\Core\RBAC\Controllers;

use App\Core\Audit\Services\AuditTrail;
use App\Core\RBAC\Models\Role;
use App\Core\Tenant\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RbacRoleController
{
    public function __construct(
        private TenantManager $tenants,
        private AuditTrail $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->tenants->id();

        $roles = Role::query()
            ->with('permissions:id,code,name,module')
            ->where(function ($q) use ($tenantId) {
                $q->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
            })
            ->when($request->filled('scope'), fn ($q) => $q->where('scope', $request->string('scope')))
            ->orderByRaw('CASE WHEN tenant_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $roles]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->tenants->id();

        $data = $request->validate([
            'code' => [
                'required',
                'string',
                'max:80',
                'alpha_dash',
                Rule::unique('roles', 'code')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'scope' => ['nullable', Rule::in(['tenant', 'project'])],
            'permission_ids' => ['nullable', 'array'],
            'permission_ids.*' => ['integer', 'exists:permissions,id'],
        ]);

        $role = DB::transaction(function () use ($data, $tenantId) {
            $role = Role::query()->create([
                'tenant_id' => $tenantId,
                'code' => $data['code'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'scope' => $data['scope'] ?? 'tenant',
                'is_system' => false,
            ]);

            if (! empty($data['permission_ids'])) {
                $role->permissions()->sync($data['permission_ids']);
            }

            $this->audit->record([
                'module' => 'identity',
                'action' => 'role_created',
                'entity_type' => 'role',
                'entity_id' => $role->id,
                'description' => 'Created role '.$role->code,
                'new' => [
                    'code' => $role->code,
                    'name' => $role->name,
                    'permission_ids' => $data['permission_ids'] ?? [],
                ],
                'notify' => false,
            ]);

            return $role->load('permissions:id,code,name,module');
        });

        return response()->json([
            'message' => 'Role created.',
            'role' => $role,
        ], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $tenantId = $this->tenants->id();

        if ($role->tenant_id !== null && (int) $role->tenant_id !== (int) $tenantId) {
            return response()->json(['message' => 'Role not found.'], 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'scope' => ['sometimes', Rule::in(['tenant', 'project'])],
            'permission_ids' => ['sometimes', 'array'],
            'permission_ids.*' => ['integer', 'exists:permissions,id'],
        ]);

        // Non-super-admins cannot mutate system templates — clone into a tenant custom role.
        if ($role->is_system && ! $request->user()->is_super_admin) {
            $clone = DB::transaction(function () use ($role, $data, $tenantId) {
                $clone = Role::query()->firstOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'code' => $role->code.'_custom',
                    ],
                    [
                        'name' => $data['name'] ?? ($role->name.' (Custom)'),
                        'description' => array_key_exists('description', $data)
                            ? $data['description']
                            : $role->description,
                        'scope' => $data['scope'] ?? $role->scope,
                        'is_system' => false,
                    ]
                );

                if (array_key_exists('name', $data)) {
                    $clone->name = $data['name'];
                }
                if (array_key_exists('description', $data)) {
                    $clone->description = $data['description'];
                }
                if (array_key_exists('scope', $data)) {
                    $clone->scope = $data['scope'];
                }
                $clone->save();

                if (array_key_exists('permission_ids', $data)) {
                    $clone->permissions()->sync($data['permission_ids'] ?? []);
                } elseif ($clone->wasRecentlyCreated) {
                    $clone->permissions()->sync(
                        $role->permissions()->pluck('permissions.id')->all()
                    );
                }

                $this->audit->record([
                    'module' => 'identity',
                    'action' => 'role_cloned',
                    'entity_type' => 'role',
                    'entity_id' => $clone->id,
                    'description' => 'Cloned system role '.$role->code.' to '.$clone->code,
                    'new' => [
                        'source_role_id' => $role->id,
                        'code' => $clone->code,
                        'name' => $clone->name,
                    ],
                    'notify' => false,
                ]);

                return $clone->load('permissions:id,code,name,module');
            });

            return response()->json([
                'message' => 'Custom role created from system role.',
                'role' => $clone,
                'cloned_from' => $role->only(['id', 'code', 'name']),
            ]);
        }

        $updated = DB::transaction(function () use ($role, $data) {
            $old = [
                'name' => $role->name,
                'description' => $role->description,
                'scope' => $role->scope,
                'permission_ids' => $role->permissions()->pluck('permissions.id')->all(),
            ];

            $role->fill(collect($data)->only(['name', 'description', 'scope'])->all());
            $role->save();

            if (array_key_exists('permission_ids', $data)) {
                $role->permissions()->sync($data['permission_ids'] ?? []);
            }

            $this->audit->record([
                'module' => 'identity',
                'action' => 'role_updated',
                'entity_type' => 'role',
                'entity_id' => $role->id,
                'description' => 'Updated role '.$role->code,
                'old' => $old,
                'new' => [
                    'name' => $role->name,
                    'description' => $role->description,
                    'scope' => $role->scope,
                    'permission_ids' => $role->permissions()->pluck('permissions.id')->all(),
                ],
                'notify' => false,
            ]);

            return $role->fresh()->load('permissions:id,code,name,module');
        });

        return response()->json([
            'message' => 'Role updated.',
            'role' => $updated,
        ]);
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        $tenantId = $this->tenants->id();

        if ($role->is_system || $role->tenant_id === null) {
            throw ValidationException::withMessages([
                'role' => ['System roles cannot be deleted.'],
            ]);
        }

        if ((int) $role->tenant_id !== (int) $tenantId) {
            return response()->json(['message' => 'Role not found.'], 404);
        }

        DB::transaction(function () use ($role) {
            $this->audit->record([
                'module' => 'identity',
                'action' => 'role_deleted',
                'entity_type' => 'role',
                'entity_id' => $role->id,
                'description' => 'Deleted role '.$role->code,
                'old' => $role->only(['id', 'code', 'name', 'tenant_id']),
                'notify' => false,
            ]);

            $role->permissions()->detach();
            $role->delete();
        });

        return response()->json(['message' => 'Role deleted.']);
    }
}
