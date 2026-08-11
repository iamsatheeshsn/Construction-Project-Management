import api from '../api/client'

export type AppNotification = {
  id: number
  type: string
  title: string
  body?: string | null
  entity_type?: string | null
  entity_id?: number | null
  data?: Record<string, unknown> | null
  read_at?: string | null
  created_at?: string | null
  is_read: boolean
}

export type AuditLog = {
  id: number
  module?: string | null
  entity_type: string
  entity_id?: number | null
  action: string
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  ip_address?: string | null
  user?: { id: number; name: string; email?: string } | null
  created_at?: string | null
}

export type ActivityLog = {
  id: number
  project_id?: number | null
  event: string
  description?: string | null
  properties?: Record<string, unknown> | null
  user?: { id: number; name: string } | null
  project?: { id: number; code?: string; name?: string } | null
  created_at?: string | null
}

type Paginated<T> = {
  data: T[]
  meta?: { current_page: number; last_page: number; per_page: number; total: number; from?: number | null; to?: number | null }
}

const PAGE_SIZE = 10

export async function listNotifications(params?: { unread?: boolean; page?: number }) {
  const { data } = await api.get<Paginated<AppNotification>>('/notifications', {
    params: {
      per_page: PAGE_SIZE,
      page: params?.page ?? 1,
      ...(params?.unread ? { unread: 1 } : {}),
    },
  })
  return data
}

export async function unreadNotificationCount() {
  const { data } = await api.get<{ unread_count: number }>('/notifications/unread-count')
  return data.unread_count
}

export async function markNotificationRead(id: number) {
  const { data } = await api.post<{ data: AppNotification }>(`/notifications/${id}/read`)
  return data.data ?? (data as unknown as AppNotification)
}

export async function markAllNotificationsRead() {
  await api.post('/notifications/read-all')
}

export async function listAuditLogs(page = 1, options?: { module?: string; perPage?: number }) {
  const { data } = await api.get<Paginated<AuditLog>>('/audit-logs', {
    params: {
      page,
      per_page: options?.perPage ?? PAGE_SIZE,
      module: options?.module || undefined,
    },
  })
  return data
}

export async function listActivity(projectId?: number, page = 1, options?: { perPage?: number }) {
  const { data } = await api.get<Paginated<ActivityLog>>(
    projectId ? `/projects/${projectId}/activity` : '/activity',
    { params: { page, per_page: options?.perPage ?? PAGE_SIZE } },
  )
  return data
}
