import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import * as auditApi from '../../services/api/auditApi'
import type { ActivityLog, AuditLog } from '../../services/api/auditApi'
import { useAuth } from '../auth/AuthContext'
import { Pagination, getErrorMessage } from '../../ui'

type Tab = 'audit' | 'activity'

function formatLabel(value?: string | null) {
  if (!value) return '—'
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatWhen(value?: string | null) {
  if (!value) return { date: '—', time: '', relative: '' }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { date: '—', time: '', relative: '' }
  const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  let relative = ''
  if (mins < 1) relative = 'Just now'
  else if (mins < 60) relative = `${mins}m ago`
  else if (mins < 1440) relative = `${Math.floor(mins / 60)}h ago`
  else relative = `${Math.floor(mins / 1440)}d ago`
  return { date, time, relative }
}

function actionTone(action?: string | null) {
  const a = (action ?? '').toLowerCase()
  if (/(create|created|invite|invited|issued|posted|award|awarded|sent|submit)/.test(a)) return 'ok'
  if (/(update|updated|approve|approved|activate|activated|assign)/.test(a)) return 'info'
  if (/(delete|deleted|reject|rejected|suspend|cancel|void)/.test(a)) return 'danger'
  return 'neutral'
}

function initials(name?: string | null) {
  if (!name) return '?'
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function describeLog(log: AuditLog) {
  const action = formatLabel(log.action)
  const entity = formatLabel(log.entity_type)
  const id = log.entity_id != null ? ` #${log.entity_id}` : ''
  return `${action} on ${entity}${id}`
}

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function isToday(value?: string | null) {
  if (!value) return false
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function AuditPage() {
  const { can } = useAuth()
  const allowed = can('audit.view')

  const [tab, setTab] = useState<Tab>('audit')

  const [auditPageNum, setAuditPageNum] = useState(1)
  const [auditSearch, setAuditSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const [activityPageNum, setActivityPageNum] = useState(1)
  const [activitySearch, setActivitySearch] = useState('')

  const { data: auditSummary } = useQuery({
    queryKey: ['audit-logs-summary'],
    queryFn: () => auditApi.listAuditLogs(1, { perPage: 100 }),
    enabled: allowed,
  })

  const {
    data: auditPage,
    isLoading: auditLoading,
    isFetching: auditFetching,
    error: auditError,
  } = useQuery({
    queryKey: ['audit-logs', auditPageNum, moduleFilter],
    queryFn: () => auditApi.listAuditLogs(auditPageNum, { module: moduleFilter || undefined }),
    enabled: allowed,
    placeholderData: keepPreviousData,
  })

  const { data: activitySummary } = useQuery({
    queryKey: ['activity-summary'],
    queryFn: () => auditApi.listActivity(undefined, 1, { perPage: 100 }),
    enabled: allowed,
  })

  const {
    data: activityPage,
    isLoading: activityLoading,
    isFetching: activityFetching,
    error: activityError,
  } = useQuery({
    queryKey: ['activity', activityPageNum],
    queryFn: () => auditApi.listActivity(undefined, activityPageNum),
    enabled: allowed,
    placeholderData: keepPreviousData,
  })

  const auditSummaryRows = (auditSummary?.data ?? []) as AuditLog[]
  const activitySummaryRows = (activitySummary?.data ?? []) as ActivityLog[]

  const stats = useMemo(() => {
    const modules = new Set(auditSummaryRows.map((r) => r.module).filter(Boolean))
    const auditToday = auditSummaryRows.filter((r) => isToday(r.created_at)).length
    return {
      auditTotal: auditSummary?.meta?.total ?? auditSummaryRows.length,
      activityTotal: activitySummary?.meta?.total ?? activitySummaryRows.length,
      modules: modules.size,
      auditToday,
    }
  }, [auditSummaryRows, auditSummary, activitySummary, activitySummaryRows])

  const moduleOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of auditSummaryRows) {
      if (!row.module) continue
      counts.set(row.module, (counts.get(row.module) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count, label: formatLabel(value) }))
  }, [auditSummaryRows])

  const auditRows = (auditPage?.data ?? []) as AuditLog[]
  const filteredAuditRows = useMemo(() => {
    const q = auditSearch.trim().toLowerCase()
    if (!q) return auditRows
    return auditRows.filter((row) => {
      const haystack = [
        row.user?.name,
        row.user?.email,
        row.module,
        row.action,
        row.entity_type,
        row.entity_id != null ? String(row.entity_id) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [auditRows, auditSearch])

  const activityRows = (activityPage?.data ?? []) as ActivityLog[]
  const filteredActivityRows = useMemo(() => {
    const q = activitySearch.trim().toLowerCase()
    if (!q) return activityRows
    return activityRows.filter((row) => {
      const haystack = [
        row.description,
        row.event,
        row.user?.name,
        row.project?.name,
        row.project?.code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [activityRows, activitySearch])

  if (!allowed) {
    return <p className="muted">You do not have permission to view audit logs.</p>
  }

  const auditBusy = auditFetching && !auditLoading
  const activityBusy = activityFetching && !activityLoading

  return (
    <div className="stack audit-tenant-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">System</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Audit &amp; activity</span>
          </div>
          <h1 className="page-header-title">Audit &amp; activity</h1>
          <p className="page-header-desc">Tenant-wide audit trail and project activity feed.</p>
        </div>
      </header>

      <section className="tenant-stats audit-tenant-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Audit events</span>
          <strong className="tenant-stat-value">{stats.auditTotal}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Activity events</span>
          <strong className="tenant-stat-value">{stats.activityTotal}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Today</span>
          <strong className="tenant-stat-value">{stats.auditToday}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Modules</span>
          <strong className="tenant-stat-value">{stats.modules}</strong>
        </div>
      </section>

      <div className="tabs audit-tenant-tabs" role="tablist" aria-label="Audit view">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'audit'}
          className={`tab${tab === 'audit' ? ' active' : ''}`}
          onClick={() => setTab('audit')}
        >
          Audit logs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'activity'}
          className={`tab${tab === 'activity' ? ' active' : ''}`}
          onClick={() => setTab('activity')}
        >
          Activity feed
        </button>
      </div>

      {tab === 'audit' ? (
        <section className="panel audit-tenant-panel">
          {auditError && <div className="error">{getErrorMessage(auditError, 'Failed to load audit logs')}</div>}

          <div className="tenants-toolbar">
            <div className="tenants-toolbar-copy">
              <h2>Audit log</h2>
              <p className="muted small">
                {auditPage?.meta?.total ?? auditRows.length} total
                {auditBusy ? ' · Refreshing…' : ''}
              </p>
            </div>
            <div className="tenants-filters">
              <label className="tenants-search">
                <span className="sr-only">Search audit logs</span>
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  placeholder="Search action, user, entity…"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                />
              </label>
            </div>
          </div>

          {moduleOptions.length > 0 && (
            <div className="tenants-status-chips audit-tenant-module-chips" role="tablist" aria-label="Filter by module">
              <button
                type="button"
                role="tab"
                aria-selected={!moduleFilter}
                className={`tenants-chip${!moduleFilter ? ' active' : ''}`}
                onClick={() => {
                  setModuleFilter('')
                  setAuditPageNum(1)
                }}
              >
                All
                <span>{stats.auditTotal}</span>
              </button>
              {moduleOptions.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="tab"
                  aria-selected={moduleFilter === m.value}
                  className={`tenants-chip${moduleFilter === m.value ? ' active' : ''}`}
                  onClick={() => {
                    setModuleFilter(m.value)
                    setAuditPageNum(1)
                  }}
                >
                  {m.label}
                  <span>{m.count}</span>
                </button>
              ))}
            </div>
          )}

          {auditLoading ? (
            <p className="muted tenants-empty">Loading audit trail…</p>
          ) : filteredAuditRows.length === 0 ? (
            <div className="tenants-empty">
              <h3>No audit entries found</h3>
              <p className="muted">
                {auditSearch || moduleFilter
                  ? 'Try clearing filters or adjusting your search.'
                  : 'Audit entries will appear here as your team works in the system.'}
              </p>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="data-table audit-tenant-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Actor</th>
                      <th>Event</th>
                      <th>Module</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditRows.map((row) => {
                      const when = formatWhen(row.created_at)
                      const tone = actionTone(row.action)
                      const actorName = row.user?.name ?? 'System'
                      return (
                        <tr key={row.id}>
                          <td>
                            <div className="audit-tenant-when">
                              <strong>{when.relative || when.date}</strong>
                              <span className="muted small">
                                {when.date} · {when.time}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="audit-tenant-actor">
                              <span className="audit-tenant-avatar" aria-hidden>
                                {initials(actorName)}
                              </span>
                              <div>
                                <strong>{actorName}</strong>
                                {row.user?.email ? (
                                  <span className="muted small">{row.user.email}</span>
                                ) : (
                                  <span className="muted small">Automated</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="audit-tenant-event">
                              <span className={`audit-tenant-action-pill tone-${tone}`}>{formatLabel(row.action)}</span>
                              <span className="muted small">{describeLog(row)}</span>
                            </div>
                          </td>
                          <td>
                            <code className="audit-tenant-module">{formatLabel(row.module)}</code>
                          </td>
                          <td>
                            <button type="button" className="ghost" onClick={() => setSelected(row)}>
                              Details
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination meta={auditPage?.meta} page={auditPageNum} onPageChange={setAuditPageNum} />
            </>
          )}
        </section>
      ) : (
        <section className="panel audit-tenant-panel">
          {activityError && (
            <div className="error">{getErrorMessage(activityError, 'Failed to load activity feed')}</div>
          )}

          <div className="tenants-toolbar">
            <div className="tenants-toolbar-copy">
              <h2>Recent activity</h2>
              <p className="muted small">
                {activityPage?.meta?.total ?? activityRows.length} total
                {activityBusy ? ' · Refreshing…' : ''}
              </p>
            </div>
            <div className="tenants-filters">
              <label className="tenants-search">
                <span className="sr-only">Search activity</span>
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  placeholder="Search description, user, project…"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                />
              </label>
            </div>
          </div>

          {activityLoading ? (
            <p className="muted tenants-empty">Loading activity…</p>
          ) : filteredActivityRows.length === 0 ? (
            <div className="tenants-empty">
              <h3>No activity found</h3>
              <p className="muted">
                {activitySearch ? 'Try clearing your search.' : 'Project activity will appear here as your team works.'}
              </p>
            </div>
          ) : (
            <>
              <ul className="audit-tenant-activity-list">
                {filteredActivityRows.map((a) => (
                  <li key={a.id}>
                    <span className="audit-tenant-avatar" aria-hidden>
                      {initials(a.user?.name)}
                    </span>
                    <div>
                      <strong>{a.description ?? formatLabel(a.event)}</strong>
                      <div className="muted small">
                        {a.user?.name ?? 'System'}
                        {a.project ? ` · ${a.project.code ?? a.project.name}` : ''}
                        {a.created_at ? ` · ${formatWhen(a.created_at).relative}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination meta={activityPage?.meta} page={activityPageNum} onPageChange={setActivityPageNum} />
            </>
          )}
        </section>
      )}

      {selected && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <div
            className="modal-card audit-tenant-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-tenant-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="audit-tenant-modal-title">{formatLabel(selected.action)}</h2>
                <p className="muted small">{describeLog(selected)}</p>
              </div>
              <button type="button" className="ghost" onClick={() => setSelected(null)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="audit-tenant-detail-grid">
              <div>
                <span className="muted small">When</span>
                <strong>
                  {formatWhen(selected.created_at).date} · {formatWhen(selected.created_at).time}
                </strong>
              </div>
              <div>
                <span className="muted small">Actor</span>
                <strong>{selected.user?.name ?? 'System'}</strong>
                {selected.user?.email ? <span className="muted small">{selected.user.email}</span> : null}
              </div>
              <div>
                <span className="muted small">Module</span>
                <strong>{formatLabel(selected.module)}</strong>
              </div>
              <div>
                <span className="muted small">Entity</span>
                <strong>
                  {formatLabel(selected.entity_type)}
                  {selected.entity_id != null ? ` #${selected.entity_id}` : ''}
                </strong>
              </div>
              {selected.ip_address ? (
                <div>
                  <span className="muted small">IP address</span>
                  <strong>{selected.ip_address}</strong>
                </div>
              ) : null}
            </div>

            {(selected.old_values || selected.new_values) && (
              <div className="audit-tenant-diff">
                <div>
                  <h3>Before</h3>
                  <pre>{selected.old_values ? prettyJson(selected.old_values) : '—'}</pre>
                </div>
                <div>
                  <h3>After</h3>
                  <pre>{selected.new_values ? prettyJson(selected.new_values) : '—'}</pre>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="button-link" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
