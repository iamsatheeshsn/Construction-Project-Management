import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api/saasRbacApi'
import { Pagination, getErrorMessage } from '../../ui'

type AuditRow = {
  id: number
  tenant_id?: number | null
  module?: string | null
  action?: string | null
  entity_type?: string | null
  entity_id?: number | null
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
  created_at?: string | null
  user?: { id?: number; name?: string; email?: string } | null
  tenant?: { id: number; name: string; slug?: string; status?: string } | null
}

type TenantOption = { id: number; name: string; slug?: string }

const MODULE_LABELS: Record<string, string> = {
  identity: 'Identity',
  procurement: 'Procurement',
  inventory: 'Inventory',
  equipment: 'Equipment',
  subcontractors: 'Subcontractors',
  submittals: 'Submittals',
  boq: 'BOQ',
  saas: 'SaaS',
  billing: 'Billing',
  documents: 'Documents',
}

function formatLabel(value?: string | null) {
  if (!value) return '—'
  if (MODULE_LABELS[value]) return MODULE_LABELS[value]
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

function describeLog(log: AuditRow) {
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

export function SaasAuditPage() {
  const [page, setPage] = useState(1)
  const [tenantId, setTenantId] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AuditRow | null>(null)

  const { data: tenantsPage } = useQuery({
    queryKey: ['saas-tenants-options'],
    queryFn: () => api.listSaasTenants('', 1, '', 100),
  })

  const { data: summaryPage } = useQuery({
    queryKey: ['saas-audit-summary'],
    queryFn: () => api.listSaasAuditLogs(1, undefined, { perPage: 100 }),
  })

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['saas-audit', page, tenantId, moduleFilter, search],
    queryFn: () =>
      api.listSaasAuditLogs(page, tenantId ? Number(tenantId) : undefined, {
        module: moduleFilter || undefined,
        search: search.trim() || undefined,
        perPage: 10,
      }),
    placeholderData: keepPreviousData,
  })

  const tenants = (tenantsPage?.data ?? []) as TenantOption[]
  const rows = (data?.data ?? []) as AuditRow[]
  const allRows = (summaryPage?.data ?? []) as AuditRow[]

  const stats = useMemo(() => {
    const modules = new Set(allRows.map((r) => r.module).filter(Boolean))
    const actors = new Set(allRows.map((r) => r.user?.id ?? r.user?.email).filter(Boolean))
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const today = allRows.filter((r) => r.created_at && new Date(r.created_at) >= todayStart).length
    return {
      total: summaryPage?.meta?.total ?? allRows.length,
      modules: modules.size,
      actors: actors.size,
      today,
    }
  }, [allRows, summaryPage])

  const moduleOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of allRows) {
      if (!row.module) continue
      counts.set(row.module, (counts.get(row.module) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count, label: formatLabel(value) }))
  }, [allRows])

  const busy = isFetching && !isLoading

  return (
    <div className="stack audit-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">SaaS</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Platform trail</span>
          </div>
          <h1 className="page-header-title">Audit logs</h1>
          <p className="page-header-desc">
            Cross-tenant platform audit trail. Review who changed what across every workspace.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="button-link" onClick={() => refetch()} disabled={busy}>
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link className="ghost-link" to="/admin/saas/tenants">
            Tenants
          </Link>
          <Link className="ghost-link" to="/admin/saas/usage">
            Usage
          </Link>
        </div>
      </header>

      {error && <div className="error">{getErrorMessage(error, 'Failed to load audit logs')}</div>}

      <section className="tenant-stats audit-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">All events</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Today</span>
          <strong className="tenant-stat-value">{stats.today}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Modules</span>
          <strong className="tenant-stat-value">{stats.modules}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Actors</span>
          <strong className="tenant-stat-value">{stats.actors}</strong>
        </div>
      </section>

      <section className="panel audit-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Event stream</h2>
            <p className="muted small">
              {data?.meta?.total ?? rows.length} matching
              {busy ? ' · Refreshing…' : ''}
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
                placeholder="Search action, user, tenant…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>

            <select
              className="billing-filter-select"
              aria-label="Filter by tenant"
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tenants-status-chips audit-module-chips" role="tablist" aria-label="Filter by module">
          <button
            type="button"
            role="tab"
            aria-selected={!moduleFilter}
            className={`tenants-chip${!moduleFilter ? ' active' : ''}`}
            onClick={() => {
              setModuleFilter('')
              setPage(1)
            }}
          >
            All
            <span>{stats.total}</span>
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
                setPage(1)
              }}
            >
              {m.label}
              <span>{m.count}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading audit trail…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No audit events found</h3>
            <p className="muted">
              {search || tenantId || moduleFilter
                ? 'Try clearing filters or adjusting your search.'
                : 'Platform activity will appear here as tenants use the system.'}
            </p>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table audit-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Tenant</th>
                    <th>Actor</th>
                    <th>Event</th>
                    <th>Module</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((log) => {
                    const when = formatWhen(log.created_at)
                    const tone = actionTone(log.action)
                    const tenantName = log.tenant?.name ?? (log.tenant_id ? `Tenant #${log.tenant_id}` : 'Platform')
                    const actorName = log.user?.name ?? 'System'
                    return (
                      <tr key={log.id}>
                        <td>
                          <div className="audit-when">
                            <strong>{when.relative || when.date}</strong>
                            <span className="muted small">
                              {when.date} · {when.time}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="audit-tenant">
                            <strong>{tenantName}</strong>
                            {log.tenant?.slug ? (
                              <span className="muted small">{log.tenant.slug}</span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="audit-actor">
                            <span className="audit-avatar" aria-hidden>
                              {initials(actorName)}
                            </span>
                            <div>
                              <strong>{actorName}</strong>
                              {log.user?.email ? (
                                <span className="muted small">{log.user.email}</span>
                              ) : (
                                <span className="muted small">Automated</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="audit-event">
                            <span className={`audit-action-pill tone-${tone}`}>{formatLabel(log.action)}</span>
                            <span className="muted small">{describeLog(log)}</span>
                            {log.ip_address ? (
                              <span className="muted small audit-ip">{log.ip_address}</span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <code className="audit-module">{formatLabel(log.module)}</code>
                        </td>
                        <td>
                          <button type="button" className="ghost" onClick={() => setSelected(log)}>
                            Details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
          </>
        )}
      </section>

      {selected && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <div
            className="modal-card audit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="audit-modal-title">{formatLabel(selected.action)}</h2>
                <p className="muted small">{describeLog(selected)}</p>
              </div>
              <button type="button" className="ghost" onClick={() => setSelected(null)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="audit-detail-grid">
              <div>
                <span className="muted small">When</span>
                <strong>
                  {formatWhen(selected.created_at).date} · {formatWhen(selected.created_at).time}
                </strong>
              </div>
              <div>
                <span className="muted small">Tenant</span>
                <strong>{selected.tenant?.name ?? (selected.tenant_id ? `#${selected.tenant_id}` : 'Platform')}</strong>
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
              <div>
                <span className="muted small">IP address</span>
                <strong>{selected.ip_address ?? '—'}</strong>
              </div>
            </div>

            {(selected.old_values || selected.new_values) && (
              <div className="audit-diff">
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

            {selected.user_agent ? (
              <div className="audit-ua">
                <span className="muted small">User agent</span>
                <code>{selected.user_agent}</code>
              </div>
            ) : null}

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
