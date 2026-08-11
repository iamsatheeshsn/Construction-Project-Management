<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('brand_name', 120)->nullable()->after('locale');
            $table->string('primary_color', 20)->nullable()->after('brand_name');
            $table->string('accent_color', 20)->nullable()->after('primary_color');
            $table->string('logo_url', 500)->nullable()->after('accent_color');
        });

        Schema::create('saas_invoices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('subscription_id')->nullable();
            $table->string('invoice_number', 40);
            $table->decimal('amount', 12, 2)->default(0);
            $table->char('currency', 3)->default('AED');
            $table->enum('status', ['draft', 'open', 'paid', 'void', 'uncollectible'])->default('open');
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->date('due_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique('invoice_number');
            $table->index('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('subscription_id')->references('id')->on('subscriptions')->nullOnDelete();
        });

        Schema::create('access_policies', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->string('code', 80);
            $table->string('name', 160);
            $table->string('description', 500)->nullable();
            $table->enum('effect', ['allow', 'deny'])->default('allow');
            $table->enum('scope', ['platform', 'tenant', 'project'])->default('tenant');
            $table->json('permission_codes')->nullable();
            $table->json('conditions_json')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
            $table->foreign('tenant_id')->references('id')->on('tenants')->nullOnDelete();
        });

        // Realistic plan pricing for billing demos
        DB::table('subscription_plans')->where('code', 'starter')->update([
            'price_monthly' => 299,
            'price_yearly' => 2990,
            'updated_at' => now(),
        ]);
        DB::table('subscription_plans')->where('code', 'professional')->update([
            'price_monthly' => 799,
            'price_yearly' => 7990,
            'updated_at' => now(),
        ]);
        DB::table('subscription_plans')->where('code', 'enterprise')->update([
            'price_monthly' => 1999,
            'price_yearly' => 19990,
            'updated_at' => now(),
        ]);

        $now = now();
        $policies = [
            [
                'tenant_id' => null,
                'code' => 'owner_full_access',
                'name' => 'Owner full access',
                'description' => 'Tenant owners receive unrestricted workspace access.',
                'effect' => 'allow',
                'scope' => 'tenant',
                'permission_codes' => json_encode(['*']),
                'conditions_json' => json_encode(['requires_owner' => true]),
                'is_active' => 1,
                'is_system' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'tenant_id' => null,
                'code' => 'project_manager_ops',
                'name' => 'Project manager operations',
                'description' => 'Managers can run project delivery modules.',
                'effect' => 'allow',
                'scope' => 'project',
                'permission_codes' => json_encode([
                    'projects.view', 'projects.manage', 'wbs.view', 'wbs.manage',
                    'tasks.view', 'tasks.manage', 'procurement.view', 'procurement.manage',
                ]),
                'conditions_json' => json_encode(['role' => 'project_manager']),
                'is_active' => 1,
                'is_system' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'tenant_id' => null,
                'code' => 'viewer_read_only',
                'name' => 'Viewer read-only',
                'description' => 'Viewers may inspect records but cannot mutate.',
                'effect' => 'allow',
                'scope' => 'project',
                'permission_codes' => json_encode([
                    'projects.view', 'wbs.view', 'tasks.view', 'documents.view',
                ]),
                'conditions_json' => json_encode(['role' => 'viewer']),
                'is_active' => 1,
                'is_system' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($policies as $policy) {
            DB::table('access_policies')->updateOrInsert(
                ['tenant_id' => $policy['tenant_id'], 'code' => $policy['code']],
                $policy
            );
        }

        $defaultFeatures = [
            'procurement', 'inventory', 'equipment', 'subcontractors',
            'documents', 'billing', 'gantt', 'audit',
        ];

        $tenantIds = DB::table('tenants')->pluck('id');
        foreach ($tenantIds as $tenantId) {
            foreach ($defaultFeatures as $key) {
                DB::table('tenant_features')->updateOrInsert(
                    ['tenant_id' => $tenantId, 'feature_key' => $key],
                    [
                        'is_enabled' => 1,
                        'limits_json' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('access_policies');
        Schema::dropIfExists('saas_invoices');
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['brand_name', 'primary_color', 'accent_color', 'logo_url']);
        });
    }
};
