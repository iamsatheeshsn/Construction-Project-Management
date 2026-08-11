<?php

namespace Database\Seeders;

use App\Core\RBAC\Models\Permission;
use App\Core\RBAC\Models\Role;
use Illuminate\Database\Seeder;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['code' => 'users.view', 'name' => 'View users', 'module' => 'identity'],
            ['code' => 'users.manage', 'name' => 'Manage users', 'module' => 'identity'],
            ['code' => 'roles.manage', 'name' => 'Manage roles', 'module' => 'identity'],
            ['code' => 'company.view', 'name' => 'View companies', 'module' => 'organization'],
            ['code' => 'company.manage', 'name' => 'Manage companies', 'module' => 'organization'],
            ['code' => 'clients.view', 'name' => 'View clients', 'module' => 'organization'],
            ['code' => 'clients.manage', 'name' => 'Manage clients', 'module' => 'organization'],
            ['code' => 'projects.view', 'name' => 'View projects', 'module' => 'projects'],
            ['code' => 'projects.manage', 'name' => 'Manage projects', 'module' => 'projects'],
            ['code' => 'wbs.view', 'name' => 'View WBS', 'module' => 'planning'],
            ['code' => 'wbs.manage', 'name' => 'Manage WBS', 'module' => 'planning'],
            ['code' => 'tasks.view', 'name' => 'View tasks', 'module' => 'planning'],
            ['code' => 'tasks.manage', 'name' => 'Manage tasks', 'module' => 'planning'],
            ['code' => 'boq.view', 'name' => 'View BOQ', 'module' => 'commercial'],
            ['code' => 'boq.manage', 'name' => 'Manage BOQ', 'module' => 'commercial'],
            ['code' => 'contracts.view', 'name' => 'View contracts', 'module' => 'commercial'],
            ['code' => 'contracts.manage', 'name' => 'Manage contracts', 'module' => 'commercial'],
            ['code' => 'site_diary.view', 'name' => 'View site diary', 'module' => 'site'],
            ['code' => 'site_diary.manage', 'name' => 'Manage site diary', 'module' => 'site'],
            ['code' => 'documents.view', 'name' => 'View documents', 'module' => 'documents'],
            ['code' => 'documents.manage', 'name' => 'Manage documents', 'module' => 'documents'],
            ['code' => 'rfis.view', 'name' => 'View RFIs', 'module' => 'workflow'],
            ['code' => 'rfis.manage', 'name' => 'Manage RFIs', 'module' => 'workflow'],
            ['code' => 'submittals.view', 'name' => 'View submittals', 'module' => 'workflow'],
            ['code' => 'submittals.manage', 'name' => 'Manage submittals', 'module' => 'workflow'],
            ['code' => 'variations.view', 'name' => 'View variations', 'module' => 'commercial'],
            ['code' => 'variations.manage', 'name' => 'Manage variations', 'module' => 'commercial'],
            ['code' => 'billing.view', 'name' => 'View billing', 'module' => 'billing'],
            ['code' => 'billing.manage', 'name' => 'Manage billing', 'module' => 'billing'],
            ['code' => 'procurement.view', 'name' => 'View procurement', 'module' => 'procurement'],
            ['code' => 'procurement.manage', 'name' => 'Manage procurement', 'module' => 'procurement'],
            ['code' => 'inventory.view', 'name' => 'View inventory', 'module' => 'inventory'],
            ['code' => 'inventory.manage', 'name' => 'Manage inventory', 'module' => 'inventory'],
            ['code' => 'equipment.view', 'name' => 'View equipment', 'module' => 'equipment'],
            ['code' => 'equipment.manage', 'name' => 'Manage equipment', 'module' => 'equipment'],
            ['code' => 'subcontractors.view', 'name' => 'View subcontractors', 'module' => 'subcontractors'],
            ['code' => 'subcontractors.manage', 'name' => 'Manage subcontractors', 'module' => 'subcontractors'],
            ['code' => 'audit.view', 'name' => 'View audit logs', 'module' => 'audit'],
        ];

        foreach ($permissions as $permission) {
            Permission::query()->updateOrCreate(
                ['code' => $permission['code']],
                $permission
            );
        }

        $owner = Role::query()->firstOrCreate(
            ['tenant_id' => null, 'code' => 'company_owner'],
            [
                'name' => 'Company Owner',
                'description' => 'Full access within a tenant',
                'scope' => 'tenant',
                'is_system' => true,
            ]
        );

        $pm = Role::query()->firstOrCreate(
            ['tenant_id' => null, 'code' => 'project_manager'],
            [
                'name' => 'Project Manager',
                'description' => 'Project-scoped manager',
                'scope' => 'project',
                'is_system' => true,
            ]
        );

        $viewer = Role::query()->firstOrCreate(
            ['tenant_id' => null, 'code' => 'viewer'],
            [
                'name' => 'Viewer',
                'description' => 'Read-only access',
                'scope' => 'project',
                'is_system' => true,
            ]
        );

        $owner->permissions()->sync(Permission::query()->pluck('id'));

        $pm->permissions()->sync(
            Permission::query()->whereIn('code', [
                'users.view',
                'company.view',
                'clients.view',
                'clients.manage',
                'projects.view',
                'projects.manage',
                'wbs.view',
                'wbs.manage',
                'tasks.view',
                'tasks.manage',
                'boq.view',
                'boq.manage',
                'contracts.view',
                'contracts.manage',
                'site_diary.view',
                'site_diary.manage',
                'documents.view',
                'documents.manage',
                'rfis.view',
                'rfis.manage',
                'submittals.view',
                'submittals.manage',
                'variations.view',
                'variations.manage',
                'billing.view',
                'billing.manage',
                'procurement.view',
                'procurement.manage',
                'inventory.view',
                'inventory.manage',
                'equipment.view',
                'equipment.manage',
                'subcontractors.view',
                'subcontractors.manage',
                'audit.view',
            ])->pluck('id')
        );

        $viewer->permissions()->sync(
            Permission::query()->whereIn('code', [
                'company.view',
                'clients.view',
                'projects.view',
                'wbs.view',
                'tasks.view',
                'boq.view',
                'contracts.view',
                'site_diary.view',
                'documents.view',
                'rfis.view',
                'submittals.view',
                'variations.view',
                'billing.view',
                'procurement.view',
                'inventory.view',
                'equipment.view',
                'subcontractors.view',
            ])->pluck('id')
        );
    }
}
