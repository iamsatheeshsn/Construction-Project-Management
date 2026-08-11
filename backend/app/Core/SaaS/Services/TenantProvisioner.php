<?php

namespace App\Core\SaaS\Services;

use App\Core\RBAC\Models\Role;
use App\Core\RBAC\Models\TenantUser;
use App\Core\RBAC\Models\TenantUserRole;
use App\Core\SaaS\Models\SaasInvoice;
use App\Core\SaaS\Models\Subscription;
use App\Core\SaaS\Models\SubscriptionPlan;
use App\Core\SaaS\Models\TenantFeature;
use App\Core\Tenant\Models\Tenant;
use App\Models\User;
use App\Modules\Organization\Models\Company;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TenantProvisioner
{
    public const DEFAULT_FEATURES = [
        'procurement', 'inventory', 'equipment', 'subcontractors',
        'documents', 'billing', 'gantt', 'audit',
    ];

    public function provision(array $data, ?User $actor = null): array
    {
        return DB::transaction(function () use ($data, $actor) {
            $trialDays = (int) ($data['trial_days'] ?? 14);
            $planCode = $data['plan_code'] ?? 'starter';

            $tenant = Tenant::query()->create([
                'name' => $data['company_name'],
                'slug' => $data['slug'] ?? null,
                'legal_name' => $data['legal_name'] ?? $data['company_name'],
                'country_code' => $data['country_code'] ?? 'AE',
                'default_currency' => $data['default_currency'] ?? 'AED',
                'timezone' => $data['timezone'] ?? 'Asia/Dubai',
                'locale' => $data['locale'] ?? 'en',
                'status' => 'trial',
                'trial_ends_at' => now()->addDays($trialDays),
                'brand_name' => $data['brand_name'] ?? $data['company_name'],
                'primary_color' => $data['primary_color'] ?? '#1F4E79',
                'accent_color' => $data['accent_color'] ?? '#C47A11',
            ]);

            $password = $data['password'] ?? Str::password(12);
            $owner = User::query()->firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make($password),
                ]
            );

            if (! $owner->wasRecentlyCreated && ! empty($data['password'])) {
                $owner->update(['password' => Hash::make($data['password']), 'name' => $data['name']]);
            }

            $membership = TenantUser::query()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $owner->id,
                'status' => 'active',
                'is_owner' => true,
                'job_title' => $data['job_title'] ?? 'Owner',
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

            TenantUserRole::query()->create([
                'tenant_id' => $tenant->id,
                'tenant_user_id' => $membership->id,
                'role_id' => $ownerRole->id,
                'project_id' => null,
            ]);

            Company::query()->create([
                'tenant_id' => $tenant->id,
                'name' => $tenant->name,
                'legal_name' => $tenant->legal_name,
                'country_code' => $tenant->country_code,
                'is_primary' => true,
            ]);

            $plan = SubscriptionPlan::query()->where('code', $planCode)->first()
                ?? SubscriptionPlan::query()->where('code', 'starter')->first();

            $subscription = null;
            if ($plan) {
                $subscription = Subscription::query()->create([
                    'tenant_id' => $tenant->id,
                    'plan_id' => $plan->id,
                    'status' => 'trialing',
                    'billing_cycle' => $data['billing_cycle'] ?? 'monthly',
                    'starts_at' => now()->toDateString(),
                    'ends_at' => now()->addDays($trialDays)->toDateString(),
                ]);

                SaasInvoice::query()->create([
                    'tenant_id' => $tenant->id,
                    'subscription_id' => $subscription->id,
                    'invoice_number' => 'INV-TRIAL-'.$tenant->id.'-'.now()->format('Ymd'),
                    'amount' => 0,
                    'currency' => $plan->currency,
                    'status' => 'paid',
                    'period_start' => now()->toDateString(),
                    'period_end' => now()->addDays($trialDays)->toDateString(),
                    'due_at' => now()->toDateString(),
                    'paid_at' => now(),
                    'notes' => 'Trial period — no charge',
                ]);
            }

            foreach (self::DEFAULT_FEATURES as $feature) {
                TenantFeature::query()->create([
                    'tenant_id' => $tenant->id,
                    'feature_key' => $feature,
                    'is_enabled' => true,
                ]);
            }

            return [
                'tenant' => $tenant->fresh(),
                'owner' => $owner->fresh(),
                'subscription' => $subscription?->load('plan'),
                'generated_password' => $owner->wasRecentlyCreated ? $password : null,
            ];
        });
    }
}
