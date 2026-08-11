import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
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

type BrandingRow = {
  id: number
  name: string
  slug: string
  brand_name?: string | null
  primary_color?: string | null
  accent_color?: string | null
  logo_url?: string | null
  status?: string
}

type BrandForm = {
  brand_name: string
  primary_color: string
  accent_color: string
  logo_url: string
}

const DEFAULT_PRIMARY = '#1F4E79'
const DEFAULT_ACCENT = '#C47A11'

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

function isConfigured(row: BrandingRow) {
  return Boolean(row.brand_name || row.primary_color || row.accent_color || row.logo_url)
}

function hasLogo(row: BrandingRow) {
  return Boolean(row.logo_url?.trim())
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

function emptyForm(): BrandForm {
  return {
    brand_name: '',
    primary_color: DEFAULT_PRIMARY,
    accent_color: DEFAULT_ACCENT,
    logo_url: '',
  }
}

function formFromRow(row: BrandingRow): BrandForm {
  return {
    brand_name: row.brand_name ?? row.name ?? '',
    primary_color: normalizeHex(row.primary_color, DEFAULT_PRIMARY),
    accent_color: normalizeHex(row.accent_color, DEFAULT_ACCENT),
    logo_url: row.logo_url ?? '',
  }
}

export function BrandingPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'configured' | 'incomplete' | 'logo'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<BrandingRow | null>(null)
  const [form, setForm] = useState<BrandForm>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [logoBroken, setLogoBroken] = useState(false)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['saas-branding', search, page],
    queryFn: () => api.listSaasBranding(search.trim(), page, 12),
    placeholderData: keepPreviousData,
  })

  const { data: summaryPage } = useQuery({
    queryKey: ['saas-branding-summary'],
    queryFn: () => api.listSaasBranding('', 1, 100),
  })

  const rows = (data?.data ?? []) as BrandingRow[]
  const allRows = (summaryPage?.data ?? []) as BrandingRow[]

  const stats = useMemo(() => {
    const configured = allRows.filter(isConfigured).length
    const withLogo = allRows.filter(hasLogo).length
    const incomplete = allRows.filter((r) => !isConfigured(r)).length
    return {
      total: summaryPage?.meta?.total ?? allRows.length,
      configured,
      withLogo,
      incomplete,
    }
  }, [allRows, summaryPage])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filter === 'configured') return isConfigured(row)
      if (filter === 'incomplete') return !isConfigured(row)
      if (filter === 'logo') return hasLogo(row)
      return true
    })
  }, [rows, filter])

  async function refreshBranding() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['saas-branding'] }),
      qc.invalidateQueries({ queryKey: ['saas-branding-summary'] }),
    ])
  }

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; body: Record<string, unknown> }) =>
      api.updateSaasBranding(payload.id, payload.body),
    onSuccess: async (_data, vars) => {
      setError(null)
      setFieldErrors({})
      setModalOpen(false)
      setSelected(null)
      setForm(emptyForm())
      await refreshBranding()
      success({
        title: 'Branding updated',
        message: `White-label settings saved for ${vars.body.brand_name || 'tenant'}.`,
      })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to update branding'))
    },
  })

  function openEdit(row: BrandingRow) {
    setSelected(row)
    setForm(formFromRow(row))
    setLogoBroken(false)
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSelected(null)
    setForm(emptyForm())
    setError(null)
    setFieldErrors({})
    setLogoBroken(false)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError(null)
    setFieldErrors({})

    const primary = normalizeHex(form.primary_color, DEFAULT_PRIMARY)
    const accent = normalizeHex(form.accent_color, DEFAULT_ACCENT)
    if (!/^#[0-9A-F]{6}$/.test(primary)) {
      setFieldErrors({ primary_color: 'Use a valid hex color like #1F4E79.' })
      return
    }
    if (!/^#[0-9A-F]{6}$/.test(accent)) {
      setFieldErrors({ accent_color: 'Use a valid hex color like #C47A11.' })
      return
    }

    updateMutation.mutate({
      id: selected.id,
      body: {
        brand_name: form.brand_name.trim() || null,
        primary_color: primary,
        accent_color: accent,
        logo_url: form.logo_url.trim() || null,
      },
    })
  }

  async function onResetDefaults() {
    if (!selected) return
    const ok = await confirm({
      title: 'Reset branding?',
      message: `Reset ${selected.name} to Keystone default colors and clear the custom logo URL?`,
      confirmLabel: 'Reset',
    })
    if (!ok) return
    setForm({
      brand_name: selected.name,
      primary_color: DEFAULT_PRIMARY,
      accent_color: DEFAULT_ACCENT,
      logo_url: '',
    })
    setLogoBroken(false)
  }

  const busy = updateMutation.isPending
  const previewPrimary = normalizeHex(form.primary_color, DEFAULT_PRIMARY)
  const previewAccent = normalizeHex(form.accent_color, DEFAULT_ACCENT)
  const previewName = form.brand_name.trim() || selected?.name || 'Tenant brand'

  return (
    <div className="stack branding-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">SaaS</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">White-label</span>
          </div>
          <h1 className="page-header-title">Tenant branding</h1>
          <p className="page-header-desc">
            Platform view of white-label colors and logos per tenant. Preview and update brand identity for each workspace.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="ghost-link" to="/admin/saas/tenants">
            Tenants
          </Link>
          <Link className="ghost-link" to="/admin/saas/features">
            Features
          </Link>
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats branding-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Tenants</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat tone-success">
          <span className="tenant-stat-label">Configured</span>
          <strong className="tenant-stat-value">{stats.configured}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">With logo</span>
          <strong className="tenant-stat-value">{stats.withLogo}</strong>
        </div>
        <div className="tenant-stat tone-warn">
          <span className="tenant-stat-label">Incomplete</span>
          <strong className="tenant-stat-value">{stats.incomplete}</strong>
        </div>
      </section>

      <section className="panel branding-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Brand identities</h2>
            <p className="muted small">
              {filter === 'all' ? (data?.meta?.total ?? filtered.length) : filtered.length} matching
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
                placeholder="Search tenant or brand…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>

            <div className="tenants-status-chips" role="tablist" aria-label="Filter branding">
              {(
                [
                  { value: 'all' as const, label: 'All', count: stats.total },
                  { value: 'configured' as const, label: 'Configured', count: stats.configured },
                  { value: 'logo' as const, label: 'With logo', count: stats.withLogo },
                  { value: 'incomplete' as const, label: 'Incomplete', count: stats.incomplete },
                ]
              ).map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.value}
                  className={`tenants-chip${filter === f.value ? ' active' : ''}`}
                  onClick={() => {
                    setFilter(f.value)
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
          <p className="muted tenants-empty">Loading tenant branding…</p>
        ) : filtered.length === 0 ? (
          <div className="tenants-empty">
            <h3>No tenants found</h3>
            <p className="muted">
              {search || filter !== 'all'
                ? 'Try clearing filters or adjusting your search.'
                : 'Register a tenant to configure white-label branding.'}
            </p>
          </div>
        ) : (
          <>
            <div className="branding-grid">
              {filtered.map((row) => {
                const primary = normalizeHex(row.primary_color, DEFAULT_PRIMARY)
                const accent = normalizeHex(row.accent_color, DEFAULT_ACCENT)
                const brand = row.brand_name?.trim() || row.name
                const configured = isConfigured(row)
                return (
                  <article key={row.id} className="branding-card">
                    <div
                      className="branding-preview"
                      style={
                        {
                          '--brand-primary': primary,
                          '--brand-accent': accent,
                        } as CSSProperties
                      }
                    >
                      <div className="branding-preview-side">
                        <span className="branding-preview-mark">
                          {row.logo_url ? (
                            <img
                              src={row.logo_url}
                              alt=""
                              onError={(e) => {
                                const img = e.currentTarget
                                img.style.display = 'none'
                                const fallback = img.nextElementSibling as HTMLElement | null
                                if (fallback) fallback.hidden = false
                              }}
                            />
                          ) : null}
                          <span hidden={Boolean(row.logo_url)}>{initials(brand)}</span>
                        </span>
                        <span className="branding-preview-nav" />
                        <span className="branding-preview-nav short" />
                        <span className="branding-preview-nav" />
                      </div>
                      <div className="branding-preview-main">
                        <div className="branding-preview-top">
                          <strong>{brand}</strong>
                          <span className="branding-preview-cta">Action</span>
                        </div>
                        <div className="branding-preview-body">
                          <div className="branding-preview-block" />
                          <div className="branding-preview-block soft" />
                        </div>
                      </div>
                    </div>

                    <div className="branding-card-body">
                      <div className="branding-card-head">
                        <div>
                          <strong>{row.name}</strong>
                          <span className="muted small">{row.slug}</span>
                        </div>
                        {row.status ? (
                          <span className={`badge ${statusBadge(row.status)}`}>{row.status}</span>
                        ) : null}
                      </div>

                      <div className="branding-swatches">
                        <span className="branding-swatch" title={`Primary ${primary}`}>
                          <i style={{ background: primary }} />
                          {primary}
                        </span>
                        <span className="branding-swatch" title={`Accent ${accent}`}>
                          <i style={{ background: accent }} />
                          {accent}
                        </span>
                      </div>

                      <div className="branding-card-meta">
                        <span className={configured ? 'tone-ok' : 'tone-warn'}>
                          {configured ? 'Configured' : 'Incomplete'}
                        </span>
                        <span>{hasLogo(row) ? 'Logo set' : 'No logo'}</span>
                      </div>

                      <div className="branding-card-actions">
                        <button type="button" className="button-link" onClick={() => openEdit(row)}>
                          Edit branding
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
            <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
          </>
        )}
      </section>

      {modalOpen && selected && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card branding-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="branding-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="branding-modal-title">Edit branding</h2>
                <p className="muted small">
                  {selected.name} · <code>{selected.slug}</code>
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="branding-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll branding-modal-layout">
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

                <div className="form-grid branding-form">
                <FormField label="Brand name" required error={fieldErrors.brand_name}>
                  <input
                    value={form.brand_name}
                    placeholder={selected.name}
                    onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
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
                      />
                      <input
                        value={form.primary_color}
                        placeholder="#1F4E79"
                        onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
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
                      />
                      <input
                        value={form.accent_color}
                        placeholder="#C47A11"
                        onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                      />
                    </div>
                  </FormField>
                </div>

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

                <FormField label="Logo URL" error={fieldErrors.logo_url}>
                  <input
                    value={form.logo_url}
                    placeholder="https://cdn.example.com/logo.svg"
                    onChange={(e) => {
                      setForm({ ...form, logo_url: e.target.value })
                      setLogoBroken(false)
                    }}
                  />
                </FormField>
                </div>
              </div>

              <div className="modal-actions branding-modal-actions">
                <button type="button" className="ghost" onClick={onResetDefaults} disabled={busy}>
                  Reset defaults
                </button>
                <div className="branding-modal-actions-right">
                  <button type="button" className="ghost" onClick={closeModal} disabled={busy}>
                    Cancel
                  </button>
                  <button type="submit" className="button-link" disabled={busy}>
                    {busy ? 'Saving…' : 'Save branding'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
