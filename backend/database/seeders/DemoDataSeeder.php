<?php

namespace Database\Seeders;

use App\Core\Audit\Models\AuditLog;
use App\Core\RBAC\Models\Permission;
use App\Core\RBAC\Models\Role;
use App\Core\RBAC\Models\TenantUser;
use App\Core\RBAC\Models\TenantUserRole;
use App\Core\SaaS\Models\SaasInvoice;
use App\Core\SaaS\Models\Subscription;
use App\Core\SaaS\Models\SubscriptionPlan;
use App\Core\SaaS\Models\TenantFeature;
use App\Core\Tenant\Models\Tenant;
use App\Core\Tenant\TenantManager;
use App\Models\User;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\PaymentApplication;
use App\Modules\Commercial\Models\Boq;
use App\Modules\Commercial\Models\BoqItem;
use App\Modules\Commercial\Models\Contract;
use App\Modules\Commercial\Models\CostCode;
use App\Modules\Commercial\Models\Variation;
use App\Modules\Documents\Models\Document;
use App\Modules\Equipment\Models\Equipment;
use App\Modules\Inventory\Models\InventoryItem;
use App\Modules\Inventory\Models\Warehouse;
use App\Modules\Organization\Models\Client;
use App\Modules\Organization\Models\Company;
use App\Modules\Planning\Models\Task;
use App\Modules\Planning\Models\WbsNode;
use App\Modules\Procurement\Models\MaterialRequest;
use App\Modules\Procurement\Models\PurchaseOrder;
use App\Modules\Procurement\Models\PurchaseRequest;
use App\Modules\Procurement\Models\Supplier;
use App\Modules\Projects\Models\Project;
use App\Modules\Projects\Models\ProjectMember;
use App\Modules\Site\Models\SiteDiary;
use App\Modules\Subcontractors\Models\Subcontractor;
use App\Modules\Workflow\Models\Rfi;
use App\Modules\Workflow\Models\Submittal;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Flush all business data (keep RBAC permissions/roles + plans/policies),
 * then seed demo tenants, role users, and ≥10 records per major page.
 */
class DemoDataSeeder extends Seeder
{
    public const PASSWORD = 'Password123!';

    public function run(): void
    {
        $this->command?->info('Flushing business data (keeping RBAC + plans/policies)…');
        $this->flushBusinessData();

        $this->command?->info('Ensuring RBAC + plans…');
        $this->call(RbacSeeder::class);
        $this->ensurePlans();

        $this->command?->info('Seeding SaaS admin…');
        $this->call(SuperAdminSeeder::class);

        $this->command?->info('Seeding tenants, users, and module data…');
        $tenants = $this->seedTenants();
        $primary = $tenants[0];

        $users = $this->seedUsersAndRoles($primary, $tenants);
        $this->seedPrimaryTenantData($primary, $users);
        $this->seedSaasExtras($tenants, $users['saas']);

        app(TenantManager::class)->forget();
        $this->command?->info('Demo data ready.');
    }

