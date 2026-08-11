import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api/saasRbacApi'
import {
  FormField,
  getErrorMessage,
  getFieldErrors,
  useConfirm,
  useSuccess,
  type FieldErrors,
} from '../../ui'

type Plan = {
  id: number
  code: string
  name: string
  description?: string | null
  price_monthly: number | string
  price_yearly: number | string
  currency?: string
  max_users?: number | null
  max_projects?: number | null
  is_active?: boolean
  sort_order?: number
}

type PlanForm = {
  code: string
  name: string
  description: string
  price_monthly: number | ''
  price_yearly: number | ''
  currency: string
  max_users: number | ''
  max_projects: number | ''
  unlimited_users: boolean
  unlimited_projects: boolean
  is_active: boolean
  sort_order: number | ''
}

const emptyForm = (): PlanForm => ({
  code: '',
  name: '',
  description: '',
  price_monthly: 0,
  price_yearly: 0,
  currency: 'AED',
  max_users: 5,
  max_projects: 3,
  unlimited_users: false,
  unlimited_projects: false,
  is_active: true,
  sort_order: 0,
})

function formatMoney(amount?: number | string, currency = 'AED') {
  const n = Number(amount ?? 0)
  if (Number.isNaN(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatLimit(max?: number | null) {
  return max == null ? 'Unlimited' : String(max)
}

function yearlySavings(monthly?: number | string, yearly?: number | string) {
  const m = Number(monthly ?? 0) * 12
  const y = Number(yearly ?? 0)
  if (!m || Number.isNaN(m) || Number.isNaN(y) || y >= m) return null
  return Math.round(((m - y) / m) * 100)
}

function slugCode(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

export function PlansPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()

  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [codeTouched, setCodeTouched] = useState(false)
  const [form, setForm] = useState<PlanForm>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { data: plans = [], isLoading, isFetching } = useQuery({
    queryKey: ['saas-plans'],
    queryFn: () => api.listSaasPlans(false),
  })

  const planList = plans as Plan[]

  const stats = useMemo(() => {
    const active = planList.filter((p) => p.is_active !== false).length
    return {
      total: planList.length,
      active,
      inactive: planList.length - active,
    }
  }, [planList])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return planList
      .filter((p) => {
        if (filter === 'active' && p.is_active === false) return false
        if (filter === 'inactive' && p.is_active !== false) return false
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
        )
      })
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
  }, [planList, filter, search])

  async function refreshPlans() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['saas-plans'] }),
      qc.invalidateQueries({ queryKey: ['saas-plans-active'] }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createSaasPlan({
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_monthly: Number(form.price_monthly),
        price_yearly: Number(form.price_yearly),
        currency: form.currency.trim().toUpperCase() || 'AED',
        max_users: form.unlimited_users ? null : Number(form.max_users) || null,
        max_projects: form.unlimited_projects ? null : Number(form.max_projects) || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      }),
    onSuccess: async () => {
      closeModal()
      await refreshPlans()
      success({ title: 'Plan created', message: 'Subscription plan is available for assignment.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create plan'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateSaasPlan(editingId!, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_monthly: Number(form.price_monthly),
        price_yearly: Number(form.price_yearly),
        currency: form.currency.trim().toUpperCase() || 'AED',
        max_users: form.unlimited_users ? null : Number(form.max_users) || null,
        max_projects: form.unlimited_projects ? null : Number(form.max_projects) || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      }),
    onSuccess: async () => {
      closeModal()
      await refreshPlans()
      success({ title: 'Plan updated', message: 'Prices and limits were saved.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to update plan'))
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.updateSaasPlan(id, { is_active }),
    onSuccess: async (_res, vars) => {
      await refreshPlans()
      success({
        title: vars.is_active ? 'Plan activated' : 'Plan deactivated',
        message: vars.is_active
          ? 'Plan is available for new tenant assignments.'
          : 'Plan is hidden from new tenant registration.',
      })
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to update plan status')),
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setCodeTouched(false)
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditingId(plan.id)
    setCodeTouched(true)
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      price_monthly: Number(plan.price_monthly),
      price_yearly: Number(plan.price_yearly),
      currency: plan.currency ?? 'AED',
      max_users: plan.max_users ?? '',
      max_projects: plan.max_projects ?? '',
      unlimited_users: plan.max_users == null,
      unlimited_projects: plan.max_projects == null,
      is_active: plan.is_active !== false,
      sort_order: plan.sort_order ?? 0,
    })
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm())
    setCodeTouched(false)
    setError(null)
    setFieldErrors({})
  }

  async function onToggleActive(plan: Plan) {
    const next = plan.is_active === false
    const ok = await confirm({
      title: next ? 'Activate plan?' : 'Deactivate plan?',
      message: next
        ? `Make “${plan.name}” available for tenant registration and assignment?`
        : `Hide “${plan.name}” from new tenant registration? Existing subscriptions are unchanged.`,
      confirmLabel: next ? 'Activate' : 'Deactivate',
    })
    if (!ok) return
    setError(null)
    toggleMutation.mutate({ id: plan.id, is_active: next })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!editingId && !form.code.trim()) {
      setFieldErrors({ code: 'Code is required.' })
      return
    }
    if (!form.name.trim()) {
      setFieldErrors({ name: 'Name is required.' })
      return
    }
    if (form.price_monthly === '' || Number(form.price_monthly) < 0) {
      setFieldErrors({ price_monthly: 'Enter a valid monthly price.' })
      return
    }
    if (form.price_yearly === '' || Number(form.price_yearly) < 0) {
      setFieldErrors({ price_yearly: 'Enter a valid yearly price.' })
      return
    }
    if (!form.unlimited_users && (!form.max_users || Number(form.max_users) < 1)) {
      setFieldErrors({ max_users: 'Enter a max user count or enable Unlimited.' })
      return
    }
    if (!form.unlimited_projects && (!form.max_projects || Number(form.max_projects) < 1)) {
      setFieldErrors({ max_projects: 'Enter a max project count or enable Unlimited.' })
      return
    }

    if (editingId) updateMutation.mutate()
    else createMutation.mutate()
  }

  const pending = createMutation.isPending || updateMutation.isPending
  const busy = pending || toggleMutation.isPending

  return (
    <div className="stack plans-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">SaaS</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Subscription catalog</span>
          </div>
          <h1 className="page-header-title">Subscription plans</h1>
          <p className="page-header-desc">
            Define pricing, seat limits, and project limits used when registering or assigning tenants.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="button-link" onClick={openCreate}>
            Create plan
          </button>
          <Link className="ghost-link" to="/admin/saas/registration">
            Register tenant
          </Link>
          <Link className="ghost-link" to="/admin/saas/tenants">
            Tenants
          </Link>
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats plans-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Total plans</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat tone-success">
          <span className="tenant-stat-label">Active</span>
          <strong className="tenant-stat-value">{stats.active}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Inactive</span>
          <strong className="tenant-stat-value">{stats.inactive}</strong>
        </div>
      </section>

      <section className="panel plans-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Plan catalog</h2>
            <p className="muted small">
              {filtered.length} shown
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search plans</span>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="tenants-status-chips" role="tablist" aria-label="Filter plans">
              {(
                [
                  { value: 'all', label: 'All', count: stats.total },
                  { value: 'active', label: 'Active', count: stats.active },
                  { value: 'inactive', label: 'Inactive', count: stats.inactive },
                ] as const
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
          <p className="muted tenants-empty">Loading plans…</p>
        ) : filtered.length === 0 ? (
          <div className="tenants-empty">
            <h3>No plans found</h3>
            <p className="muted">
              {search || filter !== 'all'
                ? 'Try clearing filters or adjusting your search.'
                : 'Create your first subscription plan to start provisioning tenants.'}
            </p>
            {!search && filter === 'all' && (
              <button type="button" className="button-link" onClick={openCreate}>
                Create plan
              </button>
            )}
          </div>
        ) : (
          <div className="plans-grid">
            {filtered.map((plan) => {
              const active = plan.is_active !== false
              const save = yearlySavings(plan.price_monthly, plan.price_yearly)
              return (
                <article key={plan.id} className={`plan-card${active ? '' : ' is-inactive'}`}>
                  <div className="plan-card-top">
                    <div>
                      <div className="plan-card-name-row">
                        <h3>{plan.name}</h3>
                        <span className={`badge ${active ? 'status-active' : 'status-cancelled'}`}>
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="muted small">{plan.code}</div>
                    </div>
                    <div className="plan-card-price">
                      <strong>{formatMoney(plan.price_monthly, plan.currency ?? 'AED')}</strong>
                      <span className="muted small">/ month</span>
                    </div>
                  </div>

                  {plan.description ? <p className="plan-card-desc">{plan.description}</p> : null}

                  <ul className="plan-card-limits">
                    <li>
                      <span>Users</span>
                      <strong>{formatLimit(plan.max_users)}</strong>
                    </li>
                    <li>
                      <span>Projects</span>
                      <strong>{formatLimit(plan.max_projects)}</strong>
                    </li>
                    <li>
                      <span>Yearly</span>
                      <strong>{formatMoney(plan.price_yearly, plan.currency ?? 'AED')}</strong>
                    </li>
                    {save != null && (
                      <li>
                        <span>Yearly save</span>
                        <strong>{save}%</strong>
                      </li>
                    )}
                  </ul>

                  <div className="plan-card-actions">
                    <button type="button" className="ghost" disabled={busy} onClick={() => openEdit(plan)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className={active ? 'ghost danger' : 'ghost'}
                      disabled={busy}
                      onClick={() => void onToggleActive(plan)}
                    >
                      {active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card plan-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 id="plan-modal-title">{editingId ? 'Edit plan' : 'Create plan'}</h2>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {editingId
                  ? 'Update pricing and limits. Code cannot be changed after creation.'
                  : 'Define a new subscription tier for tenant provisioning.'}
              </p>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="plan-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid plan-form-grid">
              {!editingId && (
                <FormField label="Code" required error={fieldErrors.code}>
                  <input
                    placeholder="e.g. growth"
                    value={form.code}
                    onChange={(e) => {
                      setCodeTouched(true)
                      setForm({ ...form, code: slugCode(e.target.value) })
                    }}
                  />
                </FormField>
              )}

              <FormField label="Name" required error={fieldErrors.name} className={editingId ? 'span-2' : undefined}>
                <input
                  placeholder="e.g. Growth"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setForm((prev) => ({
                      ...prev,
                      name,
                      code: !editingId && !codeTouched ? slugCode(name) : prev.code,
                    }))
                  }}
                />
              </FormField>

              <FormField label="Description" error={fieldErrors.description} className="span-2">
                <textarea
                  rows={2}
                  placeholder="Short summary shown during registration"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </FormField>

              <FormField label="Monthly price" required error={fieldErrors.price_monthly}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price_monthly}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price_monthly: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                />
              </FormField>

              <FormField label="Yearly price" required error={fieldErrors.price_yearly}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price_yearly}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price_yearly: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                />
              </FormField>

              <FormField label="Currency" error={fieldErrors.currency}>
                <input
                  maxLength={3}
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                />
              </FormField>

              <FormField label="Sort order" error={fieldErrors.sort_order}>
                <input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sort_order: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                />
              </FormField>

              <FormField label="Max users" error={fieldErrors.max_users}>
                <div className="plan-limit-field">
                  <input
                    type="number"
                    min={1}
                    disabled={form.unlimited_users}
                    value={form.unlimited_users ? '' : form.max_users}
                    placeholder={form.unlimited_users ? 'Unlimited' : 'e.g. 25'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_users: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                  />
                  <label className="checkbox plan-unlimited">
                    <input
                      type="checkbox"
                      checked={form.unlimited_users}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          unlimited_users: e.target.checked,
                          max_users: e.target.checked ? '' : form.max_users || 5,
                        })
                      }
                    />
                    Unlimited
                  </label>
                </div>
              </FormField>

              <FormField label="Max projects" error={fieldErrors.max_projects}>
                <div className="plan-limit-field">
                  <input
                    type="number"
                    min={1}
                    disabled={form.unlimited_projects}
                    value={form.unlimited_projects ? '' : form.max_projects}
                    placeholder={form.unlimited_projects ? 'Unlimited' : 'e.g. 10'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_projects: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                  />
                  <label className="checkbox plan-unlimited">
                    <input
                      type="checkbox"
                      checked={form.unlimited_projects}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          unlimited_projects: e.target.checked,
                          max_projects: e.target.checked ? '' : form.max_projects || 3,
                        })
                      }
                    />
                    Unlimited
                  </label>
                </div>
              </FormField>

              <label className="checkbox span-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Active — available for registration and assignment
              </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={pending}>
                  Cancel
                </button>
                <button type="submit" disabled={pending}>
                  {pending ? 'Saving…' : editingId ? 'Save changes' : 'Create plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
