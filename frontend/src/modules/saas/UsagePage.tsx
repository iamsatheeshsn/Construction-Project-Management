import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import * as api from '../../services/api/saasRbacApi'
import { getErrorMessage, useSuccess } from '../../ui'

type UsageRow = {
  tenant: { id: number; name: string; slug: string; status: string }
  usage: {
    users?: { used?: number; max?: number | null; remaining?: number | null }
    projects?: { used?: number; max?: number | null; remaining?: number | null }
    plan?: { name?: string; code?: string; max_users?: number | null; max_projects?: number | null } | null
    subscription_status?: string | null
    features?: Array<{ feature_key: string; is_enabled: boolean }>
    trial_ends_at?: string | null
  }
}

type Urgency = 'healthy' | 'warning' | 'critical' | 'unlimited'

function formatLabel(value?: string | null) {
  if (!value) return '—'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function usagePct(used?: number, max?: number | null) {
  if (max == null || max <= 0) return null
  return Math.min(100, Math.round(((used ?? 0) / max) * 100))
}

function metricTone(used?: number, max?: number | null): Urgency {
  if (max == null) return 'unlimited'
  const pct = usagePct(used, max) ?? 0
  if ((used ?? 0) >= max) return 'critical'
  if (pct >= 85) return 'warning'
  return 'healthy'
}

function rowTone(row: UsageRow): Urgency {
  const users = metricTone(row.usage.users?.used, row.usage.users?.max)
  const projects = metricTone(row.usage.projects?.used, row.usage.projects?.max)
  const rank = { critical: 3, warning: 2, healthy: 1, unlimited: 0 }
  return rank[users] >= rank[projects] ? users : projects
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'T'
  )
}

function statusBadge(status?: string) {
  if (status === 'active') return 'status-active'
  if (status === 'trial') return 'status-trial'
  if (status === 'suspended' || status === 'cancelled') return 'status-cancelled'
  return ''
}

function fmtCount(used?: number, max?: number | null) {
  const u = used ?? 0
  if (max == null) return `${u} / ∞`
  return `${u} / ${max}`
}

function UsageMeter({
  label,
  used,
  max,
  remaining,
}: {
  label: string
  used?: number
  max?: number | null
  remaining?: number | null
}) {
  const tone = metricTone(used, max)
  const pct = usagePct(used, max)
  const unlimited = max == null
  const fillWidth = unlimited ? Math.min(28, 8 + (used ?? 0) * 4) : Math.max(pct ?? 0, (used ?? 0) > 0 ? 6 : 0)

  return (
    <div className={`usage-meter tone-${tone}`}>
      <div className="usage-meter-head">
        <span>{label}</span>
        <strong>{fmtCount(used, max)}</strong>
      </div>
      <div className="usage-meter-track" aria-hidden>
        <div className="usage-meter-fill" style={{ width: `${fillWidth}%` }} />
      </div>
      <div className="usage-meter-foot">
        {unlimited ? (
          <span>Unlimited plan capacity</span>
        ) : tone === 'critical' ? (
          <span>Limit reached — upgrade required</span>
        ) : (
          <span>
            {remaining ?? Math.max(0, (max ?? 0) - (used ?? 0))} remaining · {pct ?? 0}% used
          </span>
        )}
      </div>
    </div>
  )
}

