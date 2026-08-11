import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import * as api from '../../services/api/saasRbacApi'
import {
  FormField,
  Pagination,
  getErrorMessage,
  getFieldErrors,
  useConfirm,
  useSuccess,
  type FieldErrors,
} from '../../ui'

type TenantRow = {
  id: number
  name: string
  slug: string
  legal_name?: string | null
  status: string
  trial_ends_at?: string | null
  default_currency?: string | null
  created_at?: string | null
  subscription?: {
    status?: string
    billing_cycle?: string
    starts_at?: string | null
    ends_at?: string | null
    plan?: { code?: string; name?: string } | null
  } | null
  usage?: {
    users?: { used?: number; max?: number | null }
    projects?: { used?: number; max?: number | null }
    plan?: { name?: string } | null
    subscription_status?: string | null
  }
}

type PlanOption = {
  id: number
  code: string
  name: string
  price_monthly?: number | string
  currency?: string
}

type DrawerMode = 'edit' | 'plan' | null

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function usagePct(used?: number, max?: number | null) {
  if (max == null || max <= 0) return 0
  return Math.min(100, Math.round(((used ?? 0) / max) * 100))
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge status-${status}`}>{formatLabel(status)}</span>
}

function UsageCell({ label, used, max }: { label: string; used?: number; max?: number | null }) {
  const unlimited = max == null
  const pct = usagePct(used, max)
  const warn = !unlimited && pct >= 85

  return (
    <div className="tenant-usage-cell" title={`${label}: ${used ?? 0}${unlimited ? ' / ∞' : ` / ${max}`}`}>
      <div className="tenant-usage-head">
        <span>{label}</span>
        <strong>
          {used ?? 0}
          {unlimited ? ' / ∞' : ` / ${max}`}
        </strong>
      </div>
      <div className="tenant-usage-track">
        <div
          className={`tenant-usage-fill${warn ? ' warn' : ''}`}
          style={{ width: unlimited ? '14%' : `${Math.max(pct, used ? 6 : 0)}%` }}
        />
      </div>
    </div>
  )
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

export function TenantsPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()
  const { tenant: activeTenant, switchTenant } = useAuth()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [switchingId, setSwitchingId] = useState<number | null>(null)

  const [drawer, setDrawer] = useState<{ mode: DrawerMode; tenant: TenantRow } | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    legal_name: '',
    default_currency: 'AED',
    status: 'active',
  })
  const [planForm, setPlanForm] = useState({
    plan_code: '',
    billing_cycle: 'monthly',
    status: 'active',
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 280)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['saas-tenants', search, status, page],
    queryFn: () => api.listSaasTenants(search, page, status, 10),
    placeholderData: keepPreviousData,
  })

  const { data: summaryPage } = useQuery({
    queryKey: ['saas-tenants-summary'],
    queryFn: () => api.listSaasTenants('', 1, '', 100),
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['saas-plans-active'],
    queryFn: () => api.listSaasPlans(true),
  })

  const rows = (data?.data ?? []) as TenantRow[]
  const summaryRows = (summaryPage?.data ?? []) as TenantRow[]

  const stats = useMemo(() => {
    const source = summaryRows
    return {
      total: summaryPage?.meta?.total ?? source.length,
      active: source.filter((t) => t.status === 'active').length,
      trial: source.filter((t) => t.status === 'trial').length,
      suspended: source.filter((t) => t.status === 'suspended').length,
      cancelled: source.filter((t) => t.status === 'cancelled').length,
    }
  }, [summaryPage?.meta?.total, summaryRows])

  async function refreshTenantQueries() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['saas-tenants'] }),
      qc.invalidateQueries({ queryKey: ['saas-tenants-summary'] }),
      qc.invalidateQueries({ queryKey: ['dashboard-saas-tenants'] }),
      qc.invalidateQueries({ queryKey: ['dashboard-saas-usage'] }),
      qc.invalidateQueries({ queryKey: ['saas-trials'] }),
    ])
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: string }) => api.updateSaasTenant(id, { status: next }),
    onSuccess: async (_res, vars) => {
      await refreshTenantQueries()
      success({
        title: 'Tenant updated',
        message: `Status set to ${formatLabel(vars.next)}.`,
      })
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to update tenant status')),
  })

  const editMutation = useMutation({
    mutationFn: () =>
      api.updateSaasTenant(drawer!.tenant.id, {
        name: editForm.name.trim(),
        legal_name: editForm.legal_name.trim() || null,
        default_currency: editForm.default_currency.trim().toUpperCase() || 'AED',
        status: editForm.status,
      }),
    onSuccess: async () => {
      setDrawer(null)
      setFieldErrors({})
      setError(null)
      await refreshTenantQueries()
      success({ title: 'Tenant saved', message: 'Tenant details were updated.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to save tenant'))
    },
  })

  const planMutation = useMutation({
    mutationFn: () =>
      api.assignSaasPlan(drawer!.tenant.id, {
        plan_code: planForm.plan_code,
        billing_cycle: planForm.billing_cycle,
        status: planForm.status,
      }),
    onSuccess: async () => {
      setDrawer(null)
      setFieldErrors({})
      setError(null)
      await refreshTenantQueries()
      success({ title: 'Plan assigned', message: 'Subscription plan was applied to the tenant.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to assign plan'))
    },
  })

  async function changeStatus(tenant: TenantRow, next: string) {
    const labels: Record<string, string> = {
      active: 'Activate',
      suspended: 'Suspend',
      cancelled: 'Cancel',
      trial: 'Set to trial',
    }
    const ok = await confirm({
      title: `${labels[next] ?? 'Update'} tenant?`,
      message: `Set “${tenant.name}” status to ${formatLabel(next)}?`,
      confirmLabel: labels[next] ?? 'Update',
    })
    if (!ok) return
    setError(null)
    statusMutation.mutate({ id: tenant.id, next })
  }

  function openEdit(tenant: TenantRow) {
    setError(null)
    setFieldErrors({})
    setEditForm({
      name: tenant.name,
      legal_name: tenant.legal_name ?? '',
      default_currency: tenant.default_currency ?? 'AED',
      status: tenant.status,
    })
    setDrawer({ mode: 'edit', tenant })
  }

  function openPlan(tenant: TenantRow) {
    setError(null)
    setFieldErrors({})
    setPlanForm({
      plan_code: tenant.subscription?.plan?.code ?? (plans as PlanOption[])[0]?.code ?? '',
      billing_cycle: tenant.subscription?.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
      status: tenant.status === 'trial' ? 'trialing' : 'active',
    })
    setDrawer({ mode: 'plan', tenant })
  }

  async function onSwitchTenant(tenant: TenantRow) {
    if (activeTenant?.id === tenant.id) return
    setSwitchingId(tenant.id)
    setError(null)
    try {
      await switchTenant(tenant.id)
      await qc.invalidateQueries()
      success({
        title: 'Workspace switched',
        message: `You are now viewing ${tenant.name}.`,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to switch tenant'))
    } finally {
      setSwitchingId(null)
    }
  }

  function onEditSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    if (!editForm.name.trim()) {
      setFieldErrors({ name: 'Display name is required.' })
      return
    }
    editMutation.mutate()
  }

  function onPlanSubmit(e: FormEvent) {
    e.preventDefault()
    if (!planForm.plan_code) {
      setFieldErrors({ plan_code: 'Select a plan.' })
      return
    }
    setError(null)
    planMutation.mutate()
  }

  const statusFilters = [
    { value: '', label: 'All', count: stats.total },
    { value: 'active', label: 'Active', count: stats.active },
    { value: 'trial', label: 'Trial', count: stats.trial },
    { value: 'suspended', label: 'Suspended', count: stats.suspended },
    { value: 'cancelled', label: 'Cancelled', count: stats.cancelled },
  ]

  return (
    <div className="stack tenants-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">SaaS</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Multi-tenant management</span>
          </div>
          <h1 className="page-header-title">Platform tenants</h1>
          <p className="page-header-desc">
            Review plan and usage across every company workspace. Activate, suspend, assign plans, or switch into a tenant.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="button-link" to="/admin/saas/registration">
            Register tenant
          </Link>
          <Link className="ghost-link" to="/admin/saas/plans">
            Manage plans
          </Link>
          <Link className="ghost-link" to="/admin/saas/usage">
            Usage report
          </Link>
        </div>
      </header>

      {error && !drawer && <div className="error">{error}</div>}

      <section className="tenant-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Total</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat tone-success">
          <span className="tenant-stat-label">Active</span>
          <strong className="tenant-stat-value">{stats.active}</strong>
        </div>
        <div className="tenant-stat tone-warn">
          <span className="tenant-stat-label">Trial</span>
          <strong className="tenant-stat-value">{stats.trial}</strong>
        </div>
        <div className="tenant-stat tone-danger">
          <span className="tenant-stat-label">Suspended</span>
          <strong className="tenant-stat-value">{stats.suspended}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Cancelled</span>
          <strong className="tenant-stat-value">{stats.cancelled}</strong>
        </div>
      </section>

      <section className="panel tenants-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>All tenants</h2>
            <p className="muted small">
              {data?.meta?.total ?? rows.length} matching
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
                placeholder="Search name, slug, legal name…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </label>

            <div className="tenants-status-chips" role="tablist" aria-label="Filter by status">
              {statusFilters.map((f) => (
                <button
                  key={f.value || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={status === f.value}
                  className={`tenants-chip${status === f.value ? ' active' : ''}`}
                  onClick={() => {
                    setStatus(f.value)
                    setPage(1)
                  }}
                >
                  {f.label}
                  <span>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading tenants…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No tenants found</h3>
            <p className="muted">
              {search || status
                ? 'Try clearing filters or adjusting your search.'
                : 'Register the first company workspace to get started.'}
            </p>
            {!search && !status && (
              <Link className="button-link" to="/admin/saas/registration">
                Register tenant
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table tenants-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th>Usage</th>
                    <th>Trial / created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const selected = activeTenant?.id === t.id
                    const busy = statusMutation.isPending || switchingId === t.id
                    return (
                      <tr key={t.id} className={selected ? 'is-selected-row' : undefined}>
                        <td>
                          <div className="tenant-identity">
                            <span className="tenant-avatar" aria-hidden>
                              {initials(t.name)}
                            </span>
                            <div>
                              <div className="tenant-name-row">
                                <strong>{t.name}</strong>
                                {selected && <span className="badge status-selected">Selected</span>}
                              </div>
                              <div className="muted small">
                                {t.slug}
                                {t.legal_name ? ` · ${t.legal_name}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={t.status} />
                        </td>
                        <td>
                          <div className="tenant-plan">
                            <strong>{t.subscription?.plan?.name ?? t.usage?.plan?.name ?? 'No plan'}</strong>
                            <div className="muted small">
                              {t.subscription?.status
                                ? formatLabel(t.subscription.status)
                                : t.usage?.subscription_status
                                  ? formatLabel(t.usage.subscription_status)
                                  : 'Unassigned'}
                              {t.subscription?.billing_cycle
                                ? ` · ${formatLabel(t.subscription.billing_cycle)}`
                                : ''}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="tenant-usage-stack">
                            <UsageCell label="Users" used={t.usage?.users?.used} max={t.usage?.users?.max} />
                            <UsageCell
                              label="Projects"
                              used={t.usage?.projects?.used}
                              max={t.usage?.projects?.max}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="tenant-dates">
                            <div>
                              <span className="muted small">Trial ends</span>
                              <strong>{formatDate(t.trial_ends_at)}</strong>
                            </div>
                            <div>
                              <span className="muted small">Created</span>
                              <strong>{formatDate(t.created_at)}</strong>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="tenant-actions">
                            <button type="button" className="ghost" disabled={busy} onClick={() => openEdit(t)}>
                              Edit
                            </button>
                            <button type="button" className="ghost" disabled={busy} onClick={() => openPlan(t)}>
                              Assign plan
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              disabled={busy || selected}
                              onClick={() => void onSwitchTenant(t)}
                            >
                              {selected ? 'Current' : switchingId === t.id ? 'Switching…' : 'Switch'}
                            </button>
                            {t.status !== 'active' && (
                              <button
                                type="button"
                                className="ghost"
                                disabled={busy}
                                onClick={() => void changeStatus(t, 'active')}
                              >
                                Activate
                              </button>
                            )}
                            {t.status !== 'suspended' && t.status !== 'cancelled' && (
                              <button
                                type="button"
                                className="ghost danger"
                                disabled={busy}
                                onClick={() => void changeStatus(t, 'suspended')}
                              >
                                Suspend
                              </button>
                            )}
                            {t.status !== 'cancelled' && (
                              <button
                                type="button"
                                className="ghost danger"
                                disabled={busy}
                                onClick={() => void changeStatus(t, 'cancelled')}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
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

      {drawer?.mode === 'edit' && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDrawer(null)}>
          <div
            className="modal-card tenant-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-tenant-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 id="edit-tenant-title">Edit tenant</h2>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Update details for {drawer.tenant.name} ({drawer.tenant.slug}).
              </p>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="tenant-modal-form" onSubmit={onEditSubmit}>
              <div className="modal-form-scroll form-grid">
              <FormField label="Display name" required error={fieldErrors.name}>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </FormField>
              <FormField label="Legal name" error={fieldErrors.legal_name}>
                <input
                  value={editForm.legal_name}
                  onChange={(e) => setEditForm({ ...editForm, legal_name: e.target.value })}
                />
              </FormField>
              <FormField label="Default currency" error={fieldErrors.default_currency}>
                <input
                  value={editForm.default_currency}
                  maxLength={3}
                  onChange={(e) => setEditForm({ ...editForm, default_currency: e.target.value.toUpperCase() })}
                />
              </FormField>
              <FormField label="Status" error={fieldErrors.status}>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </FormField>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={() => setDrawer(null)}>
                  Close
                </button>
                <button type="submit" disabled={editMutation.isPending}>
                  {editMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {drawer?.mode === 'plan' && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDrawer(null)}>
          <div
            className="modal-card tenant-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-plan-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 id="assign-plan-title">Assign plan</h2>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Apply a subscription plan to {drawer.tenant.name}. Previous active subscriptions will be cancelled.
              </p>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="tenant-modal-form" onSubmit={onPlanSubmit}>
              <div className="modal-form-scroll form-grid">
              <FormField label="Plan" required error={fieldErrors.plan_code}>
                <select
                  value={planForm.plan_code}
                  onChange={(e) => setPlanForm({ ...planForm, plan_code: e.target.value })}
                >
                  <option value="">Select a plan…</option>
                  {(plans as PlanOption[]).map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.name}
                      {p.price_monthly != null ? ` · ${p.currency ?? 'AED'} ${p.price_monthly}/mo` : ''}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Billing cycle" error={fieldErrors.billing_cycle}>
                <select
                  value={planForm.billing_cycle}
                  onChange={(e) => setPlanForm({ ...planForm, billing_cycle: e.target.value })}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </FormField>
              <FormField label="Subscription status" error={fieldErrors.status}>
                <select
                  value={planForm.status}
                  onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past due</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </FormField>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={() => setDrawer(null)}>
                  Close
                </button>
                <button type="submit" disabled={planMutation.isPending || (plans as PlanOption[]).length === 0}>
                  {planMutation.isPending ? 'Assigning…' : 'Assign plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
