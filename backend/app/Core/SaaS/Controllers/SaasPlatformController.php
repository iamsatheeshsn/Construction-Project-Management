<?php

namespace App\Core\SaaS\Controllers;

use App\Core\Audit\Models\AuditLog;
use App\Core\SaaS\Models\SaasInvoice;
use App\Core\SaaS\Models\Subscription;
use App\Core\SaaS\Models\SubscriptionPlan;
use App\Core\SaaS\Models\TenantFeature;
use App\Core\SaaS\Services\TenantProvisioner;
use App\Core\SaaS\Services\UsageLimitService;
use App\Core\Tenant\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SaasPlatformController
{
    public function __construct(
        private TenantProvisioner $provisioner,
        private UsageLimitService $usage,
    ) {}

    public function tenants(Request $request): JsonResponse
    {
        $tenants = Tenant::query()
            ->with(['subscriptions' => fn ($q) => $q->with('plan')->latest('id')->limit(1)])
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', $term)
                        ->orWhere('slug', 'like', $term)
                        ->orWhere('legal_name', 'like', $term);
                });
            })
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        $tenants->getCollection()->transform(function (Tenant $tenant) {
            $sub = $tenant->subscriptions->first();
            return [
                'id' => $tenant->id,
                'uuid' => $tenant->uuid,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'legal_name' => $tenant->legal_name,
                'status' => $tenant->status,
                'trial_ends_at' => optional($tenant->trial_ends_at)?->toIso8601String(),
                'default_currency' => $tenant->default_currency,
                'brand_name' => $tenant->brand_name,
                'primary_color' => $tenant->primary_color,
                'accent_color' => $tenant->accent_color,
                'logo_url' => $tenant->logo_url,
                'created_at' => optional($tenant->created_at)?->toIso8601String(),
                'subscription' => $sub ? [
                    'id' => $sub->id,
                    'status' => $sub->status,
                    'billing_cycle' => $sub->billing_cycle,
                    'starts_at' => optional($sub->starts_at)?->toDateString(),
                    'ends_at' => optional($sub->ends_at)?->toDateString(),
                    'plan' => $sub->plan ? [
                        'id' => $sub->plan->id,
                        'code' => $sub->plan->code,
                        'name' => $sub->plan->name,
                    ] : null,
                ] : null,
                'usage' => $this->usage->snapshot($tenant),
            ];
        });

        return response()->json($tenants);
    }

    public function registerTenant(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:100', 'alpha_dash', 'unique:tenants,slug'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:8'],
            'plan_code' => ['nullable', 'string', Rule::exists('subscription_plans', 'code')],
            'trial_days' => ['nullable', 'integer', 'min:1', 'max:90'],
            'billing_cycle' => ['nullable', Rule::in(['monthly', 'yearly'])],
            'country_code' => ['nullable', 'string', 'size:2'],
            'default_currency' => ['nullable', 'string', 'size:3'],
            'brand_name' => ['nullable', 'string', 'max:120'],
            'primary_color' => ['nullable', 'string', 'max:20'],
            'accent_color' => ['nullable', 'string', 'max:20'],
        ]);

        $result = $this->provisioner->provision($data, $request->user());

        return response()->json([
            'message' => 'Tenant registered successfully.',
            'tenant' => $result['tenant'],
            'owner' => [
                'id' => $result['owner']->id,
                'name' => $result['owner']->name,
                'email' => $result['owner']->email,
            ],
            'subscription' => $result['subscription'],
            'generated_password' => $result['generated_password'],
        ], 201);
    }

    public function updateTenant(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['trial', 'active', 'suspended', 'cancelled'])],
            'trial_ends_at' => ['nullable', 'date'],
            'default_currency' => ['nullable', 'string', 'size:3'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'brand_name' => ['nullable', 'string', 'max:120'],
            'primary_color' => ['nullable', 'string', 'max:20'],
            'accent_color' => ['nullable', 'string', 'max:20'],
            'logo_url' => ['nullable', 'string', 'max:500'],
        ]);

        $tenant->update($data);

        return response()->json(['message' => 'Tenant updated.', 'tenant' => $tenant->fresh()]);
    }

    public function plans(Request $request): JsonResponse
    {
        $plans = SubscriptionPlan::query()
            ->when($request->boolean('active_only'), fn ($q) => $q->where('is_active', true))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $plans]);
    }

    public function storePlan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:subscription_plans,code'],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'price_yearly' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'max_projects' => ['nullable', 'integer', 'min:1'],
            'max_users' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer'],
        ]);

        $plan = SubscriptionPlan::query()->create($data + [
            'currency' => $data['currency'] ?? 'AED',
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return response()->json(['message' => 'Plan created.', 'plan' => $plan], 201);
    }

    public function updatePlan(Request $request, SubscriptionPlan $plan): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'price_monthly' => ['sometimes', 'numeric', 'min:0'],
            'price_yearly' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'max_projects' => ['nullable', 'integer', 'min:1'],
            'max_users' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer'],
        ]);

        $plan->update($data);

        return response()->json(['message' => 'Plan updated.', 'plan' => $plan->fresh()]);
    }

    public function trials(Request $request): JsonResponse
    {
        $trials = Tenant::query()
            ->where(function ($q) {
                $q->where('status', 'trial')
                    ->orWhereHas('subscriptions', fn ($s) => $s->where('status', 'trialing'));
            })
            ->with(['subscriptions' => fn ($q) => $q->with('plan')->latest('id')->limit(1)])
            ->orderBy('trial_ends_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return response()->json($trials);
    }

    public function extendTrial(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'days' => ['required', 'integer', 'min:1', 'max:90'],
        ]);

        $base = $tenant->trial_ends_at && $tenant->trial_ends_at->isFuture()
            ? $tenant->trial_ends_at
            : now();

        $tenant->update([
            'status' => 'trial',
            'trial_ends_at' => $base->copy()->addDays($data['days']),
        ]);

        Subscription::query()
            ->where('tenant_id', $tenant->id)
            ->whereIn('status', ['trialing', 'expired'])
            ->latest('id')
            ->limit(1)
            ->update([
                'status' => 'trialing',
                'ends_at' => $tenant->trial_ends_at->toDateString(),
            ]);

        return response()->json(['message' => 'Trial extended.', 'tenant' => $tenant->fresh()]);
    }

    public function convertTrial(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'plan_code' => ['nullable', 'string', Rule::exists('subscription_plans', 'code')],
            'billing_cycle' => ['nullable', Rule::in(['monthly', 'yearly'])],
        ]);

        $plan = SubscriptionPlan::query()
            ->where('code', $data['plan_code'] ?? 'professional')
            ->firstOrFail();

        $cycle = $data['billing_cycle'] ?? 'monthly';
        $amount = $cycle === 'yearly' ? $plan->price_yearly : $plan->price_monthly;

        $subscription = DB::transaction(function () use ($tenant, $plan, $cycle, $amount) {
            $subscription = Subscription::query()->create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'status' => 'active',
                'billing_cycle' => $cycle,
                'starts_at' => now()->toDateString(),
                'ends_at' => $cycle === 'yearly' ? now()->addYear()->toDateString() : now()->addMonth()->toDateString(),
            ]);

            Subscription::query()
                ->where('tenant_id', $tenant->id)
                ->where('id', '!=', $subscription->id)
                ->whereIn('status', ['trialing', 'active'])
                ->update(['status' => 'cancelled', 'cancelled_at' => now()]);

            SaasInvoice::query()->create([
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'invoice_number' => 'INV-'.$tenant->id.'-'.now()->format('YmdHis'),
                'amount' => $amount,
                'currency' => $plan->currency,
                'status' => 'open',
                'period_start' => $subscription->starts_at,
                'period_end' => $subscription->ends_at,
                'due_at' => now()->addDays(14)->toDateString(),
                'notes' => 'Converted from trial to '.$plan->name,
            ]);

            $tenant->update(['status' => 'active']);

            return $subscription->load('plan');
        });

        return response()->json(['message' => 'Trial converted to paid subscription.', 'subscription' => $subscription]);
    }

    public function billing(Request $request): JsonResponse
    {
        $invoices = SaasInvoice::query()
            ->with(['tenant:id,name,slug', 'subscription.plan:id,code,name'])
            ->when($request->filled('tenant_id'), fn ($q) => $q->where('tenant_id', $request->integer('tenant_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return response()->json($invoices);
    }

    public function markInvoicePaid(SaasInvoice $invoice): JsonResponse
    {
        $invoice->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        return response()->json(['message' => 'Invoice marked paid.', 'invoice' => $invoice->fresh()]);
    }

    public function createInvoice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'integer', 'exists:tenants,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'notes' => ['nullable', 'string'],
            'due_at' => ['nullable', 'date'],
        ]);

        $subscription = Subscription::query()
            ->where('tenant_id', $data['tenant_id'])
            ->latest('id')
            ->first();

        $invoice = SaasInvoice::query()->create([
            'tenant_id' => $data['tenant_id'],
            'subscription_id' => $subscription?->id,
            'invoice_number' => 'INV-'.$data['tenant_id'].'-'.now()->format('YmdHis'),
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? 'AED',
            'status' => 'open',
            'period_start' => now()->toDateString(),
            'period_end' => now()->addMonth()->toDateString(),
            'due_at' => $data['due_at'] ?? now()->addDays(14)->toDateString(),
            'notes' => $data['notes'] ?? null,
        ]);

        return response()->json(['message' => 'Invoice created.', 'invoice' => $invoice], 201);
    }

    public function features(Request $request): JsonResponse
    {
        $features = TenantFeature::query()
            ->with('tenant:id,name,slug')
            ->when($request->filled('tenant_id'), fn ($q) => $q->where('tenant_id', $request->integer('tenant_id')))
            ->when($request->filled('is_enabled'), function ($q) use ($request) {
                $raw = $request->input('is_enabled');
                $enabled = filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($enabled !== null) {
                    $q->where('is_enabled', $enabled);
                }
            })
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('feature_key', 'like', $term)
                        ->orWhereHas('tenant', function ($tq) use ($term) {
                            $tq->where('name', 'like', $term)->orWhere('slug', 'like', $term);
                        });
                });
            })
            ->orderBy('tenant_id')
            ->orderBy('feature_key')
            ->paginate(min((int) $request->integer('per_page', 20), 100));

        return response()->json($features);
    }

    public function upsertFeature(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'integer', 'exists:tenants,id'],
            'feature_key' => ['required', 'string', 'max:100'],
            'is_enabled' => ['required', 'boolean'],
            'limits_json' => ['nullable', 'array'],
        ]);

        $feature = TenantFeature::query()->updateOrCreate(
            ['tenant_id' => $data['tenant_id'], 'feature_key' => $data['feature_key']],
            ['is_enabled' => $data['is_enabled'], 'limits_json' => $data['limits_json'] ?? null]
        );

        return response()->json(['message' => 'Feature saved.', 'feature' => $feature]);
    }

    public function branding(Request $request): JsonResponse
    {
        $tenants = Tenant::query()
            ->select(['id', 'name', 'slug', 'brand_name', 'primary_color', 'accent_color', 'logo_url', 'status'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', $term)
                        ->orWhere('brand_name', 'like', $term)
                        ->orWhere('slug', 'like', $term);
                });
            })
            ->orderBy('name')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return response()->json($tenants);
    }

    public function updateBranding(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'brand_name' => ['nullable', 'string', 'max:120'],
            'primary_color' => ['nullable', 'string', 'max:20'],
            'accent_color' => ['nullable', 'string', 'max:20'],
            'logo_url' => ['nullable', 'string', 'max:500'],
        ]);

        $tenant->update($data);

        return response()->json(['message' => 'Branding updated.', 'tenant' => $tenant->fresh()]);
    }

    public function usage(Request $request): JsonResponse
    {
        $tenants = Tenant::query()->orderBy('name')->get();
        $rows = $tenants->map(fn (Tenant $t) => [
            'tenant' => [
                'id' => $t->id,
                'name' => $t->name,
                'slug' => $t->slug,
                'status' => $t->status,
            ],
            'usage' => $this->usage->snapshot($t),
        ]);

        return response()->json(['data' => $rows]);
    }

    public function assignPlan(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'plan_code' => ['required', 'string', Rule::exists('subscription_plans', 'code')],
            'billing_cycle' => ['nullable', Rule::in(['monthly', 'yearly'])],
            'status' => ['nullable', Rule::in(['trialing', 'active', 'past_due', 'cancelled', 'expired'])],
        ]);

        $plan = SubscriptionPlan::query()->where('code', $data['plan_code'])->firstOrFail();
        $cycle = $data['billing_cycle'] ?? 'monthly';

        $subscription = Subscription::query()->create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => $data['status'] ?? 'active',
            'billing_cycle' => $cycle,
            'starts_at' => now()->toDateString(),
            'ends_at' => $cycle === 'yearly' ? now()->addYear()->toDateString() : now()->addMonth()->toDateString(),
        ]);

        Subscription::query()
            ->where('tenant_id', $tenant->id)
            ->where('id', '!=', $subscription->id)
            ->whereIn('status', ['trialing', 'active'])
            ->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        if (($data['status'] ?? 'active') === 'active' && $tenant->status === 'trial') {
            $tenant->update(['status' => 'active']);
        }

        return response()->json([
            'message' => 'Plan assigned.',
            'subscription' => $subscription->load('plan'),
            'usage' => $this->usage->snapshot($tenant->fresh()),
        ]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $logs = AuditLog::query()
            ->withoutGlobalScopes()
            ->with([
                'user:id,name,email',
                'tenant:id,name,slug,status',
            ])
            ->when($request->filled('tenant_id'), fn ($q) => $q->where('tenant_id', $request->integer('tenant_id')))
            ->when($request->filled('module'), fn ($q) => $q->where('module', $request->string('module')))
            ->when($request->filled('action'), fn ($q) => $q->where('action', $request->string('action')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('module', 'like', $term)
                        ->orWhere('action', 'like', $term)
                        ->orWhere('entity_type', 'like', $term)
                        ->orWhere('ip_address', 'like', $term)
                        ->orWhereHas('user', function ($uq) use ($term) {
                            $uq->where('name', 'like', $term)->orWhere('email', 'like', $term);
                        })
                        ->orWhereHas('tenant', function ($tq) use ($term) {
                            $tq->where('name', 'like', $term)->orWhere('slug', 'like', $term);
                        });
                });
            })
            ->orderByDesc('id')
            ->paginate(min((int) $request->integer('per_page', 15), 100));

        return response()->json($logs);
    }
}
