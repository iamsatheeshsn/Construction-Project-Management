<?php

namespace App\Core\RBAC\Controllers;

use App\Core\RBAC\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RbacPermissionController
{
    public function index(Request $request): JsonResponse
    {
        $permissions = Permission::query()
            ->when($request->filled('module'), fn ($q) => $q->where('module', $request->string('module')))
            ->orderBy('module')
            ->orderBy('code')
            ->get();

        return response()->json(['data' => $permissions]);
    }

    public function catalog(Request $request): JsonResponse
    {
        $permissions = Permission::query()
            ->when($request->filled('module'), fn ($q) => $q->where('module', $request->string('module')))
            ->orderBy('module')
            ->orderBy('code')
            ->get();

        $modules = $permissions
            ->groupBy('module')
            ->map(fn ($group) => $group->values())
            ->all();

        return response()->json([
            'modules' => $modules,
            'data' => $permissions,
        ]);
    }
}