export function UsagePage() {
  const qc = useQueryClient()
  const success = useSuccess()
  const { tenant: activeTenant, switchTenant } = useAuth()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Urgency>('all')
  const [switchingId, setSwitchingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data = [], isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['saas-usage'],
    queryFn: () => api.listSaasUsage() as Promise<UsageRow[]>,
  })

  const rows = data as UsageRow[]

  const enriched = useMemo(() => {
    return rows.map((row) => ({ ...row, tone: rowTone(row) }))
  }, [rows])

  const stats = useMemo(() => {
    const critical = enriched.filter((r) => r.tone === 'critical').length
    const warning = enriched.filter((r) => r.tone === 'warning').length
    const healthy = enriched.filter((r) => r.tone === 'healthy' || r.tone === 'unlimited').length
    const totalUsers = enriched.reduce((sum, r) => sum + (r.usage.users?.used ?? 0), 0)
    const totalProjects = enriched.reduce((sum, r) => sum + (r.usage.projects?.used ?? 0), 0)
    return {
      total: enriched.length,
      critical,
      warning,
      healthy,
      totalUsers,
      totalProjects,
    }
  }, [enriched])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched
      .filter((row) => {
        if (filter === 'all') return true
        if (filter === 'healthy') return row.tone === 'healthy' || row.tone === 'unlimited'
        return row.tone === filter
      })
      .filter((row) => {
        if (!q) return true
        return (
          row.tenant.name.toLowerCase().includes(q) ||
          row.tenant.slug.toLowerCase().includes(q) ||
          (row.usage.plan?.name ?? '').toLowerCase().includes(q) ||
          (row.usage.plan?.code ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const rank = { critical: 0, warning: 1, healthy: 2, unlimited: 3 }
        const d = rank[a.tone] - rank[b.tone]
        if (d !== 0) return d
        return a.tenant.name.localeCompare(b.tenant.name)
      })
  }, [enriched, filter, search])

  async function onRefresh() {
    await Promise.all([
      refetch(),
      qc.invalidateQueries({ queryKey: ['saas-tenants'] }),
      qc.invalidateQueries({ queryKey: ['dashboard-saas-usage'] }),
    ])
    success({ title: 'Usage refreshed', message: 'Latest seat and project counts loaded.' })
  }

  async function onSwitch(row: UsageRow) {
    setSwitchingId(row.tenant.id)
    setActionError(null)
    try {
      await switchTenant(row.tenant.id)
      success({ title: 'Workspace switched', message: `Now viewing ${row.tenant.name}.` })
    } catch (err) {
      setActionError(getErrorMessage(err, `Failed to switch to ${row.tenant.name}`))
    } finally {
      setSwitchingId(null)
    }
  }

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="stack usage-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">SaaS</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Capacity</span>
          </div>
          <h1 className="page-header-title">Usage limits</h1>
          <p className="page-header-desc">
            Users and projects consumed versus plan maximums. Spot tenants nearing or exceeding capacity.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="button-link" onClick={onRefresh} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link className="ghost-link" to="/admin/saas/plans">
            Plans
          </Link>
          <Link className="ghost-link" to="/admin/saas/tenants">
            Tenants
          </Link>
        </div>
      </header>

      {(error || actionError) && (
        <div className="error">{actionError ?? getErrorMessage(error, 'Failed to load usage')}</div>
      )}

      <section className="tenant-stats usage-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Tenants</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat tone-success">
          <span className="tenant-stat-label">Healthy</span>
          <strong className="tenant-stat-value">{stats.healthy}</strong>
        </div>
        <div className="tenant-stat tone-warn">
          <span className="tenant-stat-label">Near limit</span>
          <strong className="tenant-stat-value">{stats.warning}</strong>
        </div>
        <div className="tenant-stat tone-danger">
          <span className="tenant-stat-label">At / over limit</span>
          <strong className="tenant-stat-value">{stats.critical}</strong>
        </div>
      </section>

      <section className="usage-summary-strip">
        <div>
          <span className="muted small">Platform seats in use</span>
          <strong>{stats.totalUsers}</strong>
        </div>
        <div>
          <span className="muted small">Projects in use</span>
          <strong>{stats.totalProjects}</strong>
        </div>
        {updatedLabel ? (
          <div>
            <span className="muted small">Last refreshed</span>
            <strong>{updatedLabel}</strong>
          </div>
        ) : null}
      </section>

      <section className="panel usage-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Tenant capacity</h2>
            <p className="muted small">
              {filtered.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search tenants</span>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search tenant or plan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <div className="tenants-status-chips" role="tablist" aria-label="Filter by capacity">
              {(
                [
                  { value: 'all' as const, label: 'All', count: stats.total },
                  { value: 'healthy' as const, label: 'Healthy', count: stats.healthy },
                  { value: 'warning' as const, label: 'Near limit', count: stats.warning },
                  { value: 'critical' as const, label: 'At limit', count: stats.critical },
                ]
              ).map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.value}
                  className={`tenants-chip${filter === f.value ? ' active' : ''}`}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                  <span>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading usage…</p>
        ) : filtered.length === 0 ? (
          <div className="tenants-empty">
            <h3>No tenants found</h3>
            <p className="muted">
              {search || filter !== 'all'
                ? 'Try clearing filters or adjusting your search.'
                : 'Register a tenant to start tracking plan capacity.'}
            </p>
          </div>
        ) : (
          <div className="usage-grid">
            {filtered.map((row) => {
              const enabledFeatures = (row.usage.features ?? []).filter((f) => f.is_enabled).length
              const isActive = activeTenant?.id === row.tenant.id
              return (
                <article key={row.tenant.id} className={`usage-card tone-${row.tone}${isActive ? ' is-active' : ''}`}>
                  <div className="usage-card-top">
                    <div className="usage-tenant">
                      <span className="usage-avatar" aria-hidden>
                        {initials(row.tenant.name)}
                      </span>
                      <div>
                        <strong>{row.tenant.name}</strong>
                        <span className="muted small">{row.tenant.slug}</span>
                      </div>
                    </div>
                    <div className="usage-card-badges">
                      <span className={`badge ${statusBadge(row.tenant.status)}`}>
                        {formatLabel(row.tenant.status)}
                      </span>
                      <span className={`usage-urgency usage-urgency-${row.tone}`}>
                        {row.tone === 'critical'
                          ? 'At limit'
                          : row.tone === 'warning'
                            ? 'Near limit'
                            : row.tone === 'unlimited'
                              ? 'Unlimited'
                              : 'Healthy'}
                      </span>
                    </div>
                  </div>

                  <div className="usage-plan-row">
                    <div>
                      <span className="muted small">Plan</span>
                      <strong>{row.usage.plan?.name ?? 'No plan'}</strong>
                      {row.usage.plan?.code ? (
                        <code className="usage-plan-code">{row.usage.plan.code}</code>
                      ) : null}
                    </div>
                    <div>
                      <span className="muted small">Subscription</span>
                      <strong>{formatLabel(row.usage.subscription_status)}</strong>
                    </div>
                    <div>
                      <span className="muted small">Features on</span>
                      <strong>{enabledFeatures}</strong>
                    </div>
                  </div>

                  <div className="usage-meters">
                    <UsageMeter
                      label="Users"
                      used={row.usage.users?.used}
                      max={row.usage.users?.max}
                      remaining={row.usage.users?.remaining}
                    />
                    <UsageMeter
                      label="Projects"
                      used={row.usage.projects?.used}
                      max={row.usage.projects?.max}
                      remaining={row.usage.projects?.remaining}
                    />
                  </div>

                  <div className="usage-card-actions">
                    <Link className="ghost" to="/admin/saas/tenants">
                      Manage tenant
                    </Link>
                    <Link className="ghost" to="/admin/saas/plans">
                      View plans
                    </Link>
                    <button
                      type="button"
                      className="button-link"
                      disabled={switchingId === row.tenant.id || isActive}
                      onClick={() => onSwitch(row)}
                    >
                      {isActive ? 'Current workspace' : switchingId === row.tenant.id ? 'Switching…' : 'Switch'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
