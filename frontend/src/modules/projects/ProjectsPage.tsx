import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useMemo, useState, type FormEvent } from 'react'
import * as api from '../../services/api/modulesApi'
import { useAuth } from '../auth/AuthContext'
import {
  FormField,
  Pagination,
  getErrorMessage,
  getFieldErrors,
  useConfirm,
  useSuccess,
  type FieldErrors,
} from '../../ui'

const STATUSES = ['setup', 'planning', 'execution', 'on_hold', 'completed', 'closed'] as const
type StatusValue = (typeof STATUSES)[number]

type ProjectForm = {
  project_code: string
  name: string
  description: string
  location: string
  currency: string
  status: string
  company_id: string
  client_id: string
  start_date: string
  end_date: string
  budget_amount: string
  contract_value: string
}

function emptyForm(): ProjectForm {
  return {
    project_code: '',
    name: '',
    description: '',
    location: '',
    currency: 'AED',
    status: 'setup',
    company_id: '',
    client_id: '',
    start_date: '',
    end_date: '',
    budget_amount: '',
    contract_value: '',
  }
}

function formFromProject(p: api.Project): ProjectForm {
  return {
    project_code: p.project_code ?? '',
    name: p.name ?? '',
    description: p.description ?? '',
    location: p.location ?? '',
    currency: p.currency ?? 'AED',
    status: p.status ?? 'setup',
    company_id: p.company_id ? String(p.company_id) : p.company?.id ? String(p.company.id) : '',
    client_id: p.client_id ? String(p.client_id) : p.client?.id ? String(p.client.id) : '',
    start_date: p.start_date ? p.start_date.slice(0, 10) : '',
    end_date: p.end_date ? p.end_date.slice(0, 10) : '',
    budget_amount: p.budget_amount != null && p.budget_amount !== '' ? String(p.budget_amount) : '',
    contract_value: p.contract_value != null && p.contract_value !== '' ? String(p.contract_value) : '',
  }
}

