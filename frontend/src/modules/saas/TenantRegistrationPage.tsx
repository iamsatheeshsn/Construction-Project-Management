import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import * as api from '../../services/api/saasRbacApi'
import {
  FormField,
  clearFieldError,
  getErrorMessage,
  getFieldErrors,
  requireFields,
  useConfirm,
  useSuccess,
  type FieldErrors,
} from '../../ui'

type Plan = {
  id: number
  code: string
  name: string
  description?: string | null
  price_monthly?: number | string
  price_yearly?: number | string
  currency?: string
  max_users?: number | null
  max_projects?: number | null
}

type ProvisionResult = {
  tenant?: {
    id: number
    name: string
    slug: string
    status?: string
    trial_ends_at?: string | null
  }
  owner?: { id: number; name: string; email: string }
  subscription?: {
    status?: string
    billing_cycle?: string
    plan?: { name?: string; code?: string } | null
  } | null
  generated_password?: string | null
}

const emptyForm = {
  company_name: '',
  slug: '',
  legal_name: '',
  name: '',
  email: '',
  password: '',
  plan_code: '',
  trial_days: 14,
  billing_cycle: 'monthly',
  country_code: 'AE',
  default_currency: 'AED',
  brand_name: '',
  primary_color: '#1F4E79',
  accent_color: '#C47A11',
}

