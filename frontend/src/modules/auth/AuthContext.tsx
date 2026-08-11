import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../../services/auth/authApi'
import type { Tenant, User } from '../../types/auth'

export type TenantChoice = {
  id: number
  name: string
  slug: string
  is_owner: boolean
}

type AuthState = {
  user: User | null
  tenant: Tenant | null
  tenants: TenantChoice[]
  permissions: string[]
  loading: boolean
  login: (email: string, password: string, tenantSlug?: string, tenantId?: number) => Promise<void>
  register: (payload: {
    company_name: string
    name: string
    email: string
    password: string
    password_confirmation: string
  }) => Promise<void>
  logout: () => Promise<void>
  switchTenant: (tenantId: number) => Promise<void>
  refreshTenants: () => Promise<void>
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

function persistSession(token: string, tenant: Tenant | null, permissions: string[]) {
  localStorage.setItem('cpm_token', token)
  if (tenant) {
    localStorage.setItem('cpm_tenant_id', String(tenant.id))
  }
  localStorage.setItem('cpm_permissions', JSON.stringify(permissions))
}

function clearSession() {
  localStorage.removeItem('cpm_token')
  localStorage.removeItem('cpm_tenant_id')
  localStorage.removeItem('cpm_permissions')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [tenants, setTenants] = useState<TenantChoice[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const hydrate = useCallback(async () => {
    const token = localStorage.getItem('cpm_token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const me = await authApi.fetchMe()
      setUser(me.user)
      setTenant(me.tenant)
      setTenants(me.tenants ?? [])
      setPermissions(me.permissions)
      if (me.tenant) {
        localStorage.setItem('cpm_tenant_id', String(me.tenant.id))
      }
    } catch {
      clearSession()
      setUser(null)
      setTenant(null)
      setTenants([])
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const login = useCallback(async (email: string, password: string, tenantSlug?: string, tenantId?: number) => {
    const result = await authApi.login({
      email,
      password,
      tenant_slug: tenantSlug || undefined,
      tenant_id: tenantId,
    })

    if (!result.token) {
      throw new Error(result.message ?? 'Select a tenant to continue.')
    }

    persistSession(result.token, result.tenant, result.permissions)
    setUser(result.user)
    setTenant(result.tenant)
    setTenants(result.tenants ?? [])
    setPermissions(result.permissions)

    if (result.user.is_super_admin && !result.tenant && result.tenants && result.tenants.length > 0) {
      const switched = await authApi.switchTenant({ tenant_id: result.tenants[0].id })
      localStorage.setItem('cpm_tenant_id', String(switched.tenant.id))
      localStorage.setItem('cpm_permissions', JSON.stringify(switched.permissions))
      setTenant(switched.tenant)
      setPermissions(switched.permissions)
    }
  }, [])

  const register = useCallback(
    async (payload: {
      company_name: string
      name: string
      email: string
      password: string
      password_confirmation: string
    }) => {
      const result = await authApi.registerTenant(payload)
      persistSession(result.token, result.tenant, result.permissions)
      setUser(result.user)
      setTenant(result.tenant)
      setTenants(result.tenants ?? [{ id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug, is_owner: true }])
      setPermissions(result.permissions)
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
      setUser(null)
      setTenant(null)
      setTenants([])
      setPermissions([])
    }
  }, [])

  const switchTenant = useCallback(async (tenantId: number) => {
    const switched = await authApi.switchTenant({ tenant_id: tenantId })
    localStorage.setItem('cpm_tenant_id', String(switched.tenant.id))
    localStorage.setItem('cpm_permissions', JSON.stringify(switched.permissions))
    setTenant(switched.tenant)
    setPermissions(switched.permissions)
  }, [])

  const refreshTenants = useCallback(async () => {
    const me = await authApi.fetchMe()
    setTenants(me.tenants ?? [])
    if (me.tenant) setTenant(me.tenant)
  }, [])

  const can = useCallback(
    (permission: string) => permissions.includes('*') || permissions.includes(permission),
    [permissions],
  )

  const value = useMemo(
    () => ({
      user,
      tenant,
      tenants,
      permissions,
      loading,
      login,
      register,
      logout,
      switchTenant,
      refreshTenants,
      can,
    }),
    [user, tenant, tenants, permissions, loading, login, register, logout, switchTenant, refreshTenants, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
