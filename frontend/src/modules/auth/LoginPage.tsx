import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import axios from 'axios'
import { FormField, getFieldErrors, type FieldErrors } from '../../ui'
import { APP_NAME, APP_SHORT_TAGLINE, APP_TAGLINE, BrandMark } from '../../brand'

type TenantChoice = { id: number; name: string; slug: string; is_owner: boolean }

const QUICK_LOGINS = [
  {
    id: 'saas',
    label: 'SaaS Admin',
    company: 'Platform',
    email: 'saas.admin@cpm.test',
    password: 'Password123!',
  },
  {
    id: 'owner',
    label: 'Company Owner',
    company: 'Desert Build LLC',
    email: 'owner@desertbuild.test',
    password: 'Password123!',
  },
  {
    id: 'pm',
    label: 'Project Manager',
    company: 'Desert Build LLC',
    email: 'pm@desertbuild.test',
    password: 'Password123!',
  },
  {
    id: 'viewer',
    label: 'Viewer',
    company: 'Desert Build LLC',
    email: 'viewer@desertbuild.test',
    password: 'Password123!',
  },
  {
    id: 'supervisor',
    label: 'Site Supervisor',
    company: 'Desert Build LLC',
    email: 'supervisor@desertbuild.test',
    password: 'Password123!',
  },
] as const

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [tenants, setTenants] = useState<TenantChoice[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [quickLoading, setQuickLoading] = useState<string | null>(null)

  async function runLogin(nextEmail: string, nextPassword: string, opts?: { tenantSlug?: string; tenantId?: number }) {
    await login(nextEmail, nextPassword, opts?.tenantSlug, opts?.tenantId)
    navigate('/admin/dashboard')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (tenants.length === 0) {
      const nextErrors: FieldErrors = {}
      if (!email.trim()) nextErrors.email = 'Email is required.'
      if (!password) nextErrors.password = 'Password is required.'
      if (Object.keys(nextErrors).length) {
        setFieldErrors(nextErrors)
        setError('Please complete the required fields.')
        return
      }
    }

    setSubmitting(true)
    try {
      if (tenants.length > 0) {
        if (!selectedTenantId) {
          setError('Select a company workspace to continue.')
          return
        }
        await runLogin(email, password, { tenantId: selectedTenantId })
        return
      }

      await runLogin(email, password, { tenantSlug: tenantSlug.trim() || undefined })
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409 && Array.isArray(err.response.data?.tenants)) {
        const list = err.response.data.tenants as TenantChoice[]
        setTenants(list)
        setSelectedTenantId(list[0]?.id ?? null)
        setError(err.response.data.message ?? 'Select a company workspace to continue.')
        setFieldErrors({})
        return
      }

      setFieldErrors(getFieldErrors(err))
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ??
            err.response?.data?.errors?.email?.[0] ??
            err.response?.data?.errors?.tenant_slug?.[0] ??
            'Login failed',
        )
      } else {
        setError('Login failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function onQuickLogin(account: (typeof QUICK_LOGINS)[number]) {
    setError(null)
    setFieldErrors({})
    setTenants([])
    setSelectedTenantId(null)
    setTenantSlug('')
    setEmail(account.email)
    setPassword(account.password)
    setQuickLoading(account.id)
    setSubmitting(true)
    try {
      await runLogin(account.email, account.password)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409 && Array.isArray(err.response.data?.tenants)) {
        const list = err.response.data.tenants as TenantChoice[]
        setTenants(list)
        setSelectedTenantId(list[0]?.id ?? null)
        setError(err.response.data.message ?? 'Select a company workspace to continue.')
        return
      }
      setFieldErrors(getFieldErrors(err))
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? err.response?.data?.errors?.email?.[0] ?? 'Quick login failed')
      } else {
        setError('Quick login failed')
      }
    } finally {
      setQuickLoading(null)
      setSubmitting(false)
    }
  }

  function clearTenantStep() {
    setTenants([])
    setSelectedTenantId(null)
    setError(null)
  }

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <div className="auth-hero-grid" aria-hidden />
        <div className="auth-hero-glow" aria-hidden />
        <div className="auth-hero-content">
          <div className="auth-hero-top">
            <BrandMark size={48} />
            <div>
              <div className="auth-hero-name">{APP_NAME}</div>
              <p className="eyebrow light">{APP_TAGLINE}</p>
            </div>
          </div>

          <h1>{APP_SHORT_TAGLINE}</h1>
          <p className="auth-hero-copy">
            Coordinate planning, procurement, site operations, and commercial control in one secure construction workspace.
          </p>

          <div className="auth-hero-stats">
            <div>
              <strong>WBS</strong>
              <span>Structured planning</span>
            </div>
            <div>
              <strong>Ops</strong>
              <span>RFQ to inventory</span>
            </div>
            <div>
              <strong>Site</strong>
              <span>Diaries &amp; equipment</span>
            </div>
          </div>
        </div>
        <p className="auth-hero-footnote">Trusted by construction teams for day-to-day project delivery.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <form className="auth-card elevated" onSubmit={onSubmit} noValidate>
            <header className="auth-card-head">
              <BrandMark size={40} className="auth-card-logo" />
              <div>
                <p className="eyebrow auth-card-eyebrow">{APP_NAME}</p>
                <h1>Sign in</h1>
                <p className="muted">Use your work email to access your company workspace.</p>
              </div>
            </header>

            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}

            {tenants.length === 0 ? (
              <>
                <FormField label="Email" required error={fieldErrors.email}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="name@company.com"
                  />
                </FormField>

                <FormField label="Password" required error={fieldErrors.password}>
                  <div className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="ghost password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </FormField>

                <div className="auth-row">
                  <button type="button" className="linkish" onClick={() => setShowAdvanced((v) => !v)}>
                    {showAdvanced ? 'Hide workspace options' : 'Workspace options'}
                  </button>
                  <span className="muted small">Optional</span>
                </div>

                {showAdvanced && (
                  <FormField label="Tenant slug" error={fieldErrors.tenant_slug}>
                    <input
                      value={tenantSlug}
                      onChange={(e) => setTenantSlug(e.target.value)}
                      placeholder="your-company-slug"
                      autoComplete="organization"
                    />
                    <span className="muted small">
                      Leave blank unless you belong to multiple companies. Access is limited to workspaces you are a member of.
                    </span>
                  </FormField>
                )}

                <button type="submit" className="auth-submit" disabled={submitting}>
                  {submitting && !quickLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </>
            ) : (
              <div className="tenant-step">
                <p className="muted small">
                  Continue as <strong>{email}</strong>
                </p>
                <FormField label="Company workspace" required>
                  <div className="tenant-list" role="radiogroup" aria-label="Select company workspace">
                    {tenants.map((t) => (
                      <label key={t.id} className={`tenant-option${selectedTenantId === t.id ? ' selected' : ''}`}>
                        <input
                          type="radio"
                          name="tenant"
                          checked={selectedTenantId === t.id}
                          onChange={() => setSelectedTenantId(t.id)}
                        />
                        <span>
                          <strong>{t.name}</strong>
                          <span className="muted small">
                            {t.slug}
                            {t.is_owner ? ' · Owner' : ''}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </FormField>
                <div className="auth-row">
                  <button type="button" className="ghost" onClick={clearTenantStep}>
                    Use a different account
                  </button>
                  <button type="submit" className="auth-submit compact" disabled={submitting}>
                    {submitting ? 'Continuing…' : 'Continue'}
                  </button>
                </div>
              </div>
            )}

            <p className="footer-link">
              New company? <Link to="/register">Create a workspace</Link>
            </p>
          </form>

          {tenants.length === 0 && (
            <aside className="quick-login refined">
              <div className="quick-login-head">
                <strong>Quick login</strong>
                <span className="muted small">Demo access for local evaluation</span>
              </div>
              <div className="quick-login-list horizontal">
                {QUICK_LOGINS.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    className="quick-login-card"
                    disabled={submitting}
                    onClick={() => void onQuickLogin(account)}
                  >
                    <span className="quick-login-title">{account.label}</span>
                    <span className="muted small">{account.company}</span>
                    <span className="quick-login-action">
                      {quickLoading === account.id ? 'Signing in…' : 'Continue'}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          <p className="auth-legal muted small">© {new Date().getFullYear()} {APP_NAME}. Secure construction operations platform.</p>
        </div>
      </section>
    </div>
  )
}
