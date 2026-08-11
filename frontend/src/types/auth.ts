export type User = {
  id: number
  uuid: string
  name: string
  email: string
  phone?: string | null
  is_super_admin: boolean
  preferred_locale?: string | null
}

export type Tenant = {
  id: number
  uuid: string
  name: string
  slug: string
  status: string
  default_currency: string
}

export type AuthResponse = {
  token: string
  token_type: string
  user: User
  tenant: Tenant | null
  permissions: string[]
  tenants?: Array<{ id: number; name: string; slug: string; is_owner: boolean }>
  message?: string
}

export type MeResponse = {
  user: User
  tenant: Tenant | null
  tenants: Array<{ id: number; name: string; slug: string; is_owner: boolean }>
  permissions: string[]
}
