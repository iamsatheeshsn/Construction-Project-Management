import api from '../api/client'
import type { AuthResponse, MeResponse } from '../../types/auth'

export async function registerTenant(payload: {
  company_name: string
  name: string
  email: string
  password: string
  password_confirmation: string
  country_code?: string
  currency?: string
}) {
  const { data } = await api.post<AuthResponse>('/auth/register', payload)
  return data
}

export async function login(payload: {
  email: string
  password: string
  tenant_slug?: string
  tenant_id?: number
}) {
  const { data } = await api.post<AuthResponse>('/auth/login', payload)
  return data
}

export async function fetchMe() {
  const { data } = await api.get<MeResponse>('/auth/me')
  return data
}

export async function logout() {
  await api.post('/auth/logout')
}

export async function changePassword(payload: {
  current_password: string
  password: string
  password_confirmation: string
}) {
  const { data } = await api.post<{ message: string }>('/auth/change-password', payload)
  return data
}

export async function switchTenant(payload: { tenant_id?: number; tenant_slug?: string }) {
  const { data } = await api.post<{
    tenant: import('../../types/auth').Tenant
    permissions: string[]
  }>('/auth/switch-tenant', payload)
  return data
}
