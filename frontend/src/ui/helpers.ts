export const DEFAULT_PAGE_SIZE = 10

export type FieldErrors = Record<string, string>

export type LaravelMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number | null
  to?: number | null
}

export type Paginated<T> = {
  data: T[]
  meta?: LaravelMeta
}

export function getFieldErrors(err: unknown): FieldErrors {
  const errors = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors
  if (!errors) return {}
  const out: FieldErrors = {}
  for (const [key, messages] of Object.entries(errors)) {
    if (messages?.[0]) out[key] = messages[0]
  }
  return out
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const resp = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
  const first = resp?.errors ? Object.values(resp.errors).flat()[0] : null
  return first ?? resp?.message ?? fallback
}

/** Build inline errors for empty required values. Keys map to user-facing messages. */
export function requireFields(
  values: Record<string, unknown>,
  rules: Record<string, string>,
): FieldErrors {
  const out: FieldErrors = {}
  for (const [key, message] of Object.entries(rules)) {
    const value = values[key]
    if (value == null || String(value).trim() === '') out[key] = message
  }
  return out
}

export function clearFieldError(errors: FieldErrors, key: string): FieldErrors {
  if (!errors[key]) return errors
  const next = { ...errors }
  delete next[key]
  return next
}
