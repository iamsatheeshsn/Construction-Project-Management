import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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

type FeatureRow = {
  id: number
  tenant_id: number
  feature_key: string
  is_enabled: boolean
  updated_at?: string | null
  tenant?: { id: number; name: string; slug?: string }
}

type TenantOption = {
  id: number
  name: string
  slug?: string
}

const CATALOG: Array<{ key: string; label: string; desc: string }> = [
  { key: 'procurement', label: 'Procurement', desc: 'Purchase orders, RFQs, and vendor buying' },
  { key: 'inventory', label: 'Inventory', desc: 'Stock levels, warehouses, and material tracking' },
  { key: 'equipment', label: 'Equipment', desc: 'Plant, tools, and equipment scheduling' },
  { key: 'subcontractors', label: 'Subcontractors', desc: 'Subcontractor packages and retention' },
  { key: 'documents', label: 'Documents', desc: 'Drawing registers and document control' },
  { key: 'billing', label: 'Billing', desc: 'Tenant invoices, claims, and payment tracking' },
  { key: 'gantt', label: 'Gantt', desc: 'Schedule timelines and dependency views' },
  { key: 'audit', label: 'Audit', desc: 'Platform and tenant activity audit trails' },
]

const emptyForm = {
  tenant_id: '',
  feature_key: '',
  custom_key: '',
  is_enabled: true,
}

