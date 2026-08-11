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

type ClientForm = {
  name: string
  code: string
  contact_person: string
  email: string
  phone: string
  country_code: string
}

function emptyForm(): ClientForm {
  return { name: '', code: '', contact_person: '', email: '', phone: '', country_code: 'AE' }
}

function formFromClient(c: api.Client): ClientForm {
  return {
    name: c.name ?? '',
    code: c.code ?? '',
    contact_person: c.contact_person ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    country_code: c.country_code ?? 'AE',
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

export function ClientsPage() {
  const { can } = useAuth()
  const manage = can('clients.manage')
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<api.Client | null>(null)
  const [form, setForm] = useState<ClientForm>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['clients', search, page],
    queryFn: () => api.listClients(search, page),
    placeholderData: keepPreviousData,
  })

  const { data: summary } = useQuery({
    queryKey: ['clients-summary'],
    queryFn: () => api.listClients('', 1, 100),
  })

  const rows = data?.data ?? []
  const allRows = summary?.data ?? []

  const stats = useMemo(
    () => ({
      total: summary?.meta?.total ?? allRows.length,
    }),
    [allRows, summary],
  )

  async function refreshClients() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['clients'] }),
      qc.invalidateQueries({ queryKey: ['clients-summary'] }),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: (payload: ClientForm) =>
      selected ? api.updateClient(selected.id, payload) : api.createClient(payload),
    onSuccess: async () => {
      const wasEdit = Boolean(selected)
      setError(null)
      setFieldErrors({})
      closeModal()
      await refreshClients()
      success({
        title: wasEdit ? 'Client updated' : 'Client created',
        message: wasEdit ? 'Changes have been saved.' : 'The client is ready to use on projects.',
      })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, selected ? 'Failed to update client' : 'Failed to create client'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteClient(id),
    onSuccess: async () => {
      await refreshClients()
      success({ title: 'Client deleted', message: 'The client was removed successfully.' })
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to delete client')),
  })

  function openCreate() {
    setSelected(null)
    setForm(emptyForm())
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(c: api.Client) {
    setSelected(c)
    setForm(formFromClient(c))
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
      setFieldErrors({ name: 'Client name is required.' })
      return
    }

    saveMutation.mutate({
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      contact_person: form.contact_person.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      country_code: form.country_code.trim().toUpperCase(),
    })
  }

  async function onDelete(c: api.Client) {
    const ok = await confirm({
      title: 'Delete client?',
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
            <span className="page-meta-text">Clients</span>
          </div>
          <h1 className="page-header-title">Clients</h1>
          <p className="page-header-desc">Employers / project owners used when creating projects.</p>
        </div>
        {manage && (
          <div className="page-header-actions">
            <button type="button" className="button-link" onClick={openCreate}>
              Add client
            </button>
          </div>
        )}
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats org-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Total clients</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
      </section>

      <section className="panel org-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Client list</h2>
            <p className="muted small">
              {data?.meta?.total ?? rows.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search clients</span>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search name, code, contact…"
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
          <p className="muted tenants-empty">Loading clients…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No clients found</h3>
            <p className="muted">
              {search ? 'Try a different search term.' : 'Add a client to assign as employer / project owner.'}
            </p>
            {manage && !search && (
              <button type="button" className="button-link" onClick={openCreate}>
                Add client
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table org-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Code</th>
                    <th>Contact</th>
                    <th>Reach</th>
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
                          </div>
                        </div>
                      </td>
                      <td>{c.code ? <code className="org-code">{c.code}</code> : '—'}</td>
                      <td>{c.contact_person ?? '—'}</td>
                      <td>
                        <div className="muted small">{c.email || '—'}</div>
                        {c.phone ? <div className="muted small">{c.phone}</div> : null}
                      </td>
                      <td>
                        <div className="org-actions">
                          {manage && (
                            <button type="button" className="ghost" onClick={() => openEdit(c)}>
                              Edit
                            </button>
                          )}
                          {manage && (
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
            aria-labelledby="client-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="client-modal-title">{selected ? 'Edit client' : 'Add client'}</h2>
                <p className="muted small">
                  {selected ? 'Update this client’s details.' : 'Create a new employer / project owner.'}
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
              <FormField label="Code" error={fieldErrors.code}>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </FormField>
              <FormField label="Contact person" error={fieldErrors.contact_person}>
                <input
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                />
              </FormField>
              <FormField label="Email" error={fieldErrors.email}>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </FormField>
              <FormField label="Phone" error={fieldErrors.phone}>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </FormField>
              <FormField label="Country code" error={fieldErrors.country_code}>
                <input
                  maxLength={2}
                  placeholder="AE"
                  value={form.country_code}
                  onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })}
                />
              </FormField>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={busy}>
                  {busy ? 'Saving…' : selected ? 'Save changes' : 'Create client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
