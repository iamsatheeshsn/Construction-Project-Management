import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import * as api from '../../services/api/saasRbacApi'
import {
  FormField,
  Pagination,
  clearFieldError,
  getErrorMessage,
  getFieldErrors,
  useConfirm,
  useSuccess,
  type FieldErrors,
} from '../../ui'

type TrialTenant = {
  id: number
  name: string
  slug: string
  status: string
  trial_ends_at?: string | null
  subscriptions?: Array<{
    status?: string
    billing_cycle?: string
    plan?: { code?: string; name?: string } | null
  }>
}

type PlanOption = {
  id: number
  code: string
  name: string
  price_monthly?: number | string
  price_yearly?: number | string
  currency?: string
}

const EXTEND_PRESETS = [7, 14, 30]

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function daysRemaining(value?: string | null) {
  if (!value) return null
  const end = new Date(value)
  if (Number.isNaN(end.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function urgencyTone(days: number | null) {
  if (days == null) return 'neutral'
  if (days < 0) return 'danger'
  if (days <= 3) return 'danger'
  if (days <= 7) return 'warn'
  return 'ok'
}

function formatMoney(amount?: number | string, currency = 'AED') {
  const n = Number(amount ?? 0)
  if (Number.isNaN(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
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

export function TrialsPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()
  const { tenant: activeTenant, switchTenant } = useAuth()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'soon' | 'critical'>('all')
  const [extendDays, setExtendDays] = useState<Record<number, number>>({})
  const [convertPlan, setConvertPlan] = useState<Record<number, string>>({})
  const [convertCycle, setConvertCycle] = useState<Record<number, 'monthly' | 'yearly'>>({})
  const [convertOpenId, setConvertOpenId] = useState<number | null>(null)
  const [switchingId, setSwitchingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['saas-trials', page],
    queryFn: () => api.listSaasTrials(page),
    placeholderData: keepPreviousData,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['saas-plans-active'],
    queryFn: () => api.listSaasPlans(true),
  })

  const planList = plans as PlanOption[]
  const rows = (data?.data ?? []) as TrialTenant[]

  const enriched = useMemo(() => {
    return rows.map((t) => {
      const days = daysRemaining(t.trial_ends_at)
      return { ...t, daysLeft: days, tone: urgencyTone(days) }
    })
  }, [rows])

  const stats = useMemo(() => {
    const total = data?.meta?.total ?? enriched.length
    const soon = enriched.filter((t) => t.daysLeft != null && t.daysLeft >= 0 && t.daysLeft <= 7).length
    const critical = enriched.filter((t) => t.daysLeft != null && t.daysLeft <= 3).length
    const expired = enriched.filter((t) => t.daysLeft != null && t.daysLeft < 0).length
    return { total, soon, critical, expired }
  }, [data?.meta?.total, enriched])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter((t) => {
      if (urgencyFilter === 'soon' && !(t.daysLeft != null && t.daysLeft >= 0 && t.daysLeft <= 7)) return false
      if (urgencyFilter === 'critical' && !(t.daysLeft != null && t.daysLeft <= 3)) return false
      if (!q) return true
      return t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    })
  }, [enriched, search, urgencyFilter])

  async function refreshRelated() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['saas-trials'] }),
      qc.invalidateQueries({ queryKey: ['saas-tenants'] }),
      qc.invalidateQueries({ queryKey: ['saas-tenants-summary'] }),
      qc.invalidateQueries({ queryKey: ['saas-billing'] }),
      qc.invalidateQueries({ queryKey: ['dashboard-saas-trials'] }),
      qc.invalidateQueries({ queryKey: ['dashboard-saas-tenants'] }),
    ])
  }

  const extendMutation = useMutation({
    mutationFn: ({ id, days }: { id: number; days: number }) => api.extendSaasTrial(id, days),
    onSuccess: async (_res, vars) => {
      await refreshRelated()
      success({
        title: 'Trial extended',
        message: `Trial extended by ${vars.days} day${vars.days === 1 ? '' : 's'}.`,
      })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to extend trial'))
    },
  })

  const convertMutation = useMutation({
    mutationFn: ({
      id,
      plan_code,
      billing_cycle,
    }: {
      id: number
      plan_code: string
      billing_cycle: 'monthly' | 'yearly'
    }) => api.convertSaasTrial(id, { plan_code, billing_cycle }),
    onSuccess: async () => {
      setConvertOpenId(null)
      await refreshRelated()
      success({ title: 'Trial converted', message: 'Tenant moved to a paid subscription with an open invoice.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to convert trial'))
    },
  })

  async function onExtend(tenant: TrialTenant, days: number) {
    if (!days || days < 1 || days > 90) {
      setError('Choose between 1 and 90 days to extend.')
      return
    }
    const ok = await confirm({
      title: 'Extend trial?',
      message: `Extend the trial for “${tenant.name}” by ${days} day${days === 1 ? '' : 's'}? New end date will be calculated from the current trial end (or today if expired).`,
      confirmLabel: 'Extend',
    })
    if (!ok) return
    setError(null)
    setFieldErrors({})
    extendMutation.mutate({ id: tenant.id, days })
  }

  async function onConvert(tenant: TrialTenant) {
    const planCode = convertPlan[tenant.id] ?? planList[0]?.code ?? ''
    const cycle = convertCycle[tenant.id] ?? 'monthly'
    if (!planCode) {
      setFieldErrors({ plan_code: 'Select a plan to convert this trial.' })
      setError('Select a plan to convert this trial.')
      return
    }
    const plan = planList.find((p) => p.code === planCode)
    const amount =
      cycle === 'yearly'
        ? formatMoney(plan?.price_yearly, plan?.currency ?? 'AED')
        : formatMoney(plan?.price_monthly, plan?.currency ?? 'AED')

    const ok = await confirm({
      title: 'Convert trial to paid?',
      message: `Convert “${tenant.name}” to the ${plan?.name ?? planCode} plan (${cycle}). An open invoice for ${amount} will be created.`,
      confirmLabel: 'Convert to paid',
    })
    if (!ok) return
    setError(null)
    setFieldErrors({})
    convertMutation.mutate({ id: tenant.id, plan_code: planCode, billing_cycle: cycle })
  }

  async function onSwitch(tenant: TrialTenant) {
    if (activeTenant?.id === tenant.id) return
    setSwitchingId(tenant.id)
    setError(null)
    try {
      await switchTenant(tenant.id)
      await qc.invalidateQueries()
      success({ title: 'Workspace switched', message: `You are now viewing ${tenant.name}.` })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to switch tenant'))
    } finally {
      setSwitchingId(null)
    }
  }

  const busy = extendMutation.isPending || convertMutation.isPending
  const convertTenant = convertOpenId != null ? enriched.find((t) => t.id === convertOpenId) : null

  return (
    <div className="stack trials-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">SaaS</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Trial lifecycle</span>
          </div>
          <h1 className="page-header-title">Trial management</h1>
          <p className="page-header-desc">
            Monitor trial end dates, extend grace periods, or convert workspaces to paid subscriptions.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="button-link" to="/admin/saas/registration">
            Register tenant
          </Link>
          <Link className="ghost-link" to="/admin/saas/billing">
            Billing
          </Link>
          <Link className="ghost-link" to="/admin/saas/tenants">
            Tenants
          </Link>
        </div>
      </header>

      {error && !convertTenant && <div className="error">{error}</div>}

      <section className="tenant-stats trials-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Active trials</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat tone-warn">
          <span className="tenant-stat-label">Ending ≤ 7 days</span>
          <strong className="tenant-stat-value">{stats.soon}</strong>
        </div>
        <div className="tenant-stat tone-danger">
          <span className="tenant-stat-label">Critical ≤ 3 days</span>
          <strong className="tenant-stat-value">{stats.critical}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Expired (page)</span>
          <strong className="tenant-stat-value">{stats.expired}</strong>
        </div>
      </section>

      <section className="panel trials-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Trial workspaces</h2>
            <p className="muted small">
              {filtered.length} shown
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search trials</span>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search tenant name or slug…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="tenants-status-chips" role="tablist" aria-label="Filter by urgency">
              {(
                [
                  { value: 'all', label: 'All', count: enriched.length },
                  { value: 'soon', label: '≤ 7 days', count: stats.soon },
                  { value: 'critical', label: 'Critical', count: stats.critical },
                ] as const
              ).map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={urgencyFilter === f.value}
                  className={`tenants-chip${urgencyFilter === f.value ? ' active' : ''}`}
                  onClick={() => setUrgencyFilter(f.value)}
                >
                  {f.label}
                  <span>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading trials…</p>
        ) : filtered.length === 0 ? (
          <div className="tenants-empty">
            <h3>No trials found</h3>
            <p className="muted">
              {search || urgencyFilter !== 'all'
                ? 'Try clearing filters or adjusting your search.'
                : 'There are no tenants currently on a trial. Register a new tenant to start one.'}
            </p>
            {!search && urgencyFilter === 'all' && (
              <Link className="button-link" to="/admin/saas/registration">
                Register tenant
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="trials-grid">
              {filtered.map((t) => {
                const sub = t.subscriptions?.[0]
                const days = extendDays[t.id] ?? 7
                const selected = activeTenant?.id === t.id
                const tone = t.tone
                const daysLabel =
                  t.daysLeft == null
                    ? 'No end date'
                    : t.daysLeft < 0
                      ? `${Math.abs(t.daysLeft)} day${Math.abs(t.daysLeft) === 1 ? '' : 's'} overdue`
                      : t.daysLeft === 0
                        ? 'Ends today'
                        : `${t.daysLeft} day${t.daysLeft === 1 ? '' : 's'} left`

                return (
                  <article key={t.id} className={`trial-card tone-${tone}${selected ? ' is-selected' : ''}`}>
                    <div className="trial-card-top">
                      <div className="tenant-identity">
                        <span className="tenant-avatar" aria-hidden>
                          {initials(t.name)}
                        </span>
                        <div>
                          <div className="tenant-name-row">
                            <h3>{t.name}</h3>
                            {selected && <span className="badge status-selected">Selected</span>}
                          </div>
                          <div className="muted small">{t.slug}</div>
                        </div>
                      </div>
                      <div className={`trial-urgency tone-${tone}`}>
                        <strong>{daysLabel}</strong>
                        <span>{formatDate(t.trial_ends_at)}</span>
                      </div>
                    </div>

                    <div className="trial-meta">
                      <div>
                        <span className="muted small">Status</span>
                        <strong className="badge status-trial">{t.status}</strong>
                      </div>
                      <div>
                        <span className="muted small">Trial plan</span>
                        <strong>{sub?.plan?.name ?? sub?.plan?.code ?? 'No plan'}</strong>
                      </div>
                      <div>
                        <span className="muted small">Subscription</span>
                        <strong>{sub?.status ?? '—'}</strong>
                      </div>
                    </div>

                    <div className="trial-extend">
                      <div className="trial-extend-head">
                        <strong>Extend trial</strong>
                        {fieldErrors.days && convertOpenId == null ? (
                          <span className="field-error">{fieldErrors.days}</span>
                        ) : null}
                      </div>
                      <div className="trial-extend-row">
                        <div className="register-trial-presets">
                          {EXTEND_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className={`tenants-chip${days === preset ? ' active' : ''}`}
                              disabled={busy}
                              onClick={() => setExtendDays({ ...extendDays, [t.id]: preset })}
                            >
                              +{preset}d
                            </button>
                          ))}
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          aria-label={`Extend days for ${t.name}`}
                          value={days}
                          disabled={busy}
                          onChange={(e) =>
                            setExtendDays({ ...extendDays, [t.id]: Number(e.target.value) })
                          }
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onExtend(t, days)}
                        >
                          {extendMutation.isPending ? 'Extending…' : 'Extend'}
                        </button>
                      </div>
                    </div>

                    <div className="trial-card-actions">
                      <button
                        type="button"
                        className="ghost"
                        disabled={busy}
                        onClick={() => {
                          setError(null)
                          setFieldErrors({})
                          setConvertPlan((prev) => ({
                            ...prev,
                            [t.id]:
                              prev[t.id] ??
                              sub?.plan?.code ??
                              planList.find((p) => p.code === 'professional')?.code ??
                              planList[0]?.code ??
                              '',
                          }))
                          setConvertCycle((prev) => ({ ...prev, [t.id]: prev[t.id] ?? 'monthly' }))
                          setConvertOpenId(t.id)
                        }}
                      >
                        Convert to paid
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        disabled={busy || selected || switchingId === t.id}
                        onClick={() => void onSwitch(t)}
                      >
                        {selected ? 'Current' : switchingId === t.id ? 'Switching…' : 'Switch'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
            <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
          </>
        )}
      </section>

      {convertTenant && (
        <div className="modal-backdrop" role="presentation" onClick={() => setConvertOpenId(null)}>
          <div
            className="modal-card trial-convert-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="convert-trial-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 id="convert-trial-title">Convert to paid</h2>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Move “{convertTenant.name}” off trial and create an open invoice for the selected plan.
              </p>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="modal-form-scroll form-grid plan-form-grid">
              <FormField label="Plan" required error={fieldErrors.plan_code} className="span-2">
                <div className="trial-plan-pick" role="radiogroup" aria-label="Paid plan">
                  {planList.map((plan) => {
                    const selected =
                      (convertPlan[convertTenant.id] ?? planList[0]?.code) === plan.code
                    const cycle = convertCycle[convertTenant.id] ?? 'monthly'
                    const price =
                      cycle === 'yearly'
                        ? formatMoney(plan.price_yearly, plan.currency ?? 'AED')
                        : formatMoney(plan.price_monthly, plan.currency ?? 'AED')
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`register-plan-card${selected ? ' active' : ''}`}
                        onClick={() => {
                          setFieldErrors((prev) => clearFieldError(prev, 'plan_code'))
                          setConvertPlan({ ...convertPlan, [convertTenant.id]: plan.code })
                        }}
                      >
                        <div className="register-plan-top">
                          <strong>{plan.name}</strong>
                          <span className="register-plan-price">
                            {price}
                            <small>/{cycle === 'yearly' ? 'yr' : 'mo'}</small>
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </FormField>

              <FormField label="Billing cycle" required error={fieldErrors.billing_cycle} className="span-2">
                <div className="tenants-status-chips">
                  {(['monthly', 'yearly'] as const).map((cycle) => (
                    <button
                      key={cycle}
                      type="button"
                      className={`tenants-chip${(convertCycle[convertTenant.id] ?? 'monthly') === cycle ? ' active' : ''}`}
                      onClick={() => setConvertCycle({ ...convertCycle, [convertTenant.id]: cycle })}
                    >
                      {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="ghost"
                disabled={convertMutation.isPending}
                onClick={() => setConvertOpenId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={convertMutation.isPending || planList.length === 0}
                onClick={() => void onConvert(convertTenant)}
              >
                {convertMutation.isPending ? 'Converting…' : 'Convert to paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