function featureMeta(key: string) {
  const found = CATALOG.find((f) => f.key === key)
  if (found) return found
  const label = key
    .split(/[_-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
  return { key, label: label || key, desc: 'Custom tenant feature flag' }
}

function formatWhen(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

export function FeaturesPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()

  const [page, setPage] = useState(1)
  const [tenantFilter, setTenantFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const enabledParam =
    statusFilter === 'all' ? ('' as const) : statusFilter === 'enabled'

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['saas-features', page, tenantFilter, statusFilter, search],
    queryFn: () =>
      api.listSaasFeatures(page, tenantFilter ? Number(tenantFilter) : undefined, {
        isEnabled: enabledParam === '' ? '' : enabledParam,
        search: search.trim() || undefined,
        perPage: 10,
      }),
    placeholderData: keepPreviousData,
  })

  const { data: allFeaturesPage } = useQuery({
    queryKey: ['saas-features-summary'],
    queryFn: () => api.listSaasFeatures(1, undefined, { perPage: 100 }),
  })

  const { data: tenantsPage } = useQuery({
    queryKey: ['saas-tenants-options'],
    queryFn: () => api.listSaasTenants('', 1, '', 100),
  })

  const rows = (data?.data ?? []) as FeatureRow[]
  const tenants = (tenantsPage?.data ?? []) as TenantOption[]
  const allRows = (allFeaturesPage?.data ?? []) as FeatureRow[]

  const stats = useMemo(() => {
    const enabled = allRows.filter((f) => f.is_enabled).length
    const disabled = allRows.filter((f) => !f.is_enabled).length
    const tenantIds = new Set(allRows.map((f) => f.tenant_id))
    const uniqueKeys = new Set(allRows.map((f) => f.feature_key))
    return {
      total: allFeaturesPage?.meta?.total ?? allRows.length,
      enabled,
      disabled,
      tenants: tenantIds.size,
      catalog: uniqueKeys.size,
    }
  }, [allRows, allFeaturesPage])

  async function refreshFeatures() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['saas-features'] }),
      qc.invalidateQueries({ queryKey: ['saas-features-summary'] }),
    ])
  }

  const upsertMutation = useMutation({
    mutationFn: (payload: { tenant_id: number; feature_key: string; is_enabled: boolean }) =>
      api.upsertSaasFeature(payload),
    onSuccess: async (_data, vars) => {
      setError(null)
      setFieldErrors({})
      setModalOpen(false)
      setForm(emptyForm)
      await refreshFeatures()
      const meta = featureMeta(vars.feature_key)
      success({
        title: vars.is_enabled ? 'Feature enabled' : 'Feature disabled',
        message: `${meta.label} updated for the selected tenant.`,
      })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to save feature'))
    },
    onSettled: () => setTogglingId(null),
  })

  function openCreate(prefill?: Partial<typeof emptyForm>) {
    setForm({ ...emptyForm, ...prefill })
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setForm(emptyForm)
    setError(null)
    setFieldErrors({})
  }

  function resolveFeatureKey() {
    if (form.feature_key === '__custom') {
      return form.custom_key
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    }
    return form.feature_key.trim().toLowerCase()
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!form.tenant_id) {
      setFieldErrors({ tenant_id: 'Select a tenant.' })
      return
    }
    const key = resolveFeatureKey()
    if (!key) {
      setFieldErrors({
        feature_key: form.feature_key === '__custom' ? 'Enter a feature key.' : 'Select a feature.',
      })
      return
    }

    upsertMutation.mutate({
      tenant_id: Number(form.tenant_id),
      feature_key: key,
      is_enabled: form.is_enabled,
    })
  }

  async function onToggle(row: FeatureRow) {
    const next = !row.is_enabled
    const meta = featureMeta(row.feature_key)
    const tenantName = row.tenant?.name ?? `Tenant #${row.tenant_id}`

    if (!next) {
      const ok = await confirm({
        title: 'Disable feature?',
        message: `Turn off “${meta.label}” for ${tenantName}? Users in that tenant may lose access to related modules.`,
        confirmLabel: 'Disable',
      })
      if (!ok) return
    }

    setError(null)
    setTogglingId(row.id)
    upsertMutation.mutate({
      tenant_id: row.tenant_id,
      feature_key: row.feature_key,
      is_enabled: next,
    })
  }

  const busy = upsertMutation.isPending

  return (
    <div className="stack features-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">SaaS</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Platform features</span>
          </div>
          <h1 className="page-header-title">Feature management</h1>
          <p className="page-header-desc">
            Enable or disable feature flags per tenant. Changes apply immediately to that workspace.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="button-link" onClick={() => openCreate()}>
            Add feature flag
          </button>
          <Link className="ghost-link" to="/admin/saas/tenants">
            Tenants
          </Link>
          <Link className="ghost-link" to="/admin/saas/plans">
            Plans
          </Link>
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats features-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">All flags</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat tone-success">
          <span className="tenant-stat-label">Enabled</span>
          <strong className="tenant-stat-value">{stats.enabled}</strong>
        </div>
        <div className="tenant-stat tone-warn">
          <span className="tenant-stat-label">Disabled</span>
          <strong className="tenant-stat-value">{stats.disabled}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Tenants covered</span>
          <strong className="tenant-stat-value">{stats.tenants}</strong>
          <span className="tenant-stat-hint">{stats.catalog} unique keys</span>
        </div>
      </section>

      <section className="panel features-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Feature flags</h2>
            <p className="muted small">
              {data?.meta?.total ?? rows.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search features</span>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search feature or tenant…"
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
              value={tenantFilter}
              onChange={(e) => {
                setTenantFilter(e.target.value)
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

            <div className="tenants-status-chips" role="tablist" aria-label="Filter by status">
              {(
                [
                  { value: 'all' as const, label: 'All', count: stats.total },
                  { value: 'enabled' as const, label: 'Enabled', count: stats.enabled },
                  { value: 'disabled' as const, label: 'Disabled', count: stats.disabled },
                ]
              ).map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === f.value}
                  className={`tenants-chip${statusFilter === f.value ? ' active' : ''}`}
                  onClick={() => {
                    setStatusFilter(f.value)
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
          <p className="muted tenants-empty">Loading feature flags…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No feature flags found</h3>
            <p className="muted">
              {search || tenantFilter || statusFilter !== 'all'
                ? 'Try clearing filters or adjusting your search.'
                : 'Add a feature flag to control module access for a tenant.'}
            </p>
            {!search && !tenantFilter && statusFilter === 'all' && (
              <button type="button" className="button-link" onClick={() => openCreate()}>
                Add feature flag
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table features-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Feature</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const meta = featureMeta(row.feature_key)
                    const tenantName = row.tenant?.name ?? `Tenant #${row.tenant_id}`
                    const isBusy = togglingId === row.id && busy
                    return (
                      <tr key={row.id} className={row.is_enabled ? '' : 'features-row-off'}>
                        <td>
                          <div className="features-tenant">
                            <span className="features-avatar" aria-hidden>
                              {initials(tenantName)}
                            </span>
                            <div>
                              <strong>{tenantName}</strong>
                              {row.tenant?.slug ? (
                                <span className="muted small">{row.tenant.slug}</span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="features-key-cell">
                            <strong>{meta.label}</strong>
                            <code className="features-key">{row.feature_key}</code>
                            <span className="muted small">{meta.desc}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${row.is_enabled ? 'status-active' : 'status-cancelled'}`}>
                            {row.is_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          <span className="muted small">{formatWhen(row.updated_at)}</span>
                        </td>
                        <td>
                          <div className="features-actions">
                            <button
                              type="button"
                              className={`feature-switch${row.is_enabled ? ' on' : ''}`}
                              role="switch"
                              aria-checked={row.is_enabled}
                              aria-label={`${row.is_enabled ? 'Disable' : 'Enable'} ${meta.label} for ${tenantName}`}
                              disabled={isBusy || busy}
                              onClick={() => onToggle(row)}
                            >
                              <span className="feature-switch-thumb" />
                              <span className="feature-switch-label">
                                {isBusy ? 'Saving…' : row.is_enabled ? 'On' : 'Off'}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              disabled={busy}
                              onClick={() =>
                                openCreate({
                                  tenant_id: String(row.tenant_id),
                                  feature_key: CATALOG.some((c) => c.key === row.feature_key)
                                    ? row.feature_key
                                    : '__custom',
                                  custom_key: CATALOG.some((c) => c.key === row.feature_key)
                                    ? ''
                                    : row.feature_key,
                                  is_enabled: row.is_enabled,
                                })
                              }
                            >
                              Edit
                            </button>
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

      <section className="panel features-catalog">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Platform catalog</h2>
            <p className="muted small">Standard modules provisioned for new tenants</p>
          </div>
        </div>
        <div className="features-catalog-grid">
          {CATALOG.map((item) => {
            const enabledCount = allRows.filter((f) => f.feature_key === item.key && f.is_enabled).length
            const totalCount = allRows.filter((f) => f.feature_key === item.key).length
            return (
              <article key={item.key} className="features-catalog-card">
                <div className="features-catalog-top">
                  <strong>{item.label}</strong>
                  <code className="features-key">{item.key}</code>
                </div>
                <p className="muted small">{item.desc}</p>
                <div className="features-catalog-meta">
                  <span>
                    {enabledCount}/{totalCount || tenants.length || 0} enabled
                  </span>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      openCreate({
                        feature_key: item.key,
                        is_enabled: true,
                        tenant_id: tenantFilter || '',
                      })
                    }
                  >
                    Assign
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card features-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="features-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="features-modal-title">Add feature flag</h2>
                <p className="muted small">Create or update a flag for one tenant workspace.</p>
              </div>
              <button type="button" className="ghost" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="features-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid">
              <FormField label="Tenant" required error={fieldErrors.tenant_id}>
                <select
                  value={form.tenant_id}
                  onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                >
                  <option value="">Select tenant…</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Feature" required error={fieldErrors.feature_key}>
                <select
                  value={form.feature_key}
                  onChange={(e) => setForm({ ...form, feature_key: e.target.value })}
                >
                  <option value="">Select feature…</option>
                  {CATALOG.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label} ({f.key})
                    </option>
                  ))}
                  <option value="__custom">Custom key…</option>
                </select>
              </FormField>

              {form.feature_key === '__custom' && (
                <FormField label="Custom key" required error={fieldErrors.feature_key}>
                  <input
                    placeholder="e.g. rfi, boq, mobile_app"
                    value={form.custom_key}
                    onChange={(e) => setForm({ ...form, custom_key: e.target.value })}
                  />
                </FormField>
              )}

              <label className="checkbox features-modal-check">
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
                />
                Enable this feature for the tenant
              </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={busy}>
                  {busy ? 'Saving…' : 'Save feature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
