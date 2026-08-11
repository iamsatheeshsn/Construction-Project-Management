import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import * as auditApi from '../../services/api/auditApi'

function formatRelative(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

export function NotificationBell() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => auditApi.unreadNotificationCount(),
    refetchInterval: 30000,
  })

  const { data: page, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => auditApi.listNotifications(),
    enabled: open,
    refetchInterval: open ? 30000 : false,
  })

  const markRead = useMutation({
    mutationFn: (id: number) => auditApi.markNotificationRead(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => auditApi.markAllNotificationsRead(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const items = page?.data ?? []
  const total = page?.meta?.total ?? items.length
  const truncated = total > items.length

  return (
    <div className="notif-bell" ref={rootRef}>
      <button
        type="button"
        className={`notif-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden>
          <path
            d="M6 8a6 6 0 1 1 12 0c0 3.6 1.2 5.2 2 6H4c.8-.8 2-2.4 2-6Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        {unread > 0 && <span className="notif-count">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <strong>Notifications</strong>
            <button
              type="button"
              className="notif-mark-all"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || unread === 0}
            >
              Mark all read
            </button>
          </div>
          {isLoading ? (
            <p className="muted small notif-loading">Loading…</p>
          ) : items.length === 0 ? (
            <div className="notif-empty">
              <span className="notif-empty-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
                  <path
                    d="M6 8a6 6 0 1 1 12 0c0 3.6 1.2 5.2 2 6H4c.8-.8 2-2.4 2-6Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <strong>You're all caught up</strong>
              <span className="muted small">New notifications will show up here.</span>
            </div>
          ) : (
            <>
              <ul className="notif-list">
                {items.map((n) => (
                  <li key={n.id} className={n.is_read ? undefined : 'unread'}>
                    <button
                      type="button"
                      className="notif-item"
                      onClick={() => {
                        if (!n.is_read) markRead.mutate(n.id)
                      }}
                    >
                      {!n.is_read && <span className="notif-dot" aria-hidden />}
                      <span className="notif-item-body">
                        <strong>{n.title}</strong>
                        {n.body && <span className="muted small">{n.body}</span>}
                        <span className="muted small notif-item-time">{formatRelative(n.created_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {truncated && (
                <p className="muted small notif-more">
                  Showing {items.length} of {total} notifications.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