    protected function flushBusinessData(): void
    {
        $keep = [
            'permissions',
            'roles',
            'role_permissions',
            'access_policies',
            'subscription_plans',
            'migrations',
            'cache',
            'cache_locks',
            'jobs',
            'job_batches',
            'failed_jobs',
        ];

        $db = DB::getDatabaseName();
        $rows = DB::select('SHOW TABLES');
        $key = 'Tables_in_'.$db;
        $tables = collect($rows)->map(fn ($r) => $r->$key)->all();

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        foreach ($tables as $table) {
            if (in_array($table, $keep, true)) {
                continue;
            }
            DB::table($table)->truncate();
        }

        // Drop custom (tenant-scoped) roles; keep system templates.
        Role::query()->whereNotNull('tenant_id')->each(function (Role $role) {
            $role->permissions()->detach();
            $role->delete();
        });

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    protected function ensurePlans(): void
    {
        $defs = [
            ['code' => 'starter', 'name' => 'Starter', 'price_monthly' => 99, 'price_yearly' => 990, 'max_projects' => 5, 'max_users' => 10, 'sort_order' => 1],
            ['code' => 'professional', 'name' => 'Professional', 'price_monthly' => 249, 'price_yearly' => 2490, 'max_projects' => 25, 'max_users' => 50, 'sort_order' => 2],
            ['code' => 'enterprise', 'name' => 'Enterprise', 'price_monthly' => 599, 'price_yearly' => 5990, 'max_projects' => 0, 'max_users' => 0, 'sort_order' => 3],
            ['code' => 'trial_plus', 'name' => 'Trial Plus', 'price_monthly' => 0, 'price_yearly' => 0, 'max_projects' => 3, 'max_users' => 5, 'sort_order' => 4],
            ['code' => 'field_crew', 'name' => 'Field Crew', 'price_monthly' => 149, 'price_yearly' => 1490, 'max_projects' => 10, 'max_users' => 20, 'sort_order' => 5],
            ['code' => 'commercial_pro', 'name' => 'Commercial Pro', 'price_monthly' => 349, 'price_yearly' => 3490, 'max_projects' => 40, 'max_users' => 80, 'sort_order' => 6],
            ['code' => 'mega_projects', 'name' => 'Mega Projects', 'price_monthly' => 899, 'price_yearly' => 8990, 'max_projects' => 100, 'max_users' => 200, 'sort_order' => 7],
            ['code' => 'consultant', 'name' => 'Consultant', 'price_monthly' => 179, 'price_yearly' => 1790, 'max_projects' => 15, 'max_users' => 15, 'sort_order' => 8],
            ['code' => 'subcontractor', 'name' => 'Subcontractor Suite', 'price_monthly' => 129, 'price_yearly' => 1290, 'max_projects' => 8, 'max_users' => 12, 'sort_order' => 9],
            ['code' => 'enterprise_plus', 'name' => 'Enterprise Plus', 'price_monthly' => 999, 'price_yearly' => 9990, 'max_projects' => 0, 'max_users' => 0, 'sort_order' => 10],
        ];

        foreach ($defs as $def) {
            SubscriptionPlan::query()->updateOrCreate(
                ['code' => $def['code']],
                array_merge($def, [
                    'currency' => 'AED',
                    'is_active' => true,
                    'description' => $def['name'].' plan for Keystone workspaces.',
                ])
            );
        }
    }

    /** @return list<Tenant> */
    protected function seedTenants(): array
    {
        $manager = app(TenantManager::class);
        $plans = SubscriptionPlan::query()->orderBy('sort_order')->get();
        $names = [
            ['Desert Build LLC', 'desert-build'],
            ['Atlas Construct Co', 'atlas-construct'],
            ['Summit Structures LLC', 'summit-structures'],
            ['Gulf Works Contracting', 'gulf-works'],
            ['Oasis Infrastructure', 'oasis-infra'],
            ['Falcon Civil Group', 'falcon-civil'],
            ['Horizon MEP Services', 'horizon-mep'],
            ['Pearl Developments', 'pearl-dev'],
            ['Cedar Engineering', 'cedar-eng'],
            ['Marina Fitout Partners', 'marina-fitout'],
        ];

        $tenants = [];
        foreach ($names as $i => [$name, $slug]) {
            $status = match (true) {
                $i < 4 => 'active',
                $i < 7 => 'trial',
                $i === 7 => 'suspended',
                default => 'active',
            };

            $tenant = Tenant::query()->create([
                'name' => $name,
                'slug' => $slug,
                'legal_name' => $name,
                'country_code' => 'AE',
                'default_currency' => 'AED',
                'timezone' => 'Asia/Dubai',
                'locale' => 'en',
                'brand_name' => explode(' ', $name)[0],
                'primary_color' => '#1F4E79',
                'accent_color' => '#C47A11',
                'status' => $status,
                'trial_ends_at' => $status === 'trial' ? now()->addDays(14 - $i) : null,
            ]);

            $plan = $plans[$i % $plans->count()];
            Subscription::query()->create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'status' => $status === 'trial' ? 'trialing' : ($status === 'suspended' ? 'past_due' : 'active'),
                'billing_cycle' => $i % 2 === 0 ? 'monthly' : 'yearly',
                'starts_at' => now()->subMonths(2)->toDateString(),
                'ends_at' => now()->addYear()->toDateString(),
            ]);

            foreach (['projects', 'users', 'boq', 'documents', 'procurement'] as $feature) {
                TenantFeature::query()->create([
                    'tenant_id' => $tenant->id,
                    'feature_key' => $feature,
                    'is_enabled' => true,
                    'limits_json' => ['max' => 100],
                ]);
            }

            SaasInvoice::query()->create([
                'tenant_id' => $tenant->id,
                'subscription_id' => Subscription::query()->where('tenant_id', $tenant->id)->value('id'),
                'invoice_number' => sprintf('SAAS-%04d', $i + 1),
                'amount' => (float) $plan->price_monthly,
                'currency' => 'AED',
                'status' => $i % 3 === 0 ? 'paid' : 'open',
                'period_start' => now()->startOfMonth()->toDateString(),
                'period_end' => now()->endOfMonth()->toDateString(),
                'due_at' => now()->addDays(14)->toDateString(),
                'paid_at' => $i % 3 === 0 ? now() : null,
                'notes' => 'Demo SaaS invoice',
            ]);

            $tenants[] = $tenant;
        }

