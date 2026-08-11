<?php

namespace App\Core\Tenant\Controllers;

use App\Core\SaaS\Models\Subscription;
use App\Core\SaaS\Services\UsageLimitService;
use App\Core\Tenant\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantSettingsController
{
    public function __construct(
        private TenantManager $tenants,
        private UsageLimitService $usage,
    ) {}

    public function branding(Request $request): JsonResponse
    {
        $tenant = $this->tenants->tenant();

        return response()->json([
            'tenant' => [
                'id' => $tenant->id,
                'uuid' => $tenant->uuid,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'brand_name' => $tenant->brand_name,
                'primary_color' => $tenant->primary_color,
                'accent_color' => $tenant->accent_color,
                'logo_url' => $tenant->logo_url,
            ],
        ]);
    }

    public function updateBranding(Request $request): JsonResponse
    {
        $tenant = $this->tenants->tenant();

        $data = $request->validate([
            'brand_name' => ['nullable', 'string', 'max:120'],
            'primary_color' => ['nullable', 'string', 'max:20'],
            'accent_color' => ['nullable', 'string', 'max:20'],
            'logo_url' => ['nullable', 'string', 'max:500'],
        ]);

        $tenant->update($data);

        return response()->json([
            'message' => 'Branding updated.',
            'tenant' => [
                'id' => $tenant->id,
                'uuid' => $tenant->uuid,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'brand_name' => $tenant->brand_name,
                'primary_color' => $tenant->primary_color,
                'accent_color' => $tenant->accent_color,
                'logo_url' => $tenant->logo_url,
            ],
        ]);
    }

    public function usage(Request $request): JsonResponse
    {
        $tenant = $this->tenants->tenant();

        return response()->json([
            'usage' => $this->usage->snapshot($tenant),
        ]);
    }

    public function subscription(Request $request): JsonResponse
    {
        $tenant = $this->tenants->tenant();

        $subscription = Subscription::query()
            ->with('plan')
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('id')
            ->first();

        return response()->json([
            'subscription' => $subscription,
        ]);
    }
}
