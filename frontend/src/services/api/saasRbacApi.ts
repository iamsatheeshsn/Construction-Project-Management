import api from './client'

export type Paginated<T> = {
  data: T[]
  meta?: { current_page: number; last_page: number; per_page: number; total: number }
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

function asPage<T>(raw: any): Paginated<T> {
  if (Array.isArray(raw?.data) && raw?.meta) return raw
  if (Array.isArray(raw?.data) && raw?.current_page != null) {
    return {
      data: raw.data,
      meta: {
        current_page: raw.current_page,
        last_page: raw.last_page,
        per_page: raw.per_page,
        total: raw.total,
      },
      ...raw,
    }
  }
  return { data: raw?.data ?? raw ?? [] }
}

// ——— SaaS platform ———
export async function listSaasTenants(search = '', page = 1, status = '', perPage = 10) {
  const { data } = await api.get('/saas/tenants', {
    params: { search, page, status: status || undefined, per_page: perPage },
  })
  return asPage(data)
}

export async function registerSaasTenant(payload: Record<string, unknown>) {
  const { data } = await api.post('/saas/tenants', payload)
  return data
}

export async function updateSaasTenant(id: number, payload: Record<string, unknown>) {
  const { data } = await api.put(`/saas/tenants/${id}`, payload)
  return data
}

export async function assignSaasPlan(tenantId: number, payload: Record<string, unknown>) {
  const { data } = await api.post(`/saas/tenants/${tenantId}/assign-plan`, payload)
  return data
}

export async function extendSaasTrial(tenantId: number, days: number) {
  const { data } = await api.post(`/saas/tenants/${tenantId}/extend-trial`, { days })
  return data
}

export async function convertSaasTrial(tenantId: number, payload: Record<string, unknown> = {}) {
  const { data } = await api.post(`/saas/tenants/${tenantId}/convert-trial`, payload)
  return data
}

export async function listSaasPlans(activeOnly = false) {
  const { data } = await api.get('/saas/plans', { params: { active_only: activeOnly ? 1 : 0 } })
  return data.data as any[]
}

export async function createSaasPlan(payload: Record<string, unknown>) {
  const { data } = await api.post('/saas/plans', payload)
  return data
}

export async function updateSaasPlan(id: number, payload: Record<string, unknown>) {
  const { data } = await api.put(`/saas/plans/${id}`, payload)
  return data
}

export async function listSaasTrials(page = 1) {
  const { data } = await api.get('/saas/trials', { params: { page, per_page: 10 } })
  return asPage(data)
}

export async function listSaasBilling(page = 1, status = '', tenantId?: number) {
  const { data } = await api.get('/saas/billing', {
    params: {
      page,
      status: status || undefined,
      tenant_id: tenantId || undefined,
      per_page: 10,
    },
  })
  return asPage(data)
}

export async function createSaasInvoice(payload: Record<string, unknown>) {
  const { data } = await api.post('/saas/billing/invoices', payload)
  return data
}

export async function paySaasInvoice(id: number) {
  const { data } = await api.post(`/saas/billing/invoices/${id}/pay`)
  return data
}

export async function listSaasFeatures(
  page = 1,
  tenantId?: number,
  options?: { isEnabled?: boolean | ''; search?: string; perPage?: number },
) {
  const { data } = await api.get('/saas/features', {
    params: {
      page,
      tenant_id: tenantId || undefined,
      is_enabled: options?.isEnabled === '' || options?.isEnabled === undefined ? undefined : options.isEnabled,
      search: options?.search || undefined,
      per_page: options?.perPage ?? 10,
    },
  })
  return asPage(data)
}

export async function upsertSaasFeature(payload: Record<string, unknown>) {
  const { data } = await api.post('/saas/features', payload)
  return data
}

export async function listSaasBranding(search = '', page = 1, perPage = 10) {
  const { data } = await api.get('/saas/branding', { params: { search, page, per_page: perPage } })
  return asPage(data)
}

export async function updateSaasBranding(tenantId: number, payload: Record<string, unknown>) {
  const { data } = await api.put(`/saas/tenants/${tenantId}/branding`, payload)
  return data
}

export async function listSaasUsage() {
  const { data } = await api.get('/saas/usage')
  return data.data as any[]
}

export async function listSaasAuditLogs(
  page = 1,
  tenantId?: number,
  options?: { module?: string; action?: string; search?: string; perPage?: number },
) {
  const { data } = await api.get('/saas/audit-logs', {
    params: {
      page,
      tenant_id: tenantId || undefined,
      module: options?.module || undefined,
      action: options?.action || undefined,
      search: options?.search || undefined,
      per_page: options?.perPage ?? 10,
    },
  })
  return asPage(data)
}

// ——— RBAC ———
export async function listRbacUsers(search = '', page = 1, status = '') {
  const { data } = await api.get('/rbac/users', { params: { search, page, status: status || undefined, per_page: 10 } })
  return asPage(data)
}

export async function inviteRbacUser(payload: Record<string, unknown>) {
  const { data } = await api.post('/rbac/users', payload)
  return data
}

export async function updateRbacUser(membershipId: number, payload: Record<string, unknown>) {
  const { data } = await api.put(`/rbac/users/${membershipId}`, payload)
  return data
}

export async function listRbacRoles() {
  const { data } = await api.get('/rbac/roles')
  return data.data as any[]
}

export async function createRbacRole(payload: Record<string, unknown>) {
  const { data } = await api.post('/rbac/roles', payload)
  return data
}

export async function updateRbacRole(id: number, payload: Record<string, unknown>) {
  const { data } = await api.put(`/rbac/roles/${id}`, payload)
  return data
}

export async function deleteRbacRole(id: number) {
  const { data } = await api.delete(`/rbac/roles/${id}`)
  return data
}

export async function listPermissionCatalog() {
  const { data } = await api.get('/rbac/permission-catalog')
  return data
}

export async function listRbacPolicies() {
  const { data } = await api.get('/rbac/policies')
  return (data.data ?? data) as any[]
}

export async function createRbacPolicy(payload: Record<string, unknown>) {
  const { data } = await api.post('/rbac/policies', payload)
  return data
}

export async function updateRbacPolicy(id: number, payload: Record<string, unknown>) {
  const { data } = await api.put(`/rbac/policies/${id}`, payload)
  return data
}

export async function deleteRbacPolicy(id: number) {
  const { data } = await api.delete(`/rbac/policies/${id}`)
  return data
}

export async function getTenantBranding() {
  const { data } = await api.get('/tenant/branding')
  return data.tenant
}

export async function updateTenantBranding(payload: Record<string, unknown>) {
  const { data } = await api.put('/tenant/branding', payload)
  return data
}

export async function getTenantUsage() {
  const { data } = await api.get('/tenant/usage')
  return data.usage
}

export async function getTenantSubscription() {
  const { data } = await api.get('/tenant/subscription')
  return data.subscription
}
