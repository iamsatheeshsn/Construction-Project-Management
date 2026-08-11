<?php

namespace App\Core\RBAC\Controllers;

use App\Core\Audit\Services\AuditTrail;
use App\Core\RBAC\Models\AccessPolicy;
use App\Core\Tenant\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RbacPolicyController
{
    public function __construct(
        private TenantManager $tenants,
        private AuditTrail $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->tenants->id();

        $policies = AccessPolicy::query()
            ->where(function ($q) use ($tenantId) {
                $q->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
            })
            ->when($request->filled('scope'), fn ($q) => $q->where('scope', $request->string('scope')))
            ->when($request->has('active'), function ($q) use ($request) {
                $q->where('is_active', $request->boolean('active'));
            })
            ->orderByRaw('CASE WHEN tenant_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $policies]);
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
                Rule::unique('access_policies', 'code')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
            'effect' => ['required', Rule::in(['allow', 'deny'])],
            'scope' => ['required', Rule::in(['tenant', 'project'])],
            'permission_codes' => ['nullable', 'array'],
            'permission_codes.*' => ['string', 'max:120'],
            'conditions_json' => ['nullable', 'array'],
            'is_active' => ['boolean'],
        ]);

        $policy = DB::transaction(function () use ($data, $tenantId) {
            $policy = AccessPolicy::query()->create([
                'tenant_id' => $tenantId,
                'code' => $data['code'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'effect' => $data['effect'],
                'scope' => $data['scope'],
                'permission_codes' => $data['permission_codes'] ?? [],
                'conditions_json' => $data['conditions_json'] ?? null,
                'is_active' => $data['is_active'] ?? true,
                'is_system' => false,
            ]);

            $this->audit->record([
                'module' => 'identity',
                'action' => 'policy_created',
                'entity_type' => 'access_policy',
                'entity_id' => $policy->id,
                'description' => 'Created access policy '.$policy->code,
                'new' => $policy->toArray(),
                'notify' => false,
            ]);

            return $policy;
        });

        return response()->json([
            'message' => 'Access policy created.',
            'policy' => $policy,
        ], 201);
    }

    public function update(Request $request, AccessPolicy $policy): JsonResponse
    {
        $tenantId = $this->tenants->id();
        $isSuperAdmin = (bool) $request->user()?->is_super_admin;

        if ($policy->is_system && ! $isSuperAdmin) {
            throw ValidationException::withMessages([
                'policy' => ['Platform system policies cannot be edited.'],
            ]);
        }

        if ($policy->tenant_id !== null && (int) $policy->tenant_id !== (int) $tenantId && ! $isSuperAdmin) {
            return response()->json(['message' => 'Policy not found.'], 404);
        }

        if ($policy->tenant_id === null && ! $isSuperAdmin) {
            throw ValidationException::withMessages([
                'policy' => ['Platform policies cannot be edited.'],
            ]);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
            'effect' => ['sometimes', Rule::in(['allow', 'deny'])],
            'scope' => ['sometimes', Rule::in(['tenant', 'project', 'platform'])],
            'permission_codes' => ['nullable', 'array'],
            'permission_codes.*' => ['string', 'max:120'],
            'conditions_json' => ['nullable', 'array'],
            'is_active' => ['boolean'],
        ]);

        $updated = DB::transaction(function () use ($policy, $data) {
            $old = $policy->toArray();
            $policy->fill($data);
            $policy->save();

            $this->audit->record([
                'module' => 'identity',
                'action' => 'policy_updated',
                'entity_type' => 'access_policy',
                'entity_id' => $policy->id,
                'description' => 'Updated access policy '.$policy->code,
                'old' => $old,
                'new' => $policy->fresh()->toArray(),
                'notify' => false,
            ]);

            return $policy->fresh();
        });

        return response()->json([
            'message' => 'Access policy updated.',
            'policy' => $updated,
        ]);
    }

    public function destroy(Request $request, AccessPolicy $policy): JsonResponse
    {
        $tenantId = $this->tenants->id();

        if ($policy->is_system || $policy->tenant_id === null) {
            throw ValidationException::withMessages([
                'policy' => ['System or platform policies cannot be deleted.'],
            ]);
        }

        if ((int) $policy->tenant_id !== (int) $tenantId) {
            return response()->json(['message' => 'Policy not found.'], 404);
        }

        DB::transaction(function () use ($policy) {
            $this->audit->record([
                'module' => 'identity',
                'action' => 'policy_deleted',
                'entity_type' => 'access_policy',
                'entity_id' => $policy->id,
                'description' => 'Deleted access policy '.$policy->code,
                'old' => $policy->only(['id', 'code', 'name', 'tenant_id']),
                'notify' => false,
            ]);

            $policy->delete();
        });

        return response()->json(['message' => 'Access policy deleted.']);
    }
}
