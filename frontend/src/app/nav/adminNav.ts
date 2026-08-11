export type NavLeaf = {
  id: string
  label: string
  to: string
  matchPrefixes?: string[]
  permission?: string
  anyOf?: string[]
  /** Only visible to platform SaaS super admins */
  superAdminOnly?: boolean
  icon: string
}

export type NavGroup = {
  id: string
  label: string
  icon: string
  superAdminOnly?: boolean
  children: NavLeaf[]
}

export type NavEntry =
  | { type: 'link'; item: NavLeaf }
  | { type: 'group'; item: NavGroup }

export type NavFilterOpts = {
  can: (permission: string) => boolean
  isSuperAdmin: boolean
}

/** Unique leaf routes only — parents are expand/collapse toggles, never links. */
export const ADMIN_NAV: NavEntry[] = [
  {
    type: 'link',
    item: {
      id: 'dashboard',
      label: 'Dashboard',
      to: '/admin/dashboard',
      icon: 'dashboard',
    },
  },
  {
    type: 'group',
    item: {
      id: 'saas',
      label: 'SaaS Foundation',
      icon: 'saas',
      superAdminOnly: true,
      children: [
        { id: 'saas-tenants', label: 'Multi-Tenant', to: '/admin/saas/tenants', superAdminOnly: true, icon: 'tenants' },
        { id: 'saas-registration', label: 'Tenant Registration', to: '/admin/saas/registration', superAdminOnly: true, icon: 'registration' },
        { id: 'saas-plans', label: 'Subscription Plans', to: '/admin/saas/plans', superAdminOnly: true, icon: 'plans' },
        { id: 'saas-trials', label: 'Trial Management', to: '/admin/saas/trials', superAdminOnly: true, icon: 'trials' },
        { id: 'saas-billing', label: 'Tenant Billing', to: '/admin/saas/billing', superAdminOnly: true, icon: 'billing' },
        { id: 'saas-features', label: 'Feature Management', to: '/admin/saas/features', superAdminOnly: true, icon: 'features' },
        { id: 'saas-branding', label: 'Tenant Branding', to: '/admin/saas/branding', superAdminOnly: true, icon: 'branding' },
        { id: 'saas-usage', label: 'Usage Limits', to: '/admin/saas/usage', superAdminOnly: true, icon: 'usage' },
        { id: 'saas-audit', label: 'Audit Logs', to: '/admin/saas/audit', superAdminOnly: true, icon: 'audit' },
      ],
    },
  },
  {
    type: 'group',
    item: {
      id: 'rbac',
      label: 'RBAC',
      icon: 'rbac',
      children: [
        { id: 'rbac-roles', label: 'Roles', to: '/admin/rbac/roles', permission: 'users.view', icon: 'roles' },
        { id: 'rbac-permissions', label: 'Permissions', to: '/admin/rbac/permissions', permission: 'users.view', icon: 'permissions' },
        { id: 'rbac-policies', label: 'Policies', to: '/admin/rbac/policies', permission: 'users.view', icon: 'policies' },
        { id: 'rbac-users', label: 'User Management', to: '/admin/rbac/users', permission: 'users.view', icon: 'users' },
      ],
    },
  },
  {
    type: 'group',
    item: {
      id: 'organization',
      label: 'Organization',
      icon: 'organization',
      children: [
        { id: 'companies', label: 'Companies', to: '/admin/organization/companies', permission: 'company.view', icon: 'companies' },
        { id: 'clients', label: 'Clients', to: '/admin/organization/clients', permission: 'clients.view', icon: 'clients' },
        {
          id: 'projects',
          label: 'Projects',
          to: '/admin/organization/projects',
          matchPrefixes: ['/admin/organization/projects/'],
          permission: 'projects.view',
          icon: 'projects',
        },
      ],
    },
  },
  {
    type: 'group',
    item: {
      id: 'operations',
      label: 'Operations',
      icon: 'operations',
      children: [
        { id: 'suppliers', label: 'Suppliers', to: '/admin/operations/suppliers', permission: 'procurement.view', icon: 'suppliers' },
        { id: 'inventory', label: 'Inventory', to: '/admin/operations/inventory', permission: 'inventory.view', icon: 'inventory' },
        { id: 'warehouses', label: 'Warehouses', to: '/admin/operations/warehouses', permission: 'inventory.view', icon: 'warehouses' },
        { id: 'equipment', label: 'Equipment', to: '/admin/operations/equipment', permission: 'equipment.view', icon: 'equipment' },
        {
          id: 'subcontractors',
          label: 'Subcontractors',
          to: '/admin/operations/subcontractors',
          permission: 'subcontractors.view',
          icon: 'subcontractors',
        },
      ],
    },
  },
  {
    type: 'group',
    item: {
      id: 'system',
      label: 'System',
      icon: 'system',
      children: [
        { id: 'audit', label: 'Audit', to: '/admin/system/audit', permission: 'audit.view', icon: 'audit' },
        {
          id: 'tenant-branding',
          label: 'Workspace Branding',
          to: '/admin/system/branding',
          permission: 'company.view',
          icon: 'branding',
        },
      ],
    },
  },
]

export function leafIsAllowed(leaf: NavLeaf, opts: NavFilterOpts): boolean {
  if (leaf.superAdminOnly && !opts.isSuperAdmin) return false
  if (leaf.anyOf?.length) return leaf.anyOf.some((p) => opts.can(p))
  if (leaf.permission) return opts.can(leaf.permission)
  return true
}

export function filterNav(opts: NavFilterOpts): NavEntry[] {
  return ADMIN_NAV.map((entry) => {
    if (entry.type === 'link') {
      return leafIsAllowed(entry.item, opts) ? entry : null
    }
    if (entry.item.superAdminOnly && !opts.isSuperAdmin) return null
    const children = entry.item.children.filter((c) => leafIsAllowed(c, opts))
    if (!children.length) return null
    return { type: 'group' as const, item: { ...entry.item, children } }
  }).filter((e): e is NavEntry => e !== null)
}

export function pathActivatesLeaf(pathname: string, leaf: NavLeaf): boolean {
  if (pathname === leaf.to) return true
  return (leaf.matchPrefixes ?? []).some((prefix) => pathname.startsWith(prefix))
}

export function findActiveGroupId(pathname: string, nav: NavEntry[]): string | null {
  for (const entry of nav) {
    if (entry.type !== 'group') continue
    if (entry.item.children.some((c) => pathActivatesLeaf(pathname, c))) return entry.item.id
  }
  return null
}
