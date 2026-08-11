import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
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

type CompanyForm = {
  name: string
  legal_name: string
  email: string
  phone: string
  city: string
  country_code: string
  is_primary: boolean
}

function emptyForm(): CompanyForm {
  return { name: '', legal_name: '', email: '', phone: '', city: '', country_code: 'AE', is_primary: false }
}

function formFromCompany(c: api.Company): CompanyForm {
  return {
    name: c.name ?? '',
    legal_name: c.legal_name ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    city: c.city ?? '',
    country_code: c.country_code ?? 'AE',
    is_primary: c.is_primary,
  }
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'C'
  )
}

export function CompaniesPage() {
  const { can } = useAuth()
  const manage = can('company.manage')
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<api.Company | null>(null)
  const [form, setForm] = useState<CompanyForm>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['companies', search, page],
    queryFn: () => api.listCompanies(search, page),
    placeholderData: keepPreviousData,
  })

  const { data: summary } = useQuery({
    queryKey: ['companies-summary'],
    queryFn: () => api.listCompanies('', 1, 100),
  })

  const rows = data?.data ?? []
  const allRows = summary?.data ?? []

  const stats = useMemo(() => {
    const primary = allRows.filter((c) => c.is_primary).length
    return {
      total: summary?.meta?.total ?? allRows.length,
      primary,
    }
  }, [allRows, summary])

  async function refreshCompanies() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['companies'] }),
      qc.invalidateQueries({ queryKey: ['companies-summary'] }),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: (payload: CompanyForm) =>
      selected ? api.updateCompany(selected.id, payload) : api.createCompany(payload),
    onSuccess: async () => {
      const wasEdit = Boolean(selected)
      setError(null)
      setFieldErrors({})
      closeModal()
      await refreshCompanies()
      success({
        title: wasEdit ? 'Company updated' : 'Company created',
        message: wasEdit ? 'Changes have been saved.' : 'The company has been added to your directory.',
      })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, selected ? 'Failed to update company' : 'Failed to create company'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCompany(id),
    onSuccess: async () => {
      await refreshCompanies()
      success({ title: 'Company deleted', message: 'The company was removed successfully.' })
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to delete company')),
  })

  function openCreate() {
    setSelected(null)
    setForm(emptyForm())
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(c: api.Company) {
    setSelected(c)
    setForm(formFromCompany(c))
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

    if (!form.name.trim()) {
      setFieldErrors({ name: 'Company name is required.' })
      return
    }

    saveMutation.mutate({
      ...form,
      name: form.name.trim(),
      legal_name: form.legal_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      country_code: form.country_code.trim().toUpperCase(),
    })
  }

  async function onDelete(c: api.Company) {
    const ok = await confirm({
      title: 'Delete company?',
      message: `Delete “${c.name}”? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteMutation.mutate(c.id)
  }

  const busy = saveMutation.isPending

  return (
    <div className="stack org-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">Organization</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Companies</span>
          </div>
          <h1 className="page-header-title">Companies</h1>
          <p className="page-header-desc">Manage legal entities inside this tenant.</p>
        </div>
        {manage && (
          <div className="page-header-actions">
            <button type="button" className="button-link" onClick={openCreate}>
              Add company
            </button>
          </div>
        )}
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats org-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Total companies</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat tone-success">
          <span className="tenant-stat-label">Primary</span>
          <strong className="tenant-stat-value">{stats.primary}</strong>
        </div>
      </section>

      <section className="panel org-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Directory</h2>
            <p className="muted small">
              {data?.meta?.total ?? rows.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search companies</span>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search name, email, city…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>
          </div>
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading companies…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No companies found</h3>
            <p className="muted">
              {search
                ? 'Try a different search term.'
                : 'Add a company to represent a legal entity inside this tenant.'}
            </p>
            {manage && !search && (
              <button type="button" className="button-link" onClick={openCreate}>
                Add company
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table org-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="org-entity">
                          <span className="org-avatar" aria-hidden>
                            {initials(c.name)}
                          </span>
                          <div>
                            <strong>{c.name}</strong>
                            {c.legal_name && c.legal_name !== c.name ? (
                              <span className="muted small">{c.legal_name}</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="muted small">{c.email || '—'}</div>
                        {c.phone ? <div className="muted small">{c.phone}</div> : null}
                      </td>
                      <td>{[c.city, c.country_code].filter(Boolean).join(', ') || '—'}</td>
                      <td>
                        {c.is_primary ? (
                          <span className="org-badge-primary">Primary</span>
                        ) : (
                          <span className="muted small">—</span>
                        )}
                      </td>
                      <td>
                        <div className="org-actions">
                          {manage && (
                            <button type="button" className="ghost" onClick={() => openEdit(c)}>
                              Edit
                            </button>
                          )}
                          {manage && !c.is_primary && (
                            <button type="button" className="ghost danger" onClick={() => void onDelete(c)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
            className="modal-card org-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="company-modal-title">{selected ? 'Edit company' : 'Add company'}</h2>
                <p className="muted small">
                  {selected ? 'Update this legal entity’s details.' : 'Create a new legal entity for this tenant.'}
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="org-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid org-modal-grid">
              <FormField label="Name" required error={fieldErrors.name} className="full">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Legal name" error={fieldErrors.legal_name} className="full">
                <input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
              </FormField>
              <FormField label="Email" error={fieldErrors.email}>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </FormField>
              <FormField label="Phone" error={fieldErrors.phone}>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </FormField>
              <FormField label="City" error={fieldErrors.city}>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </FormField>
              <FormField label="Country code" error={fieldErrors.country_code}>
                <input
                  maxLength={2}
                  placeholder="AE"
                  value={form.country_code}
                  onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })}
                />
              </FormField>
              <label className="checkbox full">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                />
                Set as primary company
              </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={busy}>
                  {busy ? 'Saving…' : selected ? 'Save changes' : 'Create company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