        $manager->forget();

        return $tenants;
    }

    /**
     * @param  list<Tenant>  $tenants
     * @return array{saas: User, owner: User, pm: User, viewer: User, supervisor: User}
     */
    protected function seedUsersAndRoles(Tenant $primary, array $tenants): array
    {
        $manager = app(TenantManager::class);
        $ownerRole = Role::query()->whereNull('tenant_id')->where('code', 'company_owner')->firstOrFail();
        $pmRole = Role::query()->whereNull('tenant_id')->where('code', 'project_manager')->firstOrFail();
        $viewerRole = Role::query()->whereNull('tenant_id')->where('code', 'viewer')->firstOrFail();

        $saas = User::query()->where('email', 'saas.admin@cpm.test')->firstOrFail();

        $owner = $this->makeUser('Desert Owner', 'owner@desertbuild.test');
        $pm = $this->makeUser('Desert Project Manager', 'pm@desertbuild.test');
        $viewer = $this->makeUser('Desert Viewer', 'viewer@desertbuild.test');
        $supervisor = $this->makeUser('Desert Site Supervisor', 'supervisor@desertbuild.test');

        // Primary tenant memberships
        $manager->set($primary);
        $this->attachMember($primary, $owner, $ownerRole, true, 'Managing Director');
        $this->attachMember($primary, $pm, $pmRole, false, 'Project Manager');
        $this->attachMember($primary, $viewer, $viewerRole, false, 'Viewer');

        // Custom Site Supervisor role on primary tenant
        $supervisorRole = Role::query()->create([
            'tenant_id' => $primary->id,
            'code' => 'site_supervisor',
            'name' => 'Site Supervisor',
            'description' => 'Site execution and diary access',
            'scope' => 'project',
            'is_system' => false,
        ]);
        $supervisorRole->permissions()->sync(
            Permission::query()->whereIn('code', [
                'projects.view',
                'wbs.view',
                'tasks.view',
                'tasks.manage',
                'site_diary.view',
                'site_diary.manage',
                'documents.view',
                'rfis.view',
                'rfis.manage',
                'submittals.view',
                'equipment.view',
                'inventory.view',
            ])->pluck('id')
        );
        $this->attachMember($primary, $supervisor, $supervisorRole, false, 'Site Supervisor');

        // Extra custom roles (≥ enough variety on Roles page when combined with system)
        foreach ([
            ['qs_engineer', 'QS Engineer', ['boq.view', 'boq.manage', 'contracts.view', 'variations.view', 'projects.view']],
            ['procurement_officer', 'Procurement Officer', ['procurement.view', 'procurement.manage', 'inventory.view', 'projects.view']],
            ['hse_officer', 'HSE Officer', ['site_diary.view', 'documents.view', 'projects.view']],
            ['document_controller', 'Document Controller', ['documents.view', 'documents.manage', 'submittals.view', 'projects.view']],
            ['commercial_manager', 'Commercial Manager', ['contracts.view', 'contracts.manage', 'variations.view', 'variations.manage', 'billing.view', 'projects.view']],
            ['planner', 'Planner', ['wbs.view', 'wbs.manage', 'tasks.view', 'tasks.manage', 'projects.view']],
        ] as [$code, $name, $permCodes]) {
            $permCodes = array_values(array_filter(
                $permCodes,
                fn ($c) => Permission::query()->where('code', $c)->exists()
            ));
            $role = Role::query()->create([
                'tenant_id' => $primary->id,
                'code' => $code,
                'name' => $name,
                'description' => $name.' demo role',
                'scope' => 'tenant',
                'is_system' => false,
            ]);
            $role->permissions()->sync(Permission::query()->whereIn('code', $permCodes)->pluck('id'));
        }

        // 10+ users on primary tenant for Users page
        for ($i = 1; $i <= 10; $i++) {
            $u = $this->makeUser("Team Member {$i}", sprintf('member%02d@desertbuild.test', $i));
            $this->attachMember($primary, $u, $i % 3 === 0 ? $pmRole : $viewerRole, false, 'Staff');
        }

        // Owners on other tenants (for multi-tenant SaaS browsing)
        foreach (array_slice($tenants, 1) as $idx => $tenant) {
            $manager->set($tenant);
            $email = sprintf('owner@%s.test', $tenant->slug);
            $u = $this->makeUser($tenant->name.' Owner', $email);
            $this->attachMember($tenant, $u, $ownerRole, true, 'Owner');
        }

        $manager->forget();

        return compact('saas', 'owner', 'pm', 'viewer', 'supervisor');
    }

    protected function makeUser(string $name, string $email): User
    {
        return User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => self::PASSWORD,
                'preferred_locale' => 'en',
                'is_super_admin' => false,
                'email_verified_at' => now(),
            ]
        );
    }

    protected function attachMember(Tenant $tenant, User $user, Role $role, bool $isOwner, string $title): TenantUser
    {
        $tu = TenantUser::query()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'status' => 'active',
            'is_owner' => $isOwner,
            'job_title' => $title,
            'joined_at' => now(),
        ]);

        TenantUserRole::query()->create([
            'tenant_id' => $tenant->id,
            'tenant_user_id' => $tu->id,
            'role_id' => $role->id,
            'project_id' => null,
        ]);

        return $tu;
    }

    /** @param  array{saas: User, owner: User, pm: User, viewer: User, supervisor: User}  $users */
    protected function seedPrimaryTenantData(Tenant $tenant, array $users): void
    {
        $manager = app(TenantManager::class);
        $manager->set($tenant);

        $companies = [];
        for ($i = 1; $i <= 10; $i++) {
            $companies[] = Company::query()->create([
                'name' => $i === 1 ? 'Desert Build LLC' : "Desert Entity {$i}",
                'legal_name' => $i === 1 ? 'Desert Build LLC' : "Desert Entity {$i} FZ-LLC",
                'email' => "company{$i}@desertbuild.test",
                'phone' => '+97150000'.sprintf('%04d', $i),
                'city' => ['Dubai', 'Abu Dhabi', 'Sharjah'][$i % 3],
                'country_code' => 'AE',
                'is_primary' => $i === 1,
            ]);
        }

        $clients = [];
        for ($i = 1; $i <= 10; $i++) {
            $clients[] = Client::query()->create([
                'name' => ['Al Noor Developments', 'Blue Bay Holdings', 'Cedar Realty', 'Delta Properties', 'Emerald Estates', 'Falcon Investments', 'Golden Gate RE', 'Harbor Group', 'Ivory Towers', 'Jade Capital'][$i - 1],
                'code' => sprintf('CLI-%02d', $i),
                'contact_person' => "Client Contact {$i}",
                'email' => sprintf('client%02d@example.test', $i),
                'phone' => '+9714'.sprintf('%07d', 1000000 + $i),
                'country_code' => 'AE',
            ]);
        }

        $statuses = ['setup', 'planning', 'execution', 'on_hold', 'completed', 'planning', 'execution', 'setup', 'execution', 'planning'];
        $projects = [];
        for ($i = 1; $i <= 10; $i++) {
            $projects[] = Project::query()->create([
                'company_id' => $companies[($i - 1) % 10]->id,
                'client_id' => $clients[($i - 1) % 10]->id,
                'project_code' => sprintf('PRJ-%03d', $i),
                'name' => ['Marina Tower', 'Oasis Mall', 'Palm Villa Cluster', 'Metro Depot', 'Airport Annex', 'Hospital Wing B', 'School Campus', 'Data Center DXB', 'Hotel Retrofit', 'Warehouse Park'][$i - 1],
                'description' => 'Demo project seeded for QA and role testing.',
                'location' => ['Dubai Marina', 'Business Bay', 'Palm Jumeirah', 'Al Quoz', 'DXB Airport', 'Al Ain', 'Sharjah', 'Dubai South', 'JLT', 'DIP'][$i - 1],
                'currency' => 'AED',
                'status' => $statuses[$i - 1],
                'start_date' => now()->subMonths(6 - ($i % 5))->toDateString(),
                'end_date' => now()->addMonths(8 + $i)->toDateString(),
                'budget_amount' => 1000000 * $i,
                'contract_value' => 1200000 * $i,
                'progress_percent' => ($i * 7) % 100,
                'created_by' => $users['owner']->id,
            ]);
        }

        $main = $projects[0];
        foreach ([$users['owner'], $users['pm'], $users['viewer'], $users['supervisor']] as $idx => $u) {
            ProjectMember::query()->create([
                'project_id' => $main->id,
                'user_id' => $u->id,
                'is_lead' => $idx === 0,
                'joined_at' => now()->subMonths(3)->toDateString(),
            ]);
        }

        // WBS + tasks on main project (10+)
        $wbsNodes = [];
        for ($i = 1; $i <= 10; $i++) {
            $wbsNodes[] = WbsNode::query()->create([
                'project_id' => $main->id,
                'parent_id' => $i > 1 && $i % 3 !== 1 ? ($wbsNodes[0]->id ?? null) : null,
                'code' => sprintf('%02d', $i),
                'name' => "Package {$i}",
                'level' => $i > 1 && $i % 3 !== 1 ? 2 : 1,
                'sort_order' => $i,
                'progress_percent' => ($i * 5) % 100,
            ]);
        }

        $tasks = [];
        for ($i = 1; $i <= 12; $i++) {
            $start = now()->addDays($i * 3);
            $tasks[] = Task::query()->create([
                'project_id' => $main->id,
                'wbs_id' => $wbsNodes[($i - 1) % 10]->id,
                'task_code' => sprintf('T-%03d', $i),
                'name' => "Activity {$i}",
                'status' => $i < 4 ? 'completed' : ($i < 8 ? 'in_progress' : 'not_started'),
                'priority' => ['low', 'medium', 'high', 'critical'][$i % 4],
                'planned_start_date' => $start->toDateString(),
                'planned_end_date' => $start->copy()->addDays(10)->toDateString(),
                'progress_percent' => $i < 4 ? 100 : ($i < 8 ? 40 : 0),
                'assigned_to' => $users['pm']->id,
                'created_by' => $users['owner']->id,
                'sort_order' => $i,
            ]);
        }

        // Ops catalogs (tenant-wide pages)
        $suppliers = [];
        for ($i = 1; $i <= 10; $i++) {
            $suppliers[] = Supplier::query()->create([
                'code' => sprintf('SUP-%02d', $i),
                'name' => "Supplier {$i}",
                'contact_name' => "Sales {$i}",
                'email' => sprintf('supplier%02d@example.test', $i),
                'phone' => '+97150'.sprintf('%07d', 2000000 + $i),
                'status' => $i % 5 === 0 ? 'inactive' : 'active',
            ]);
        }

        $warehouses = [];
        for ($i = 1; $i <= 10; $i++) {
            $warehouses[] = Warehouse::query()->create([
                'code' => sprintf('WH-%02d', $i),
                'name' => "Warehouse {$i}",
                'location' => "Yard {$i}, Dubai",
            ]);
        }

        $items = [];
        for ($i = 1; $i <= 10; $i++) {
            $items[] = InventoryItem::query()->create([
                'sku' => sprintf('SKU-%03d', $i),
                'name' => "Material Item {$i}",
                'unit' => ['m3', 'ton', 'nos', 'm', 'kg'][$i % 5],
                'category' => ['Civil', 'MEP', 'Finishing'][$i % 3],
                'is_active' => true,
            ]);
        }

        $equipment = [];
        for ($i = 1; $i <= 10; $i++) {
            $equipment[] = Equipment::query()->create([
                'code' => sprintf('EQ-%02d', $i),
                'name' => "Equipment {$i}",
                'ownership' => $i % 2 === 0 ? 'owned' : 'rented',
                'status' => 'available',
            ]);
        }

        for ($i = 1; $i <= 10; $i++) {
            Subcontractor::query()->create([
                'code' => sprintf('SUB-%02d', $i),
                'name' => "Subcontractor {$i}",
                'trade' => ['Civil', 'Electrical', 'Plumbing', 'Steel', 'Finishing'][$i % 5],
                'status' => 'active',
            ]);
        }

        // Commercial + site + workflow + billing on main (+ spread a few across projects)
        for ($i = 1; $i <= 10; $i++) {
            CostCode::query()->create([
                'project_id' => $main->id,
                'code' => sprintf('CC-%02d', $i),
                'name' => "Cost Code {$i}",
                'category' => 'Civil',
                'is_active' => true,
            ]);
        }

        $boqs = [];
        for ($i = 1; $i <= 10; $i++) {
            $project = $projects[($i - 1) % 10];
            $boq = Boq::query()->create([
                'project_id' => $project->id,
                'title' => "BOQ Version {$i}",
                'version' => (string) $i,
                'status' => $i === 1 ? 'approved' : 'draft',
                'currency' => 'AED',
                'total_amount' => 50000 * $i,
                'created_by' => $users['owner']->id,
            ]);
            for ($j = 1; $j <= 3; $j++) {
                BoqItem::query()->create([
                    'boq_id' => $boq->id,
                    'item_no' => "{$i}.{$j}",
                    'description' => "BOQ line {$i}.{$j}",
                    'unit' => 'm3',
                    'quantity' => 10 * $j,
                    'rate' => 100 * $j,
                    'amount' => 10 * $j * 100 * $j,
                    'sort_order' => $j,
                ]);
            }
            $boqs[] = $boq;
        }

        for ($i = 1; $i <= 10; $i++) {
            $project = $projects[($i - 1) % 10];
            Contract::query()->create([
                'project_id' => $project->id,
                'client_id' => $project->client_id,
                'contract_no' => sprintf('CON-%03d', $i),
                'title' => "Main Contract {$i}",
                'contract_type' => 'main',
                'status' => 'active',
                'currency' => 'AED',
                'contract_value' => 800000 * $i,
                'retention_percent' => 10,
                'advance_percent' => 10,
                'created_by' => $users['owner']->id,
            ]);
        }

        for ($i = 1; $i <= 10; $i++) {
            Variation::query()->create([
                'project_id' => $main->id,
                'variation_no' => sprintf('VO-%03d', $i),
                'title' => "Variation Order {$i}",
                'status' => $i % 2 === 0 ? 'approved' : 'draft',
                'cost_impact' => 10000 * $i,
                'time_impact_days' => $i,
                'created_by' => $users['pm']->id,
            ]);
        }

        for ($i = 1; $i <= 10; $i++) {
            SiteDiary::query()->create([
                'project_id' => $main->id,
                'report_date' => now()->subDays(10 - $i)->toDateString(),
                'weather' => ['Clear', 'Cloudy', 'Humid'][$i % 3],
                'temperature_c' => 28 + ($i % 8),
                'work_completed' => "Completed package work day {$i}",
                'work_planned' => "Plan for day {$i}",
                'status' => 'submitted',
                'prepared_by' => $users['supervisor']->id,
            ]);
        }

        for ($i = 1; $i <= 10; $i++) {
            Document::query()->create([
                'project_id' => $main->id,
                'document_type' => ['contract', 'drawing', 'rfi', 'submittal', 'certificate', 'report', 'photo', 'variation', 'other', 'report'][$i % 10],
                'title' => "Document {$i}",
                'document_no' => sprintf('DOC-%03d', $i),
                'status' => 'approved',
                'current_version' => 1,
                'uploaded_by' => $users['pm']->id,
            ]);
        }

        for ($i = 1; $i <= 10; $i++) {
            Rfi::query()->create([
                'project_id' => $main->id,
                'rfi_no' => sprintf('RFI-%03d', $i),
                'subject' => "Clarification request {$i}",
                'description' => 'Demo RFI seeded for QA.',
                'status' => $i % 3 === 0 ? 'closed' : 'submitted',
                'priority' => ['low', 'medium', 'high'][$i % 3],
                'submitted_by' => $users['pm']->id,
                'due_date' => now()->addDays($i)->toDateString(),
            ]);
        }

        for ($i = 1; $i <= 10; $i++) {
            Submittal::query()->create([
                'project_id' => $main->id,
                'submittal_no' => sprintf('SUBM-%03d', $i),
                'title' => "Material submittal {$i}",
                'submittal_type' => 'material',
                'status' => $i % 2 === 0 ? 'approved' : 'submitted',
                'submitted_by' => $users['pm']->id,
                'due_date' => now()->addDays(5 + $i)->toDateString(),
            ]);
        }

        for ($i = 1; $i <= 10; $i++) {
            PaymentApplication::query()->create([
                'project_id' => $main->id,
                'application_no' => sprintf('PA-%03d', $i),
                'period_start' => now()->subMonths(11 - $i)->startOfMonth()->toDateString(),
                'period_end' => now()->subMonths(11 - $i)->endOfMonth()->toDateString(),
                'status' => $i < 8 ? 'certified' : 'draft',
                'gross_amount' => 50000 * $i,
                'created_by' => $users['owner']->id,
            ]);
        }

        for ($i = 1; $i <= 10; $i++) {
            Invoice::query()->create([
                'project_id' => $main->id,
                'client_id' => $main->client_id,
                'invoice_no' => sprintf('INV-%03d', $i),
                'invoice_date' => now()->subDays(30 - $i)->toDateString(),
                'due_date' => now()->addDays($i)->toDateString(),
                'currency' => 'AED',
                'subtotal' => 40000 * $i,
                'tax_amount' => 2000 * $i,
                'total_amount' => 42000 * $i,
                'amount_paid' => $i % 2 === 0 ? 42000 * $i : 0,
                'status' => $i % 2 === 0 ? 'paid' : 'issued',
                'created_by' => $users['owner']->id,
            ]);
        }

        for ($i = 1; $i <= 10; $i++) {
            MaterialRequest::query()->create([
                'project_id' => $main->id,
                'request_no' => sprintf('MR-%03d', $i),
                'title' => "Material request {$i}",
                'status' => 'approved',
                'requested_by' => $users['pm']->id,
            ]);
        }

        for ($i = 1; $i <= 10; $i++) {
            PurchaseRequest::query()->create([
                'project_id' => $main->id,
                'request_no' => sprintf('PR-%03d', $i),
                'title' => "Purchase request {$i}",
                'status' => 'approved',
                'requested_by' => $users['pm']->id,
            ]);
        }

        for ($i = 1; $i <= 10; $i++) {
            PurchaseOrder::query()->create([
                'project_id' => $main->id,
                'supplier_id' => $suppliers[($i - 1) % 10]->id,
                'po_no' => sprintf('PO-%03d', $i),
                'title' => "Purchase order {$i}",
                'status' => 'issued',
                'currency' => 'AED',
                'total_amount' => 15000 * $i,
                'created_by' => $users['owner']->id,
            ]);
        }

        for ($i = 1; $i <= 12; $i++) {
            AuditLog::query()->create([
                'user_id' => $users['owner']->id,
                'module' => ['projects', 'billing', 'procurement', 'rbac'][$i % 4],
                'entity_type' => 'project',
                'entity_id' => $main->id,
                'action' => ['created', 'updated', 'viewed', 'exported'][$i % 4],
                'old_values' => null,
                'new_values' => ['demo' => true, 'n' => $i],
                'ip_address' => '127.0.0.1',
                'user_agent' => 'DemoSeeder',
                'created_at' => now()->subHours($i),
            ]);
        }

        $manager->forget();
    }

    /** @param  list<Tenant>  $tenants */
    protected function seedSaasExtras(array $tenants, User $saas): void
    {
        // Extra audit rows without tenant scope for SaaS audit trail
        foreach ($tenants as $i => $tenant) {
            AuditLog::query()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $saas->id,
                'module' => 'saas',
                'entity_type' => 'tenant',
                'entity_id' => $tenant->id,
                'action' => 'seeded',
                'new_values' => ['tenant' => $tenant->slug],
                'ip_address' => '127.0.0.1',
                'user_agent' => 'DemoSeeder',
                'created_at' => now()->subMinutes(10 - $i),
            ]);
        }
    }
}
