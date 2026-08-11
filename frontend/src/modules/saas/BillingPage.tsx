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

type Invoice = {
  id: number
  invoice_number: string
  amount: number | string
  currency?: string
  status: string
  due_at?: string | null
  paid_at?: string | null
  notes?: string | null
  period_start?: string | null
  period_end?: string | null
  tenant?: { id: number; name: string; slug?: string }
  subscription?: {
    plan?: { id?: number; code?: string; name?: string } | null
  } | null
}

type TenantOption = {
  id: number
  name: string
  slug?: string
}

const emptyForm = {
  tenant_id: '',
  amount: '',
  currency: 'AED',
  notes: '',
  due_at: '',
}

function formatMoney(amount?: number | string, currency = 'AED') {
  const n = Number(amount ?? 0)
  if (Number.isNaN(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function daysUntil(value?: string | null) {
  if (!value) return null
  const end = new Date(value)
  if (Number.isNaN(end.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function statusBadgeClass(status: string) {
  if (status === 'paid') return 'status-active'
  if (status === 'open') return 'status-trial'
  if (status === 'void') return 'status-cancelled'
  return ''
}

function dueTone(status: string, dueAt?: string | null) {
  if (status !== 'open') return 'neutral'
  const days = daysUntil(dueAt)
  if (days == null) return 'neutral'
  if (days < 0) return 'danger'
  if (days <= 3) return 'warn'
  return 'ok'
}

export function BillingPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['saas-billing', page, status, tenantFilter],
    queryFn: () => api.listSaasBilling(page, status, tenantFilter ? Number(tenantFilter) : undefined),
    placeholderData: keepPreviousData,
  })

  const { data: summaryPage } = useQuery({
    queryKey: ['saas-billing-summary'],
    queryFn: () => api.listSaasBilling(1, '', undefined),
  })

  const { data: openSummary } = useQuery({
    queryKey: ['saas-billing-open-summary'],
    queryFn: () => api.listSaasBilling(1, 'open', undefined),
  })

  const { data: paidSummary } = useQuery({
    queryKey: ['saas-billing-paid-summary'],
    queryFn: () => api.listSaasBilling(1, 'paid', undefined),
  })

  const { data: voidSummary } = useQuery({
    queryKey: ['saas-billing-void-summary'],
    queryFn: () => api.listSaasBilling(1, 'void', undefined),
  })

  const { data: tenantsPage } = useQuery({
    queryKey: ['saas-tenants-options'],
    queryFn: () => api.listSaasTenants('', 1, '', 100),
  })

  const invoices = (data?.data ?? []) as Invoice[]
  const tenants = (tenantsPage?.data ?? []) as TenantOption[]

  const stats = useMemo(() => {
    const openRows = (openSummary?.data ?? []) as Invoice[]
    const openAmount = openRows.reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0)
    return {
      total: summaryPage?.meta?.total ?? invoices.length,
      open: openSummary?.meta?.total ?? 0,
      paid: paidSummary?.meta?.total ?? 0,
      void: voidSummary?.meta?.total ?? 0,
      openAmount,
    }
  }, [summaryPage, openSummary, paidSummary, voidSummary, invoices.length])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter((inv) => {
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.tenant?.name ?? '').toLowerCase().includes(q) ||
        (inv.tenant?.slug ?? '').toLowerCase().includes(q) ||
        (inv.notes ?? '').toLowerCase().includes(q) ||
        (inv.subscription?.plan?.name ?? '').toLowerCase().includes(q)
      )
    })
  }, [invoices, search])

  async function refreshBilling() {
      await Promise.all([
      qc.invalidateQueries({ queryKey: ['saas-billing'] }),
      qc.invalidateQueries({ queryKey: ['saas-billing-summary'] }),
      qc.invalidateQueries({ queryKey: ['saas-billing-open-summary'] }),
      qc.invalidateQueries({ queryKey: ['saas-billing-paid-summary'] }),
      qc.invalidateQueries({ queryKey: ['saas-billing-void-summary'] }),
      qc.invalidateQueries({ queryKey: ['dashboard-saas-billing'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createSaasInvoice({
        tenant_id: Number(form.tenant_id),
        amount: Number(form.amount),
        currency: form.currency.trim().toUpperCase() || 'AED',
        notes: form.notes.trim() || undefined,
        due_at: form.due_at || undefined,
      }),
    onSuccess: async () => {
      setForm(emptyForm)
      setModalOpen(false)
      setError(null)
      setFieldErrors({})
      await refreshBilling()
      success({ title: 'Invoice created', message: 'Open invoice added to tenant billing.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create invoice'))
    },
  })

  const payMutation = useMutation({
    mutationFn: (id: number) => api.paySaasInvoice(id),
    onSuccess: async () => {
      await refreshBilling()
      success({ title: 'Invoice paid', message: 'Invoice marked as paid.' })
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to mark invoice paid')),
  })

  function openCreate() {
    setForm(emptyForm)
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

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    if (!form.tenant_id) {
      setFieldErrors({ tenant_id: 'Select a tenant.' })
      return
    }
    if (form.amount === '' || Number(form.amount) < 0) {
      setFieldErrors({ amount: 'Enter a valid amount.' })
      return
    }
    createMutation.mutate()
  }

  async function onMarkPaid(inv: Invoice) {
    const ok = await confirm({
      title: 'Mark invoice paid?',
      message: `Mark ${inv.invoice_number} for ${inv.tenant?.name ?? 'tenant'} (${formatMoney(inv.amount, inv.currency ?? 'AED')}) as paid?`,
      confirmLabel: 'Mark paid',
    })
    if (!ok) return
    setError(null)
    payMutation.mutate(inv.id)
  }

  const busy = createMutation.isPending || payMutation.isPending

  return (
    <div className="stack billing-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">SaaS</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Platform billing</span>
          </div>
          <h1 className="page-header-title">Tenant billing</h1>
          <p className="page-header-desc">
            Track SaaS invoices across tenants, create new charges, and mark open invoices as paid.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="button-link" onClick={openCreate}>
            Create invoice
          </button>
          <Link className="ghost-link" to="/admin/saas/trials">
            Trials
          </Link>
          <Link className="ghost-link" to="/admin/saas/tenants">
            Tenants
          </Link>
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats billing-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">All invoices</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat tone-warn">
          <span className="tenant-stat-label">Open</span>
          <strong className="tenant-stat-value">{stats.open}</strong>
        </div>
        <div className="tenant-stat tone-success">
          <span className="tenant-stat-label">Paid</span>
          <strong className="tenant-stat-value">{stats.paid}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Open amount (page 1)</span>
          <strong className="tenant-stat-value billing-stat-amount">
            {formatMoney(stats.openAmount, 'AED')}
          </strong>
        </div>
      </section>

      <section className="panel billing-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Invoices</h2>
            <p className="muted small">
              {data?.meta?.total ?? filtered.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search invoices</span>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search invoice, tenant, notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                  { value: '', label: 'All', count: stats.total },
                  { value: 'open', label: 'Open', count: stats.open },
                  { value: 'paid', label: 'Paid', count: stats.paid },
                  { value: 'void', label: 'Void', count: stats.void },
                ] as const
              ).map((f) => (
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
          <p className="muted tenants-empty">Loading invoices…</p>
        ) : filtered.length === 0 ? (
          <div className="tenants-empty">
            <h3>No invoices found</h3>
            <p className="muted">
              {search || status || tenantFilter
                ? 'Try clearing filters or adjusting your search.'
                : 'Create an invoice or convert a trial to generate the first billing record.'}
            </p>
            {!search && !status && !tenantFilter && (
              <button type="button" className="button-link" onClick={openCreate}>
                Create invoice
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table billing-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Tenant</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th>Plan / notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const tone = dueTone(inv.status, inv.due_at)
                    const days = daysUntil(inv.due_at)
                    const dueLabel =
                      inv.status !== 'open'
                        ? formatDate(inv.due_at)
                        : days == null
                          ? formatDate(inv.due_at)
                          : days < 0
                            ? `${Math.abs(days)}d overdue`
                            : days === 0
                              ? 'Due today'
                              : `${days}d left`
                    return (
                      <tr key={inv.id}>
                        <td>
                          <strong>{inv.invoice_number}</strong>
                          <div className="muted small">
                            {inv.period_start && inv.period_end
                              ? `${formatDate(inv.period_start)} – ${formatDate(inv.period_end)}`
                              : `Created #${inv.id}`}
                          </div>
                        </td>
                        <td>
                          <strong>{inv.tenant?.name ?? '—'}</strong>
                          {inv.tenant?.slug ? <div className="muted small">{inv.tenant.slug}</div> : null}
                        </td>
                        <td>
                          <strong>{formatMoney(inv.amount, inv.currency ?? 'AED')}</strong>
                        </td>
                        <td>
                          <span className={`badge ${statusBadgeClass(inv.status)}`}>
                            {inv.status}
                          </span>
                          {inv.paid_at ? (
                            <div className="muted small">Paid {formatDate(inv.paid_at)}</div>
                          ) : null}
                        </td>
                        <td>
                          <span className={`billing-due tone-${tone}`}>{dueLabel}</span>
                          {inv.status === 'open' && inv.due_at ? (
                            <div className="muted small">{formatDate(inv.due_at)}</div>
                          ) : null}
                        </td>
                        <td>
                          <div>{inv.subscription?.plan?.name ?? 'Manual invoice'}</div>
                          {inv.notes ? <div className="muted small">{inv.notes}</div> : null}
                        </td>
                        <td>
                          <div className="billing-actions">
                            {inv.status === 'open' && (
                              <button
                                type="button"
                                className="ghost"
                                disabled={busy}
                                onClick={() => void onMarkPaid(inv)}
                              >
                                {payMutation.isPending ? 'Updating…' : 'Mark paid'}
                              </button>
                            )}
                            {inv.status === 'paid' && (
                              <span className="muted small">Settled</span>
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

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card billing-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-invoice-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 id="create-invoice-title">Create invoice</h2>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Add an open invoice for a tenant. It will appear in their billing history immediately.
              </p>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="billing-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid plan-form-grid">
              <FormField label="Tenant" required error={fieldErrors.tenant_id} className="span-2">
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

              <FormField label="Amount" required error={fieldErrors.amount}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </FormField>

              <FormField label="Currency" error={fieldErrors.currency}>
                <input
                  maxLength={3}
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                />
              </FormField>

              <FormField label="Due date" error={fieldErrors.due_at} className="span-2">
                <input
                  type="date"
                  value={form.due_at}
                  onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                />
                <p className="muted small register-hint">Defaults to 14 days from today if left blank.</p>
              </FormField>

              <FormField label="Notes" error={fieldErrors.notes} className="span-2">
                <textarea
                  rows={3}
                  placeholder="Optional billing notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </FormField>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={createMutation.isPending}>
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || tenants.length === 0}>
                  {createMutation.isPending ? 'Creating…' : 'Create invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