function statusLabel(status: string) {
  return status
    .split('_')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

function statusTone(status: string) {
  switch (status) {
    case 'planning':
    case 'setup':
      return 'tone-info'
    case 'execution':
    case 'mobilization':
    case 'monitoring':
      return 'tone-progress'
    case 'on_hold':
    case 'cancelled':
      return 'tone-warn'
    case 'completed':
    case 'handover':
      return 'tone-success'
    case 'closed':
      return 'tone-neutral'
    default:
      return 'tone-neutral'
  }
}

function formatMoney(value: string | number | undefined, currency = 'AED') {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num) || num === 0) return '—'
  return `${currency} ${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'P'
  )
}

function progressPct(value?: string | number | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function ProjectsPage() {
  const { can } = useAuth()
  const manage = can('projects.manage')
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | StatusValue>('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<api.Project | null>(null)
  const [form, setForm] = useState<ProjectForm>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['projects', search, status, page],
    queryFn: () => api.listProjects({ search: search.trim() || undefined, status: status || undefined, page }),
    placeholderData: keepPreviousData,
  })

  const { data: summary } = useQuery({
    queryKey: ['projects-summary'],
    queryFn: () => api.listProjects({ per_page: 100 }),
  })

  const { data: clientsPage } = useQuery({
    queryKey: ['clients-options'],
    queryFn: () => api.listClients('', 1, 100),
    enabled: can('clients.view') || manage,
  })

  const { data: companiesPage } = useQuery({
    queryKey: ['companies-options'],
    queryFn: () => api.listCompanies('', 1, 100),
    enabled: can('company.view') || manage,
  })

  const rows = data?.data ?? []
  const allRows = useMemo(() => summary?.data ?? [], [summary])
  const clients = clientsPage?.data ?? []
  const companies = companiesPage?.data ?? []

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {}
    for (const s of STATUSES) byStatus[s] = 0
    let budgetTotal = 0
    for (const p of allRows) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1
      budgetTotal += Number(p.budget_amount ?? 0) || 0
    }
    return {
      total: summary?.meta?.total ?? allRows.length,
      byStatus,
      active: (byStatus.execution ?? 0) + (byStatus.planning ?? 0) + (byStatus.setup ?? 0),
      budgetTotal,
    }
  }, [allRows, summary])

  async function refreshProjects() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['projects'] }),
      qc.invalidateQueries({ queryKey: ['projects-summary'] }),
    ])
  }

  function buildPayload(f: ProjectForm) {
    return {
      project_code: f.project_code.trim(),
      name: f.name.trim(),
      description: f.description.trim() || null,
      location: f.location.trim() || null,
      currency: f.currency.trim().toUpperCase() || 'AED',
      status: f.status,
      company_id: f.company_id ? Number(f.company_id) : null,
      client_id: f.client_id ? Number(f.client_id) : null,
      start_date: f.start_date || null,
      end_date: f.end_date || null,
      budget_amount: f.budget_amount ? Number(f.budget_amount) : 0,
      contract_value: f.contract_value ? Number(f.contract_value) : 0,
    }
  }

  const saveMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      selected ? api.updateProject(selected.id, payload) : api.createProject(payload),
    onSuccess: async () => {
      const wasEdit = Boolean(selected)
      setError(null)
      setFieldErrors({})
      closeModal()
      await refreshProjects()
      success({
        title: wasEdit ? 'Project updated' : 'Project created',
        message: wasEdit
          ? 'Changes have been saved.'
          : 'Your project is ready for planning, commercial, and site work.',
      })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, selected ? 'Failed to update project' : 'Failed to create project'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteProject(id),
    onSuccess: async () => {
      setDeletingId(null)
      await refreshProjects()
      success({ title: 'Project deleted', message: 'The project was removed from this workspace.' })
    },
    onError: (err: unknown) => {
      setDeletingId(null)
      setError(getErrorMessage(err, 'Failed to delete project'))
    },
  })

  function openCreate() {
    const primary = companies.find((c) => c.is_primary)
    setSelected(null)
    setForm({
      ...emptyForm(),
      company_id: primary ? String(primary.id) : companies[0] ? String(companies[0].id) : '',
    })
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(p: api.Project) {
    setSelected(p)
    setForm(formFromProject(p))
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
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const nextErrors: FieldErrors = {}
    if (!form.project_code.trim()) nextErrors.project_code = 'Project code is required.'
    if (!form.name.trim()) nextErrors.name = 'Project name is required.'
    if (!form.currency.trim() || form.currency.trim().length !== 3) {
      nextErrors.currency = 'Use a 3-letter currency code (e.g. AED).'
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      nextErrors.end_date = 'End date must be on or after the start date.'
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      return
    }

    saveMutation.mutate(buildPayload(form))
  }

  async function onDelete(p: api.Project) {
    const ok = await confirm({
      title: 'Delete project?',
      message: `Delete “${p.name}” (${p.project_code})? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    setDeletingId(p.id)
    deleteMutation.mutate(p.id)
  }

  const busy = saveMutation.isPending || deleteMutation.isPending

  const statusFilters: Array<{ value: '' | StatusValue; label: string; count: number }> = [
    { value: '', label: 'All', count: stats.total },
    ...STATUSES.map((s) => ({ value: s, label: statusLabel(s), count: stats.byStatus[s] ?? 0 })),
  ]

  return (
    <div className="stack projects-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">Organization</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Portfolio</span>
          </div>
          <h1 className="page-header-title">Projects</h1>
          <p className="page-header-desc">
            Central aggregate for planning, commercial, and site work. Open a project to manage WBS, BOQ, procurement, and site diaries.
          </p>
        </div>
        <div className="page-header-actions">
          {manage && (
            <button type="button" className="button-link" onClick={openCreate}>
              Add project
            </button>
          )}
          <Link className="ghost-link" to="/admin/organization/clients">
            Clients
          </Link>
          <Link className="ghost-link" to="/admin/organization/companies">
            Companies
          </Link>
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats projects-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Total projects</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat tone-success">
          <span className="tenant-stat-label">In flight</span>
          <strong className="tenant-stat-value">{stats.active}</strong>
          <span className="tenant-stat-hint">Setup · planning · execution</span>
        </div>
        <div className="tenant-stat tone-warn">
          <span className="tenant-stat-label">On hold</span>
          <strong className="tenant-stat-value">{stats.byStatus.on_hold ?? 0}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Portfolio budget</span>
          <strong className="tenant-stat-value projects-stat-money">
            {formatMoney(stats.budgetTotal, 'AED')}
          </strong>
        </div>
      </section>

      <section className="panel projects-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Project portfolio</h2>
            <p className="muted small">
              {data?.meta?.total ?? rows.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search projects</span>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search code, name, location…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>
          </div>
        </div>

        <div className="tenants-status-chips projects-status-chips" role="tablist" aria-label="Filter by status">
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

        {isLoading ? (
          <p className="muted tenants-empty">Loading projects…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No projects found</h3>
            <p className="muted">
              {search || status
                ? 'Try clearing filters or adjusting your search.'
                : 'Create a project to start planning, commercial, and site work.'}
            </p>
            {manage && !search && !status && (
              <button type="button" className="button-link" onClick={openCreate}>
                Add project
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="projects-grid">
              {rows.map((p) => {
                const pct = progressPct(p.progress_percent)
                const isDeleting = deletingId === p.id
                return (
                  <article key={p.id} className={`projects-card tone-${p.status}`}>
                    <div className="projects-card-top">
                      <div className="projects-identity">
                        <span className="projects-avatar" aria-hidden>
                          {initials(p.name)}
                        </span>
                        <div>
                          <Link to={`/admin/organization/projects/${p.id}`} className="projects-title-link">
                            <strong>{p.name}</strong>
                          </Link>
                          <code className="projects-code">{p.project_code}</code>
                        </div>
                      </div>
                      <span className={`projects-status ${statusTone(p.status)}`}>{statusLabel(p.status)}</span>
                    </div>

                    <div className="projects-card-meta">
                      <div>
                        <span className="muted small">Client</span>
                        <strong>{p.client?.name ?? '—'}</strong>
                      </div>
                      <div>
                        <span className="muted small">Location</span>
                        <strong>{p.location?.trim() || '—'}</strong>
                      </div>
                      <div>
                        <span className="muted small">Budget</span>
                        <strong>{formatMoney(p.budget_amount, p.currency)}</strong>
                      </div>
                    </div>

                    <div className="projects-progress">
                      <div className="projects-progress-head">
                        <span>Progress</span>
                        <strong>{pct}%</strong>
                      </div>
                      <div className="projects-progress-track" aria-hidden>
                        <div className="projects-progress-fill" style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }} />
                      </div>
                    </div>

                    <div className="projects-card-foot">
                      <span className="muted small">
                        {formatDate(p.start_date)} → {formatDate(p.end_date)}
                      </span>
                      <span className="muted small">
                        {p.wbs_count ?? 0} WBS · {p.members_count ?? 0} members
                      </span>
                    </div>

                    <div className="projects-card-actions">
                      <Link className="button-link" to={`/admin/organization/projects/${p.id}`}>
                        Open
                      </Link>
                      {manage && (
                        <>
                          <button type="button" className="ghost" disabled={busy} onClick={() => openEdit(p)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="ghost danger"
                            disabled={busy}
                            onClick={() => void onDelete(p)}
                          >
                            {isDeleting ? 'Deleting…' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
            <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
          </>
        )}
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card projects-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="project-modal-title">{selected ? 'Edit project' : 'New project'}</h2>
                <p className="muted small">
                  {selected
                    ? 'Update setup details for this workspace project.'
                    : 'Set up a new project for planning, commercial, and site work.'}
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="projects-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid projects-modal-grid">
              <FormField label="Project code" required error={fieldErrors.project_code}>
                <input
                  placeholder="e.g. PRJ-2026-001"
                  value={form.project_code}
                  onChange={(e) => setForm({ ...form, project_code: e.target.value })}
                />
              </FormField>
              <FormField label="Name" required error={fieldErrors.name}>
                <input
                  placeholder="Project name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FormField>

              <FormField label="Description" error={fieldErrors.description} className="full">
                <textarea
                  rows={2}
                  placeholder="Short overview of scope or site context"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </FormField>

              <FormField label="Company" error={fieldErrors.company_id}>
                <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                  <option value="">Primary company (default)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.is_primary ? ' · Primary' : ''}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Client" error={fieldErrors.client_id}>
                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.code ? ` (${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Location" error={fieldErrors.location}>
                <input
                  placeholder="City / site"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </FormField>
              <FormField label="Status" required error={fieldErrors.status}>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Currency" required error={fieldErrors.currency}>
                <input
                  maxLength={3}
                  placeholder="AED"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                />
              </FormField>
              <FormField label="Budget" error={fieldErrors.budget_amount}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.budget_amount}
                  onChange={(e) => setForm({ ...form, budget_amount: e.target.value })}
                />
              </FormField>
              <FormField label="Contract value" error={fieldErrors.contract_value}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.contract_value}
                  onChange={(e) => setForm({ ...form, contract_value: e.target.value })}
                />
              </FormField>

              <FormField label="Start date" error={fieldErrors.start_date}>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </FormField>
              <FormField label="End date" error={fieldErrors.end_date}>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </FormField>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={busy}>
                  {busy ? 'Saving…' : selected ? 'Save changes' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