const TRIAL_PRESETS = [7, 14, 30, 60]

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function formatMoney(amount?: number | string, currency = 'AED') {
  const n = Number(amount ?? 0)
  if (Number.isNaN(n)) return `${currency} —`
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatLimit(max?: number | null) {
  return max == null ? 'Unlimited' : String(max)
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function TenantRegistrationPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()
  const { switchTenant, refreshTenants } = useAuth()

  const [form, setForm] = useState(emptyForm)
  const [slugTouched, setSlugTouched] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [result, setResult] = useState<ProvisionResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [switching, setSwitching] = useState(false)

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['saas-plans-active'],
    queryFn: () => api.listSaasPlans(true),
  })

  const planList = plans as Plan[]

  useEffect(() => {
    if (!form.plan_code && planList.length > 0) {
      const starter = planList.find((p) => p.code === 'starter') ?? planList[0]
      setForm((prev) => ({ ...prev, plan_code: starter.code }))
    }
  }, [form.plan_code, planList])

  useEffect(() => {
    if (slugTouched) return
    setForm((prev) => ({
      ...prev,
      slug: prev.company_name ? slugify(prev.company_name) : '',
    }))
  }, [form.company_name, slugTouched])

  const selectedPlan = useMemo(
    () => planList.find((p) => p.code === form.plan_code) ?? null,
    [planList, form.plan_code],
  )

  const trialEndsPreview = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + Number(form.trial_days || 14))
    return d
  }, [form.trial_days])

  const registerMutation = useMutation({
    mutationFn: () =>
      api.registerSaasTenant({
        company_name: form.company_name.trim(),
        slug: form.slug.trim() || undefined,
        legal_name: form.legal_name.trim() || undefined,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password.trim() || undefined,
        plan_code: form.plan_code || undefined,
        trial_days: Number(form.trial_days) || 14,
        billing_cycle: form.billing_cycle,
        country_code: form.country_code.trim().toUpperCase() || 'AE',
        default_currency: form.default_currency.trim().toUpperCase() || 'AED',
        brand_name: form.brand_name.trim() || undefined,
        primary_color: form.primary_color || undefined,
        accent_color: form.accent_color || undefined,
      }),
    onSuccess: async (res: ProvisionResult) => {
      setResult(res)
      setError(null)
      setFieldErrors({})
      setCopied(false)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['saas-tenants'] }),
        qc.invalidateQueries({ queryKey: ['saas-tenants-summary'] }),
        qc.invalidateQueries({ queryKey: ['saas-trials'] }),
        qc.invalidateQueries({ queryKey: ['dashboard-saas-tenants'] }),
        qc.invalidateQueries({ queryKey: ['dashboard-saas-usage'] }),
        refreshTenants(),
      ])
      success({
        title: 'Tenant provisioned',
        message: res?.tenant?.name
          ? `“${res.tenant.name}” is ready (${res.tenant.slug}).`
          : 'Tenant provisioned successfully.',
      })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to register tenant'))
      setResult(null)
    },
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const nextErrors = requireFields(
      {
        company_name: form.company_name,
        name: form.name,
        email: form.email,
        plan_code: form.plan_code,
        trial_days: form.trial_days,
        billing_cycle: form.billing_cycle,
      },
      {
        company_name: 'Company name is required.',
        name: 'Owner name is required.',
        email: 'Owner email is required.',
        plan_code: 'Select a subscription plan.',
        trial_days: 'Trial length is required.',
        billing_cycle: 'Billing cycle is required.',
      },
    )

    if (form.password.trim() && form.password.trim().length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }

    const trialDays = Number(form.trial_days)
    if (!nextErrors.trial_days && (Number.isNaN(trialDays) || trialDays < 1 || trialDays > 90)) {
      nextErrors.trial_days = 'Trial length must be between 1 and 90 days.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setError('Please fix the highlighted fields.')
      return
    }

    setFieldErrors({})

    const ok = await confirm({
      title: 'Provision this tenant?',
      message: `Create “${form.company_name.trim()}” with owner ${form.email.trim()} on the ${selectedPlan?.name ?? form.plan_code} plan (${form.trial_days}-day trial).`,
      confirmLabel: 'Provision tenant',
    })
    if (!ok) return

    registerMutation.mutate()
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      plan_code: planList.find((p) => p.code === 'starter')?.code ?? planList[0]?.code ?? '',
    })
    setSlugTouched(false)
    setShowAdvanced(false)
    setShowPassword(false)
    setError(null)
    setFieldErrors({})
    setResult(null)
    setCopied(false)
  }

  async function copyPassword(password: string) {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Unable to copy password. Select and copy it manually.')
    }
  }

  async function openTenantWorkspace() {
    if (!result?.tenant?.id) return
    setSwitching(true)
    try {
      await switchTenant(result.tenant.id)
      await qc.invalidateQueries()
      success({
        title: 'Workspace switched',
        message: `You are now viewing ${result.tenant.name}.`,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to switch into the new tenant'))
    } finally {
      setSwitching(false)
    }
  }

  if (result?.tenant) {
    return (
      <div className="stack register-page">
        <header className="page-header">
          <div className="page-header-main">
            <div className="page-header-meta">
              <span className="page-chip">SaaS</span>
              <span className="page-meta-sep" aria-hidden />
              <span className="page-meta-text">Provisioning complete</span>
            </div>
            <h1 className="page-header-title">Tenant ready</h1>
            <p className="page-header-desc">
              “{result.tenant.name}” has been provisioned with an owner account and trial subscription.
            </p>
          </div>
          <div className="page-header-actions">
            <button type="button" className="button-link" onClick={resetForm}>
              Register another
            </button>
            <Link className="ghost-link" to="/admin/saas/tenants">
              View all tenants
            </Link>
          </div>
        </header>

        {error && <div className="error">{error}</div>}

        <section className="panel register-success">
          <div className="register-success-banner">
            <div className="register-success-icon" aria-hidden>
              ✓
            </div>
            <div>
              <h2>Workspace created</h2>
              <p className="muted">Share these credentials with the company owner securely.</p>
            </div>
          </div>

          <div className="register-success-grid">
            <div className="register-success-card">
              <span className="register-success-label">Tenant</span>
              <strong>{result.tenant.name}</strong>
              <span className="muted small">{result.tenant.slug}</span>
            </div>
            <div className="register-success-card">
              <span className="register-success-label">Status</span>
              <strong className="badge status-trial">{result.tenant.status ?? 'trial'}</strong>
              <span className="muted small">Trial ends {formatDate(result.tenant.trial_ends_at)}</span>
            </div>
            <div className="register-success-card">
              <span className="register-success-label">Plan</span>
              <strong>{result.subscription?.plan?.name ?? selectedPlan?.name ?? '—'}</strong>
              <span className="muted small">
                {result.subscription?.status ?? 'trialing'}
                {result.subscription?.billing_cycle ? ` · ${result.subscription.billing_cycle}` : ''}
              </span>
            </div>
            <div className="register-success-card">
              <span className="register-success-label">Owner</span>
              <strong>{result.owner?.name ?? form.name}</strong>
              <span className="muted small">{result.owner?.email ?? form.email}</span>
            </div>
          </div>

          {result.generated_password && (
            <div className="register-password-box">
              <div>
                <strong>Generated owner password</strong>
                <p className="muted small">Copy this now — it will not be shown again.</p>
              </div>
              <code className="register-password-value">{result.generated_password}</code>
              <button
                type="button"
                className="ghost"
                onClick={() => void copyPassword(result.generated_password!)}
              >
                {copied ? 'Copied' : 'Copy password'}
              </button>
            </div>
          )}

          <div className="register-success-actions">
            <button
              type="button"
              className="button-link"
              disabled={switching}
              onClick={() => void openTenantWorkspace()}
            >
              {switching ? 'Switching…' : 'Open workspace'}
            </button>
            <Link className="ghost-link" to="/admin/saas/trials">
              Manage trials
            </Link>
            <button type="button" className="ghost" onClick={resetForm}>
              Provision another tenant
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="stack register-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">SaaS</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Tenant onboarding</span>
          </div>
          <h1 className="page-header-title">Register tenant</h1>
          <p className="page-header-desc">
            Provision a new company workspace with an owner account, trial subscription, and default feature set.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="ghost-link" to="/admin/saas/tenants">
            Back to tenants
          </Link>
          <Link className="ghost-link" to="/admin/saas/plans">
            Manage plans
          </Link>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="register-layout">
        <form className="register-form stack" onSubmit={onSubmit} noValidate>
          <section className="panel register-section">
            <div className="register-section-head">
              <h2>Company</h2>
              <p className="muted small">Workspace identity and locale defaults.</p>
            </div>

            <div className="form-grid register-grid">
              <FormField label="Company name" required error={fieldErrors.company_name}>
                <input
                  autoComplete="organization"
                  placeholder="e.g. Horizon Builders LLC"
                  value={form.company_name}
                  onChange={(e) => {
                    setFieldErrors((prev) => clearFieldError(prev, 'company_name'))
                    setForm({ ...form, company_name: e.target.value })
                  }}
                />
              </FormField>

              <FormField label="Workspace slug" error={fieldErrors.slug}>
                <input
                  placeholder="auto-generated if blank"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setFieldErrors((prev) => clearFieldError(prev, 'slug'))
                    setForm({ ...form, slug: slugify(e.target.value) })
                  }}
                />
              </FormField>

              <FormField label="Legal name" error={fieldErrors.legal_name} className="span-2">
                <input
                  placeholder="Optional — defaults to company name"
                  value={form.legal_name}
                  onChange={(e) => {
                    setFieldErrors((prev) => clearFieldError(prev, 'legal_name'))
                    setForm({ ...form, legal_name: e.target.value })
                  }}
                />
              </FormField>

              <FormField label="Country code" error={fieldErrors.country_code}>
                <input
                  maxLength={2}
                  placeholder="AE"
                  value={form.country_code}
                  onChange={(e) => {
                    setFieldErrors((prev) => clearFieldError(prev, 'country_code'))
                    setForm({ ...form, country_code: e.target.value.toUpperCase() })
                  }}
                />
              </FormField>

              <FormField label="Default currency" error={fieldErrors.default_currency}>
                <input
                  maxLength={3}
                  placeholder="AED"
                  value={form.default_currency}
                  onChange={(e) => {
                    setFieldErrors((prev) => clearFieldError(prev, 'default_currency'))
                    setForm({ ...form, default_currency: e.target.value.toUpperCase() })
                  }}
                />
              </FormField>
            </div>
          </section>

          <section className="panel register-section">
            <div className="register-section-head">
              <h2>Owner account</h2>
              <p className="muted small">Primary company owner with full tenant access.</p>
            </div>

            <div className="form-grid register-grid">
              <FormField label="Owner name" required error={fieldErrors.name}>
                <input
                  autoComplete="name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => {
                    setFieldErrors((prev) => clearFieldError(prev, 'name'))
                    setForm({ ...form, name: e.target.value })
                  }}
                />
              </FormField>

              <FormField label="Owner email" required error={fieldErrors.email}>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="owner@company.com"
                  value={form.email}
                  onChange={(e) => {
                    setFieldErrors((prev) => clearFieldError(prev, 'email'))
                    setForm({ ...form, email: e.target.value })
                  }}
                />
              </FormField>

              <FormField label="Password" error={fieldErrors.password} className="span-2">
                <div className="register-password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Optional — auto-generated if blank"
                    value={form.password}
                    onChange={(e) => {
                      setFieldErrors((prev) => clearFieldError(prev, 'password'))
                      setForm({ ...form, password: e.target.value })
                    }}
                  />
                  <button type="button" className="ghost" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="muted small register-hint">Leave blank to generate a secure password after provisioning.</p>
              </FormField>
            </div>
          </section>

          <section className="panel register-section">
            <div className="register-section-head">
              <h2>Plan & trial</h2>
              <p className="muted small">Choose a plan and trial length for the new workspace.</p>
            </div>

            {plansLoading ? (
              <p className="muted">Loading plans…</p>
            ) : planList.length === 0 ? (
              <FormField label="Plan" required error={fieldErrors.plan_code}>
                <div className="register-empty-plans">
                  <p className="muted">No active plans found. Create a plan before provisioning tenants.</p>
                  <Link className="button-link" to="/admin/saas/plans">
                    Create plan
                  </Link>
                </div>
              </FormField>
            ) : (
              <FormField label="Plan" required error={fieldErrors.plan_code}>
                <div className="register-plan-grid" role="radiogroup" aria-label="Subscription plan">
                  {planList.map((plan) => {
                    const active = form.plan_code === plan.code
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`register-plan-card${active ? ' active' : ''}`}
                        onClick={() => {
                          setFieldErrors((prev) => clearFieldError(prev, 'plan_code'))
                          setForm({ ...form, plan_code: plan.code })
                        }}
                      >
                        <div className="register-plan-top">
                          <strong>{plan.name}</strong>
                          <span className="register-plan-price">
                            {formatMoney(plan.price_monthly, plan.currency ?? 'AED')}
                            <small>/mo</small>
                          </span>
                        </div>
                        {plan.description ? <p className="muted small">{plan.description}</p> : null}
                        <ul className="register-plan-meta">
                          <li>{formatLimit(plan.max_users)} users</li>
                          <li>{formatLimit(plan.max_projects)} projects</li>
                          <li>{formatMoney(plan.price_yearly, plan.currency ?? 'AED')}/yr</li>
                        </ul>
                      </button>
                    )
                  })}
                </div>
              </FormField>
            )}

            <div className="register-trial-billing">
              <div className="register-trial-presets" role="group" aria-label="Trial length presets">
                {TRIAL_PRESETS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    className={`tenants-chip${Number(form.trial_days) === days ? ' active' : ''}`}
                    onClick={() => {
                      setFieldErrors((prev) => clearFieldError(prev, 'trial_days'))
                      setForm({ ...form, trial_days: days })
                    }}
                  >
                    {days} days
                  </button>
                ))}
              </div>
              <div className="form-grid register-grid">
                <FormField label="Trial length (days)" required error={fieldErrors.trial_days}>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={form.trial_days}
                    onChange={(e) => {
                      setFieldErrors((prev) => clearFieldError(prev, 'trial_days'))
                      setForm({ ...form, trial_days: Number(e.target.value) })
                    }}
                  />
                </FormField>

                <FormField label="Billing cycle" required error={fieldErrors.billing_cycle}>
                  <select
                    value={form.billing_cycle}
                    onChange={(e) => {
                      setFieldErrors((prev) => clearFieldError(prev, 'billing_cycle'))
                      setForm({ ...form, billing_cycle: e.target.value })
                    }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </FormField>
              </div>
            </div>
          </section>

          <section className="panel register-section">
            <button
              type="button"
              className="register-advanced-toggle"
              aria-expanded={showAdvanced}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <span>
                <strong>Branding</strong>
                <span className="muted small">Optional brand name and colors</span>
              </span>
              <span className="muted small">{showAdvanced ? 'Hide' : 'Show'}</span>
            </button>

            {showAdvanced && (
              <div className="form-grid register-grid" style={{ marginTop: 14 }}>
                <FormField label="Brand name" error={fieldErrors.brand_name} className="span-2">
                  <input
                    placeholder="Defaults to company name"
                    value={form.brand_name}
                    onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
                  />
                </FormField>
                <FormField label="Primary color" error={fieldErrors.primary_color}>
                  <div className="register-color-field">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      aria-label="Primary color picker"
                    />
                    <input
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    />
                  </div>
                </FormField>
                <FormField label="Accent color" error={fieldErrors.accent_color}>
                  <div className="register-color-field">
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                      aria-label="Accent color picker"
                    />
                    <input
                      value={form.accent_color}
                      onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                    />
                  </div>
                </FormField>
              </div>
            )}
          </section>

          <div className="register-submit-bar">
            <button type="button" className="ghost" onClick={resetForm} disabled={registerMutation.isPending}>
              Reset
            </button>
            <button type="submit" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Provisioning…' : 'Provision tenant'}
            </button>
          </div>
        </form>

        <aside className="register-summary panel">
          <h2>Provisioning summary</h2>
          <p className="muted small">Review what will be created for this tenant.</p>

          <dl className="register-summary-list">
            <div>
              <dt>Company</dt>
              <dd>{form.company_name.trim() || '—'}</dd>
            </div>
            <div>
              <dt>Slug</dt>
              <dd>{form.slug.trim() || 'auto'}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>
                {form.name.trim() || '—'}
                <br />
                <span className="muted small">{form.email.trim() || 'email pending'}</span>
              </dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{selectedPlan?.name ?? (form.plan_code || '—')}</dd>
            </div>
            <div>
              <dt>Trial</dt>
              <dd>
                {form.trial_days} days
                <br />
                <span className="muted small">Ends {trialEndsPreview.toLocaleDateString()}</span>
              </dd>
            </div>
            <div>
              <dt>Locale</dt>
              <dd>
                {form.country_code || 'AE'} · {form.default_currency || 'AED'}
              </dd>
            </div>
          </dl>

          <ul className="register-checklist">
            <li>Owner membership with Company Owner role</li>
            <li>Primary company record</li>
            <li>Trialing subscription + zero-amount invoice</li>
            <li>Default feature flags enabled</li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
