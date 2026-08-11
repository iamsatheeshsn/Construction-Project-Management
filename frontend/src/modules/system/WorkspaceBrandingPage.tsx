import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import * as api from '../../services/api/saasRbacApi'
import { useAuth } from '../auth/AuthContext'
import {
  FormField,
  getErrorMessage,
  getFieldErrors,
  useConfirm,
  useSuccess,
  type FieldErrors,
} from '../../ui'

type BrandForm = {
  brand_name: string
  primary_color: string
  accent_color: string
  logo_url: string
}

const DEFAULT_PRIMARY = '#1E3A5F'
const DEFAULT_ACCENT = '#C45C26'

const PRESETS: Array<{ name: string; primary: string; accent: string }> = [
  { name: 'Keystone', primary: '#1F4E79', accent: '#C47A11' },
  { name: 'Steel', primary: '#0F3D5E', accent: '#2A9D8F' },
  { name: 'Sand', primary: '#5C4A3A', accent: '#D4A017' },
  { name: 'Slate', primary: '#1E293B', accent: '#38BDF8' },
]

function normalizeHex(value?: string | null, fallback = DEFAULT_PRIMARY) {
  if (!value) return fallback
  const v = value.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toUpperCase()
  if (/^[0-9A-Fa-f]{6}$/.test(v)) return `#${v.toUpperCase()}`
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    const s = v.slice(1)
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`.toUpperCase()
  }
  return fallback
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

function emptyForm(): BrandForm {
  return {
    brand_name: '',
    primary_color: DEFAULT_PRIMARY,
    accent_color: DEFAULT_ACCENT,
    logo_url: '',
  }
}

export function WorkspaceBrandingPage() {
  const { can } = useAuth()
  const canView = can('company.view') || can('company.manage')
  const canManage = can('company.manage')
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()

  const [form, setForm] = useState<BrandForm>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [logoBroken, setLogoBroken] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-branding'],
    queryFn: () => api.getTenantBranding(),
    enabled: canView,
  })

  useEffect(() => {
    if (!data) return
    setForm({
      brand_name: data.brand_name ?? '',
      primary_color: normalizeHex(data.primary_color, DEFAULT_PRIMARY),
      accent_color: normalizeHex(data.accent_color, DEFAULT_ACCENT),
      logo_url: data.logo_url ?? '',
    })
    setLogoBroken(false)
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.updateTenantBranding(payload),
    onSuccess: async () => {
      setError(null)
      setFieldErrors({})
      await qc.invalidateQueries({ queryKey: ['tenant-branding'] })
      success({ title: 'Branding saved', message: 'Workspace brand settings updated.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to update branding'))
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const primary = normalizeHex(form.primary_color, DEFAULT_PRIMARY)
    const accent = normalizeHex(form.accent_color, DEFAULT_ACCENT)
    if (!/^#[0-9A-F]{6}$/.test(primary)) {
      setFieldErrors({ primary_color: 'Use a valid hex color like #1E3A5F.' })
      return
    }
    if (!/^#[0-9A-F]{6}$/.test(accent)) {
      setFieldErrors({ accent_color: 'Use a valid hex color like #C45C26.' })
      return
    }

    updateMutation.mutate({
      brand_name: form.brand_name.trim() || null,
      primary_color: primary,
      accent_color: accent,
      logo_url: form.logo_url.trim() || null,
    })
  }

  async function onResetDefaults() {
    const ok = await confirm({
      title: 'Reset branding?',
      message: 'Reset this workspace to the default colors and clear the custom logo URL? This does not save until you click Save branding.',
      confirmLabel: 'Reset',
    })
    if (!ok) return
    setForm({
      brand_name: data?.name ?? '',
      primary_color: DEFAULT_PRIMARY,
      accent_color: DEFAULT_ACCENT,
      logo_url: '',
    })
    setFieldErrors({})
    setLogoBroken(false)
  }

  if (!canView) {
    return <p className="muted">You do not have permission to view workspace branding.</p>
  }

  const busy = updateMutation.isPending
  const previewPrimary = normalizeHex(form.primary_color, DEFAULT_PRIMARY)
  const previewAccent = normalizeHex(form.accent_color, DEFAULT_ACCENT)
  const previewName = form.brand_name.trim() || data?.name || 'Your workspace'

  return (
    <div className="stack workspace-branding-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">System</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">White-label</span>
          </div>
          <h1 className="page-header-title">Workspace branding</h1>
          <p className="page-header-desc">Customize how this tenant appears across the product.</p>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <section className="panel workspace-branding-panel">
        {isLoading ? (
          <p className="muted">Loading…</p>
        ) : (
          <div className="workspace-branding-layout">
            <div
              className="branding-preview branding-preview-lg"
              style={
                {
                  '--brand-primary': previewPrimary,
                  '--brand-accent': previewAccent,
                } as CSSProperties
              }
            >
              <div className="branding-preview-side">
                <span className="branding-preview-mark">
                  {form.logo_url && !logoBroken ? (
                    <img src={form.logo_url} alt="" onError={() => setLogoBroken(true)} />
                  ) : (
                    initials(previewName)
                  )}
                </span>
                <span className="branding-preview-nav" />
                <span className="branding-preview-nav short" />
                <span className="branding-preview-nav" />
              </div>
              <div className="branding-preview-main">
                <div className="branding-preview-top">
                  <strong>{previewName}</strong>
                  <span className="branding-preview-cta">Action</span>
                </div>
                <div className="branding-preview-body">
                  <div className="branding-preview-block" />
                  <div className="branding-preview-block soft" />
                </div>
              </div>
            </div>

            <form className="form-grid workspace-branding-form" onSubmit={onSubmit}>
              {data?.name && (
                <p className="muted small">
                  Tenant: <strong>{data.name}</strong>
                  {data.slug ? ` (${data.slug})` : ''}
                </p>
              )}

              <FormField label="Brand name" required error={fieldErrors.brand_name}>
                <input
                  value={form.brand_name}
                  placeholder={data?.name ?? ''}
                  onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
                  disabled={!canManage}
                />
              </FormField>

              <div className="branding-color-row">
                <FormField label="Primary color" required error={fieldErrors.primary_color}>
                  <div className="branding-color-input">
                    <input
                      type="color"
                      aria-label="Primary color picker"
                      value={previewPrimary}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value.toUpperCase() })}
                      disabled={!canManage}
                    />
                    <input
                      value={form.primary_color}
                      placeholder={DEFAULT_PRIMARY}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      disabled={!canManage}
                    />
                  </div>
                </FormField>
                <FormField label="Accent color" required error={fieldErrors.accent_color}>
                  <div className="branding-color-input">
                    <input
                      type="color"
                      aria-label="Accent color picker"
                      value={previewAccent}
                      onChange={(e) => setForm({ ...form, accent_color: e.target.value.toUpperCase() })}
                      disabled={!canManage}
                    />
                    <input
                      value={form.accent_color}
                      placeholder={DEFAULT_ACCENT}
                      onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                      disabled={!canManage}
                    />
                  </div>
                </FormField>
              </div>

              {canManage && (
                <div className="branding-presets">
                  <span className="muted small">Presets</span>
                  <div className="branding-preset-list">
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className="branding-preset"
                        title={`${p.name}: ${p.primary} / ${p.accent}`}
                        onClick={() =>
                          setForm({
                            ...form,
                            primary_color: p.primary,
                            accent_color: p.accent,
                          })
                        }
                      >
                        <i style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})` }} />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <FormField label="Logo URL" error={fieldErrors.logo_url}>
                <input
                  value={form.logo_url}
                  placeholder="https://cdn.example.com/logo.svg"
                  onChange={(e) => {
                    setForm({ ...form, logo_url: e.target.value })
                    setLogoBroken(false)
                  }}
                  disabled={!canManage}
                />
              </FormField>

              {canManage && (
                <div className="workspace-branding-actions">
                  <button type="button" className="ghost" onClick={onResetDefaults} disabled={busy}>
                    Reset defaults
                  </button>
                  <button type="submit" disabled={busy}>
                    {busy ? 'Saving…' : 'Save branding'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </section>
    </div>
  )
}
