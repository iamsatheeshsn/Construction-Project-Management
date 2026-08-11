import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api/opsApi'
import type { Equipment, InventoryItem, Subcontractor, Supplier, Warehouse } from '../../services/api/opsApi'
import { useAuth } from '../auth/AuthContext'
import { FormField, Pagination, getErrorMessage, getFieldErrors, useSuccess, type FieldErrors } from '../../ui'

export type OpsSection = 'suppliers' | 'inventory' | 'warehouses' | 'equipment' | 'subcontractors'

const SECTION_NAV: Array<{ section: OpsSection; label: string; permission: string }> = [
  { section: 'suppliers', label: 'Suppliers', permission: 'procurement.view' },
  { section: 'inventory', label: 'Inventory', permission: 'inventory.view' },
  { section: 'warehouses', label: 'Warehouses', permission: 'inventory.view' },
  { section: 'equipment', label: 'Equipment', permission: 'equipment.view' },
  { section: 'subcontractors', label: 'Subcontractors', permission: 'subcontractors.view' },
]

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'success' | 'warn' | 'danger'
}) {
  return (
    <div className={`tenant-stat${tone ? ` tone-${tone}` : ''}`}>
      <span className="tenant-stat-label">{label}</span>
      <strong className="tenant-stat-value">{value}</strong>
      {hint ? <span className="tenant-stat-hint">{hint}</span> : null}
    </div>
  )
}

function StatusChips({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string; count: number }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="tenants-status-chips" role="tablist" aria-label="Filter by status">
      {options.map((opt) => (
        <button
          key={opt.value || 'all'}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={`tenants-chip${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
          <span>{opt.count}</span>
        </button>
      ))}
    </div>
  )
}

function OpsNav({ current }: { current: OpsSection }) {
  const { can } = useAuth()
  return (
    <>
      {SECTION_NAV.filter((s) => s.section !== current && can(s.permission)).map((s) => (
        <Link key={s.section} className="ghost-link" to={`/admin/operations/${s.section}`}>
          {s.label}
        </Link>
      ))}
    </>
  )
}

function NoAccess({ title }: { title: string }) {
  return (
    <div className="stack ops-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">Operations</span>
          </div>
          <h1 className="page-header-title">{title}</h1>
        </div>
      </header>
      <section className="panel ops-panel">
        <p className="muted">You do not have permission to view this catalog.</p>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Suppliers                                                           */
/* ------------------------------------------------------------------ */

const emptySupplierForm = { code: '', name: '', contact_name: '' }

function SuppliersSection() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const success = useSuccess()

  const canView = can('procurement.view')
  const canManage = can('procurement.manage')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptySupplierForm)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['suppliers', page, search, status],
    queryFn: () => api.listSuppliers(page, { search: search.trim() || undefined, status: status || undefined }),
    enabled: canView,
    placeholderData: keepPreviousData,
  })

  const { data: totalSummary } = useQuery({
    queryKey: ['suppliers-summary-total'],
    queryFn: () => api.listSuppliers(1),
    enabled: canView,
  })
  const { data: activeSummary } = useQuery({
    queryKey: ['suppliers-summary-active'],
    queryFn: () => api.listSuppliers(1, { status: 'active' }),
    enabled: canView,
  })
  const { data: inactiveSummary } = useQuery({
    queryKey: ['suppliers-summary-inactive'],
    queryFn: () => api.listSuppliers(1, { status: 'inactive' }),
    enabled: canView,
  })
  const { data: blockedSummary } = useQuery({
    queryKey: ['suppliers-summary-blocked'],
    queryFn: () => api.listSuppliers(1, { status: 'blocked' }),
    enabled: canView,
  })

  const rows = (data?.data ?? []) as Supplier[]
  const stats = {
    total: totalSummary?.meta?.total ?? 0,
    active: activeSummary?.meta?.total ?? 0,
    inactive: inactiveSummary?.meta?.total ?? 0,
    blocked: blockedSummary?.meta?.total ?? 0,
  }

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['suppliers'] }),
      qc.invalidateQueries({ queryKey: ['suppliers-summary-total'] }),
      qc.invalidateQueries({ queryKey: ['suppliers-summary-active'] }),
      qc.invalidateQueries({ queryKey: ['suppliers-summary-inactive'] }),
      qc.invalidateQueries({ queryKey: ['suppliers-summary-blocked'] }),
    ])
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptySupplierForm)
    setError(null)
    setFieldErrors({})
  }

  function payload() {
    return { code: form.code.trim(), name: form.name.trim(), contact_name: form.contact_name.trim() || null }
  }

  const createMutation = useMutation({
    mutationFn: () => api.createSupplier(payload()),
    onSuccess: async () => {
      const name = form.name.trim()
      await refresh()
      closeModal()
      success({ title: 'Supplier created', message: `${name} was added to the supplier catalog.` })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create supplier'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => api.updateSupplier(editingId as number, payload()),
    onSuccess: async () => {
      const name = form.name.trim()
      await refresh()
      closeModal()
      success({ title: 'Supplier updated', message: `${name} was updated.` })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to update supplier'))
    },
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptySupplierForm)
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(row: Supplier) {
    setEditingId(row.id)
    setForm({ code: row.code, name: row.name, contact_name: row.contact_name ?? '' })
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const errs: FieldErrors = {}
    if (!form.code.trim()) errs.code = 'Enter a supplier code.'
    if (!form.name.trim()) errs.name = 'Enter a supplier name.'
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    if (editingId) updateMutation.mutate()
    else createMutation.mutate()
  }

  const busy = createMutation.isPending || updateMutation.isPending

  if (!canView) return <NoAccess title="Suppliers" />

  return (
    <div className="stack ops-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">Operations</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Vendor directory</span>
          </div>
          <h1 className="page-header-title">Suppliers</h1>
          <p className="page-header-desc">
            Vendor directory for procurement, RFQs, and purchase orders.
          </p>
        </div>
        <div className="page-header-actions">
          {canManage && (
            <button type="button" className="button-link" onClick={openCreate}>
              Add supplier
            </button>
          )}
          <OpsNav current="suppliers" />
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats ops-stats">
        <StatTile label="All suppliers" value={stats.total} />
        <StatTile label="Active" value={stats.active} tone="success" />
        <StatTile label="Inactive" value={stats.inactive} tone="warn" />
        <StatTile label="Blocked" value={stats.blocked} tone="danger" />
      </section>

      <section className="panel ops-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Supplier directory</h2>
            <p className="muted small">
              {data?.meta?.total ?? rows.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search suppliers</span>
              <SearchIcon />
              <input
                placeholder="Search code or name…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>
            <StatusChips
              value={status}
              onChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
              options={[
                { value: '', label: 'All', count: stats.total },
                { value: 'active', label: 'Active', count: stats.active },
                { value: 'inactive', label: 'Inactive', count: stats.inactive },
                { value: 'blocked', label: 'Blocked', count: stats.blocked },
              ]}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading suppliers…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No suppliers found</h3>
            <p className="muted">
              {search || status
                ? 'Try clearing filters or adjusting your search.'
                : 'Add a supplier to start requesting quotes and issuing purchase orders.'}
            </p>
            {canManage && !search && !status && (
              <button type="button" className="button-link" onClick={openCreate}>
                Add supplier
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table ops-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <code className="ops-code">{s.code}</code>
                      </td>
                      <td>
                        <strong>{s.name}</strong>
                        {s.contact_name && <div className="muted small">{s.contact_name}</div>}
                      </td>
                      <td>
                        <span className={`badge status-${s.status}`}>{s.status}</span>
                      </td>
                      {canManage && (
                        <td>
                          <button type="button" className="ghost" onClick={() => openEdit(s)}>
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
          </>
        )}
      </section>

      {modalOpen && canManage && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card ops-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ops-modal-header">
              <div>
                <h2 id="supplier-modal-title">{editingId ? 'Edit supplier' : 'Add supplier'}</h2>
                <p className="muted small">
                  {editingId ? 'Update this vendor’s details.' : 'Add a new vendor to the procurement catalog.'}
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="ops-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid">
              <FormField label="Code" required error={fieldErrors.code}>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </FormField>
              <FormField label="Name" required error={fieldErrors.name}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Contact name" error={fieldErrors.contact_name}>
                <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </FormField>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={busy}>
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Inventory                                                            */
/* ------------------------------------------------------------------ */

const emptyItemForm = { sku: '', name: '', unit: 'ea', default_rate: '0', category: '' }

function InventorySection() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const success = useSuccess()

  const canView = can('inventory.view')
  const canManage = can('inventory.manage')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyItemForm)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const isActiveOpt = activeFilter === '' ? undefined : activeFilter === 'active'

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['inventory-items', page, search, activeFilter],
    queryFn: () => api.listInventoryItems(page, { search: search.trim() || undefined, isActive: isActiveOpt }),
    enabled: canView,
    placeholderData: keepPreviousData,
  })

  const { data: totalSummary } = useQuery({
    queryKey: ['inventory-items-summary-total'],
    queryFn: () => api.listInventoryItems(1),
    enabled: canView,
  })
  const { data: activeSummary } = useQuery({
    queryKey: ['inventory-items-summary-active'],
    queryFn: () => api.listInventoryItems(1, { isActive: true }),
    enabled: canView,
  })
  const { data: inactiveSummary } = useQuery({
    queryKey: ['inventory-items-summary-inactive'],
    queryFn: () => api.listInventoryItems(1, { isActive: false }),
    enabled: canView,
  })
  const { data: sampleSummary } = useQuery({
    queryKey: ['inventory-items-sample'],
    queryFn: () => api.listInventoryItems(1, { perPage: 100 }),
    enabled: canView,
  })

  const rows = (data?.data ?? []) as InventoryItem[]
  const sampleRows = (sampleSummary?.data ?? []) as InventoryItem[]
  const categoriesCount = useMemo(
    () => new Set(sampleRows.map((i) => i.category).filter((c): c is string => Boolean(c))).size,
    [sampleRows],
  )
  const totalCount = totalSummary?.meta?.total ?? 0
  const stats = {
    total: totalCount,
    active: activeSummary?.meta?.total ?? 0,
    inactive: inactiveSummary?.meta?.total ?? 0,
    categories: categoriesCount,
  }

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['inventory-items'] }),
      qc.invalidateQueries({ queryKey: ['inventory-items-summary-total'] }),
      qc.invalidateQueries({ queryKey: ['inventory-items-summary-active'] }),
      qc.invalidateQueries({ queryKey: ['inventory-items-summary-inactive'] }),
      qc.invalidateQueries({ queryKey: ['inventory-items-sample'] }),
    ])
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyItemForm)
    setError(null)
    setFieldErrors({})
  }

  function payload() {
    return {
      sku: form.sku.trim(),
      name: form.name.trim(),
      unit: form.unit.trim(),
      category: form.category.trim() || null,
      default_rate: Number(form.default_rate || 0),
    }
  }

  const createMutation = useMutation({
    mutationFn: () => api.createInventoryItem(payload()),
    onSuccess: async () => {
      const name = form.name.trim()
      await refresh()
      closeModal()
      success({ title: 'Inventory item created', message: `${name} was added to the catalog.` })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create inventory item'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => api.updateInventoryItem(editingId as number, payload()),
    onSuccess: async () => {
      const name = form.name.trim()
      await refresh()
      closeModal()
      success({ title: 'Inventory item updated', message: `${name} was updated.` })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to update inventory item'))
    },
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptyItemForm)
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(row: InventoryItem) {
    setEditingId(row.id)
    setForm({
      sku: row.sku,
      name: row.name,
      unit: row.unit ?? '',
      default_rate: String(row.default_rate ?? '0'),
      category: row.category ?? '',
    })
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const errs: FieldErrors = {}
    if (!form.sku.trim()) errs.sku = 'Enter a SKU.'
    if (!form.name.trim()) errs.name = 'Enter an item name.'
    if (!form.unit.trim()) errs.unit = 'Enter a unit of measure.'
    if (form.default_rate !== '' && Number(form.default_rate) < 0) errs.default_rate = 'Rate cannot be negative.'
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    if (editingId) updateMutation.mutate()
    else createMutation.mutate()
  }

  const busy = createMutation.isPending || updateMutation.isPending

  if (!canView) return <NoAccess title="Inventory" />

  return (
    <div className="stack ops-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">Operations</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Stock catalog</span>
          </div>
          <h1 className="page-header-title">Inventory</h1>
          <p className="page-header-desc">Catalog items and default rates used across stock control and issues.</p>
        </div>
        <div className="page-header-actions">
          {canManage && (
            <button type="button" className="button-link" onClick={openCreate}>
              Add item
            </button>
          )}
          <OpsNav current="inventory" />
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats ops-stats">
        <StatTile label="All items" value={stats.total} />
        <StatTile label="Active" value={stats.active} tone="success" />
        <StatTile label="Inactive" value={stats.inactive} tone="warn" />
        <StatTile
          label="Categories tracked"
          value={stats.categories}
          hint={totalCount > sampleRows.length ? `From latest ${sampleRows.length} items` : undefined}
        />
      </section>

      <section className="panel ops-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Inventory items</h2>
            <p className="muted small">
              {data?.meta?.total ?? rows.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search inventory items</span>
              <SearchIcon />
              <input
                placeholder="Search SKU or name…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>
            <StatusChips
              value={activeFilter}
              onChange={(v) => {
                setActiveFilter(v)
                setPage(1)
              }}
              options={[
                { value: '', label: 'All', count: stats.total },
                { value: 'active', label: 'Active', count: stats.active },
                { value: 'inactive', label: 'Inactive', count: stats.inactive },
              ]}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading inventory…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No inventory items found</h3>
            <p className="muted">
              {search || activeFilter
                ? 'Try clearing filters or adjusting your search.'
                : 'Add an item to start tracking stock levels and default rates.'}
            </p>
            {canManage && !search && !activeFilter && (
              <button type="button" className="button-link" onClick={openCreate}>
                Add item
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table ops-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Item</th>
                    <th>Unit</th>
                    <th>Default rate</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <code className="ops-code">{i.sku}</code>
                      </td>
                      <td>
                        <strong>{i.name}</strong>
                        {i.category && <div className="muted small">{i.category}</div>}
                      </td>
                      <td>{i.unit}</td>
                      <td>{Number(i.default_rate).toLocaleString()}</td>
                      <td>
                        <span className={`badge status-${i.is_active === false ? 'inactive' : 'active'}`}>
                          {i.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          <button type="button" className="ghost" onClick={() => openEdit(i)}>
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
          </>
        )}
      </section>

      {modalOpen && canManage && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card ops-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ops-modal-header">
              <div>
                <h2 id="item-modal-title">{editingId ? 'Edit inventory item' : 'Add inventory item'}</h2>
                <p className="muted small">
                  {editingId ? 'Update this catalog item.' : 'Add a new item to the inventory catalog.'}
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="ops-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid">
              <FormField label="SKU" required error={fieldErrors.sku}>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </FormField>
              <FormField label="Name" required error={fieldErrors.name}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Unit" required error={fieldErrors.unit}>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </FormField>
              <FormField label="Category" error={fieldErrors.category}>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </FormField>
              <FormField label="Default rate" error={fieldErrors.default_rate}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.default_rate}
                  onChange={(e) => setForm({ ...form, default_rate: e.target.value })}
                />
              </FormField>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={busy}>
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Warehouses                                                           */
/* ------------------------------------------------------------------ */

const emptyWarehouseForm = { code: '', name: '', location: '' }

function WarehousesSection() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const success = useSuccess()

  const canView = can('inventory.view')
  const canManage = can('inventory.manage')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyWarehouseForm)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['warehouses', page],
    queryFn: () => api.listWarehouses(undefined, page),
    enabled: canView,
    placeholderData: keepPreviousData,
  })

  const { data: sampleSummary } = useQuery({
    queryKey: ['warehouses-sample'],
    queryFn: () => api.listWarehouses(undefined, 1, { perPage: 100 }),
    enabled: canView,
  })

  const allRows = (data?.data ?? []) as Warehouse[]
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter(
      (w) =>
        w.code.toLowerCase().includes(q) ||
        w.name.toLowerCase().includes(q) ||
        (w.location ?? '').toLowerCase().includes(q),
    )
  }, [allRows, search])

  const sampleRows = (sampleSummary?.data ?? []) as Warehouse[]
  const stats = {
    total: sampleSummary?.meta?.total ?? data?.meta?.total ?? 0,
    default: sampleRows.filter((w) => w.is_default).length,
    tenantWide: sampleRows.filter((w) => !w.project_id).length,
    projectSpecific: sampleRows.filter((w) => w.project_id).length,
  }

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['warehouses'] }),
      qc.invalidateQueries({ queryKey: ['warehouses-sample'] }),
    ])
  }

  function closeModal() {
    setModalOpen(false)
    setForm(emptyWarehouseForm)
    setError(null)
    setFieldErrors({})
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createWarehouse({
        code: form.code.trim(),
        name: form.name.trim(),
        location: form.location.trim() || null,
      }),
    onSuccess: async () => {
      const name = form.name.trim()
      await refresh()
      closeModal()
      success({ title: 'Warehouse created', message: `${name} was added to the catalog.` })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create warehouse'))
    },
  })

  function openCreate() {
    setForm(emptyWarehouseForm)
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const errs: FieldErrors = {}
    if (!form.code.trim()) errs.code = 'Enter a warehouse code.'
    if (!form.name.trim()) errs.name = 'Enter a warehouse name.'
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    createMutation.mutate()
  }

  const busy = createMutation.isPending

  if (!canView) return <NoAccess title="Warehouses" />

  return (
    <div className="stack ops-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">Operations</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Storage locations</span>
          </div>
          <h1 className="page-header-title">Warehouses</h1>
          <p className="page-header-desc">Tenant and project storage locations used for stock balances and issues.</p>
        </div>
        <div className="page-header-actions">
          {canManage && (
            <button type="button" className="button-link" onClick={openCreate}>
              Add warehouse
            </button>
          )}
          <OpsNav current="warehouses" />
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats ops-stats">
        <StatTile label="All warehouses" value={stats.total} />
        <StatTile label="Default" value={stats.default} tone="success" />
        <StatTile label="Tenant-wide" value={stats.tenantWide} />
        <StatTile label="Project-specific" value={stats.projectSpecific} />
      </section>

      <section className="panel ops-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Warehouse directory</h2>
            <p className="muted small">
              {search ? `${rows.length} matching on this page` : `${data?.meta?.total ?? rows.length} total`}
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search warehouses</span>
              <SearchIcon />
              <input
                placeholder="Search this page…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading warehouses…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No warehouses found</h3>
            <p className="muted">
              {search
                ? 'Try clearing your search or checking another page.'
                : 'Add a warehouse to start tracking stock by location.'}
            </p>
            {canManage && !search && (
              <button type="button" className="button-link" onClick={openCreate}>
                Add warehouse
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table ops-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Warehouse</th>
                    <th>Scope</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <code className="ops-code">{w.code}</code>
                      </td>
                      <td>
                        <strong>{w.name}</strong>
                        {w.location && <div className="muted small">{w.location}</div>}
                      </td>
                      <td>
                        <span className="ops-scope-tag">{w.project_id ? `Project #${w.project_id}` : 'Tenant-wide'}</span>
                        {w.is_default && <span className="badge status-active ops-default-tag">Default</span>}
                      </td>
                      <td>
                        <span className={`badge status-${w.status ?? 'active'}`}>{w.status ?? 'active'}</span>
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

      {modalOpen && canManage && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card ops-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="warehouse-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ops-modal-header">
              <div>
                <h2 id="warehouse-modal-title">Add warehouse</h2>
                <p className="muted small">Add a new storage location for stock balances and issues.</p>
              </div>
              <button type="button" className="ghost" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="ops-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid">
              <FormField label="Code" required error={fieldErrors.code}>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </FormField>
              <FormField label="Name" required error={fieldErrors.name}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Location" error={fieldErrors.location}>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </FormField>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={busy}>
                  {busy ? 'Saving…' : 'Create warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Equipment                                                            */
/* ------------------------------------------------------------------ */

const emptyEquipmentForm = { code: '', name: '', category: '', ownership: 'owned', daily_rate: '' }

function EquipmentSection() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const success = useSuccess()

  const canView = can('equipment.view')
  const canManage = can('equipment.manage')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyEquipmentForm)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['equipment', page, search, status],
    queryFn: () => api.listEquipment(page, { search: search.trim() || undefined, status: status || undefined }),
    enabled: canView,
    placeholderData: keepPreviousData,
  })

  const { data: totalSummary } = useQuery({
    queryKey: ['equipment-summary-total'],
    queryFn: () => api.listEquipment(1),
    enabled: canView,
  })
  const { data: availableSummary } = useQuery({
    queryKey: ['equipment-summary-available'],
    queryFn: () => api.listEquipment(1, { status: 'available' }),
    enabled: canView,
  })
  const { data: assignedSummary } = useQuery({
    queryKey: ['equipment-summary-assigned'],
    queryFn: () => api.listEquipment(1, { status: 'assigned' }),
    enabled: canView,
  })
  const { data: maintenanceSummary } = useQuery({
    queryKey: ['equipment-summary-maintenance'],
    queryFn: () => api.listEquipment(1, { status: 'maintenance' }),
    enabled: canView,
  })
  const { data: retiredSummary } = useQuery({
    queryKey: ['equipment-summary-retired'],
    queryFn: () => api.listEquipment(1, { status: 'retired' }),
    enabled: canView,
  })

  const rows = (data?.data ?? []) as Equipment[]
  const stats = {
    total: totalSummary?.meta?.total ?? 0,
    available: availableSummary?.meta?.total ?? 0,
    assigned: assignedSummary?.meta?.total ?? 0,
    maintenance: maintenanceSummary?.meta?.total ?? 0,
    retired: retiredSummary?.meta?.total ?? 0,
  }

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['equipment'] }),
      qc.invalidateQueries({ queryKey: ['equipment-summary-total'] }),
      qc.invalidateQueries({ queryKey: ['equipment-summary-available'] }),
      qc.invalidateQueries({ queryKey: ['equipment-summary-assigned'] }),
      qc.invalidateQueries({ queryKey: ['equipment-summary-maintenance'] }),
      qc.invalidateQueries({ queryKey: ['equipment-summary-retired'] }),
    ])
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyEquipmentForm)
    setError(null)
    setFieldErrors({})
  }

  function payload() {
    return {
      code: form.code.trim() || undefined,
      name: form.name.trim(),
      category: form.category.trim() || null,
      ownership: form.ownership,
      daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
    }
  }

  const createMutation = useMutation({
    mutationFn: () => api.createEquipment(payload()),
    onSuccess: async () => {
      const name = form.name.trim()
      await refresh()
      closeModal()
      success({ title: 'Equipment created', message: `${name} was added to the fleet catalog.` })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create equipment'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => api.updateEquipment(editingId as number, payload()),
    onSuccess: async () => {
      const name = form.name.trim()
      await refresh()
      closeModal()
      success({ title: 'Equipment updated', message: `${name} was updated.` })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to update equipment'))
    },
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptyEquipmentForm)
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(row: Equipment) {
    setEditingId(row.id)
    setForm({
      code: row.code ?? '',
      name: row.name,
      category: row.category ?? '',
      ownership: row.ownership ?? 'owned',
      daily_rate: row.daily_rate != null ? String(row.daily_rate) : '',
    })
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const errs: FieldErrors = {}
    if (!form.name.trim()) errs.name = 'Enter an equipment name.'
    if (!form.ownership) errs.ownership = 'Select an ownership type.'
    if (form.daily_rate !== '' && Number(form.daily_rate) < 0) errs.daily_rate = 'Daily rate cannot be negative.'
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    if (editingId) updateMutation.mutate()
    else createMutation.mutate()
  }

  const busy = createMutation.isPending || updateMutation.isPending

  if (!canView) return <NoAccess title="Equipment" />

  return (
    <div className="stack ops-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">Operations</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Fleet catalog</span>
          </div>
          <h1 className="page-header-title">Equipment</h1>
          <p className="page-header-desc">Owned, rented, and leased fleet units available for project assignment.</p>
        </div>
        <div className="page-header-actions">
          {canManage && (
            <button type="button" className="button-link" onClick={openCreate}>
              Add equipment
            </button>
          )}
          <OpsNav current="equipment" />
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats ops-stats">
        <StatTile label="All equipment" value={stats.total} />
        <StatTile label="Available" value={stats.available} tone="success" />
        <StatTile label="Assigned" value={stats.assigned} />
        <StatTile label="In maintenance" value={stats.maintenance} tone="warn" />
      </section>

      <section className="panel ops-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Fleet units</h2>
            <p className="muted small">
              {data?.meta?.total ?? rows.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search equipment</span>
              <SearchIcon />
              <input
                placeholder="Search code or name…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>
            <StatusChips
              value={status}
              onChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
              options={[
                { value: '', label: 'All', count: stats.total },
                { value: 'available', label: 'Available', count: stats.available },
                { value: 'assigned', label: 'Assigned', count: stats.assigned },
                { value: 'maintenance', label: 'Maintenance', count: stats.maintenance },
                { value: 'retired', label: 'Retired', count: stats.retired },
              ]}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading equipment…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No equipment found</h3>
            <p className="muted">
              {search || status
                ? 'Try clearing filters or adjusting your search.'
                : 'Add a unit to start assigning equipment to projects.'}
            </p>
            {canManage && !search && !status && (
              <button type="button" className="button-link" onClick={openCreate}>
                Add equipment
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table ops-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Equipment</th>
                    <th>Ownership</th>
                    <th>Daily rate</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <code className="ops-code">{e.code || '—'}</code>
                      </td>
                      <td>
                        <strong>{e.name}</strong>
                        {e.category && <div className="muted small">{e.category}</div>}
                      </td>
                      <td>
                        <span className="badge">{e.ownership ?? '—'}</span>
                      </td>
                      <td>{e.daily_rate != null ? Number(e.daily_rate).toLocaleString() : '—'}</td>
                      <td>
                        <span className={`badge status-${e.status}`}>{e.status}</span>
                      </td>
                      {canManage && (
                        <td>
                          <button type="button" className="ghost" onClick={() => openEdit(e)}>
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
          </>
        )}
      </section>

      {modalOpen && canManage && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card ops-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="equipment-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ops-modal-header">
              <div>
                <h2 id="equipment-modal-title">{editingId ? 'Edit equipment' : 'Add equipment'}</h2>
                <p className="muted small">
                  {editingId ? 'Update this fleet unit.' : 'Add a new unit to the equipment fleet catalog.'}
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="ops-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid">
              <FormField label="Code" error={fieldErrors.code}>
                <input
                  placeholder="Auto-generated if left blank"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </FormField>
              <FormField label="Name" required error={fieldErrors.name}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Category" error={fieldErrors.category}>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </FormField>
              <FormField label="Ownership" required error={fieldErrors.ownership}>
                <select
                  value={form.ownership}
                  onChange={(e) => setForm({ ...form, ownership: e.target.value })}
                >
                  <option value="owned">Owned</option>
                  <option value="rented">Rented</option>
                  <option value="leased">Leased</option>
                </select>
              </FormField>
              <FormField label="Daily rate" error={fieldErrors.daily_rate}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.daily_rate}
                  onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
                />
              </FormField>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={busy}>
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Subcontractors                                                       */
/* ------------------------------------------------------------------ */

const emptySubForm = { code: '', name: '', trade: '', contact_name: '' }

function SubcontractorsSection() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const success = useSuccess()

  const canView = can('subcontractors.view')
  const canManage = can('subcontractors.manage')

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptySubForm)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['subcontractors', page, search, status],
    queryFn: () => api.listSubcontractors(page, { search: search.trim() || undefined, status: status || undefined }),
    enabled: canView,
    placeholderData: keepPreviousData,
  })

  const { data: totalSummary } = useQuery({
    queryKey: ['subcontractors-summary-total'],
    queryFn: () => api.listSubcontractors(1),
    enabled: canView,
  })
  const { data: activeSummary } = useQuery({
    queryKey: ['subcontractors-summary-active'],
    queryFn: () => api.listSubcontractors(1, { status: 'active' }),
    enabled: canView,
  })
  const { data: blacklistedSummary } = useQuery({
    queryKey: ['subcontractors-summary-blacklisted'],
    queryFn: () => api.listSubcontractors(1, { status: 'blacklisted' }),
    enabled: canView,
  })
  const { data: sampleSummary } = useQuery({
    queryKey: ['subcontractors-sample'],
    queryFn: () => api.listSubcontractors(1, { perPage: 100 }),
    enabled: canView,
  })

  const rows = (data?.data ?? []) as Subcontractor[]
  const sampleRows = (sampleSummary?.data ?? []) as Subcontractor[]
  const tradesCount = useMemo(
    () => new Set(sampleRows.map((s) => s.trade).filter((t): t is string => Boolean(t))).size,
    [sampleRows],
  )
  const totalCount = totalSummary?.meta?.total ?? 0
  const stats = {
    total: totalCount,
    active: activeSummary?.meta?.total ?? 0,
    blacklisted: blacklistedSummary?.meta?.total ?? 0,
    trades: tradesCount,
  }

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['subcontractors'] }),
      qc.invalidateQueries({ queryKey: ['subcontractors-summary-total'] }),
      qc.invalidateQueries({ queryKey: ['subcontractors-summary-active'] }),
      qc.invalidateQueries({ queryKey: ['subcontractors-summary-blacklisted'] }),
      qc.invalidateQueries({ queryKey: ['subcontractors-sample'] }),
    ])
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptySubForm)
    setError(null)
    setFieldErrors({})
  }

  function payload() {
    return {
      code: form.code.trim() || undefined,
      name: form.name.trim(),
      trade: form.trade.trim() || null,
      contact_name: form.contact_name.trim() || null,
    }
  }

  const createMutation = useMutation({
    mutationFn: () => api.createSubcontractor(payload()),
    onSuccess: async () => {
      const name = form.name.trim()
      await refresh()
      closeModal()
      success({ title: 'Subcontractor created', message: `${name} was added to the catalog.` })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create subcontractor'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => api.updateSubcontractor(editingId as number, payload()),
    onSuccess: async () => {
      const name = form.name.trim()
      await refresh()
      closeModal()
      success({ title: 'Subcontractor updated', message: `${name} was updated.` })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to update subcontractor'))
    },
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptySubForm)
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(row: Subcontractor) {
    setEditingId(row.id)
    setForm({
      code: row.code ?? '',
      name: row.name,
      trade: row.trade ?? '',
      contact_name: row.contact_name ?? '',
    })
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const errs: FieldErrors = {}
    if (!form.name.trim()) errs.name = 'Enter a subcontractor name.'
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    if (editingId) updateMutation.mutate()
    else createMutation.mutate()
  }

  const busy = createMutation.isPending || updateMutation.isPending

  if (!canView) return <NoAccess title="Subcontractors" />

  return (
    <div className="stack ops-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">Operations</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Trade partners</span>
          </div>
          <h1 className="page-header-title">Subcontractors</h1>
          <p className="page-header-desc">Trade partners available for subcontract packages and work assignments.</p>
        </div>
        <div className="page-header-actions">
          {canManage && (
            <button type="button" className="button-link" onClick={openCreate}>
              Add subcontractor
            </button>
          )}
          <OpsNav current="subcontractors" />
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats ops-stats">
        <StatTile label="All subcontractors" value={stats.total} />
        <StatTile label="Active" value={stats.active} tone="success" />
        <StatTile
          label="Trades tracked"
          value={stats.trades}
          hint={totalCount > sampleRows.length ? `From latest ${sampleRows.length} records` : undefined}
        />
        <StatTile label="Blacklisted" value={stats.blacklisted} tone="danger" />
      </section>

      <section className="panel ops-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Subcontractor directory</h2>
            <p className="muted small">
              {data?.meta?.total ?? rows.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search subcontractors</span>
              <SearchIcon />
              <input
                placeholder="Search code or name…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>
            <StatusChips
              value={status}
              onChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
              options={[
                { value: '', label: 'All', count: stats.total },
                { value: 'active', label: 'Active', count: stats.active },
                { value: 'inactive', label: 'Inactive', count: stats.total - stats.active - stats.blacklisted },
                { value: 'blacklisted', label: 'Blacklisted', count: stats.blacklisted },
              ]}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading subcontractors…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No subcontractors found</h3>
            <p className="muted">
              {search || status
                ? 'Try clearing filters or adjusting your search.'
                : 'Add a subcontractor to start awarding work packages.'}
            </p>
            {canManage && !search && !status && (
              <button type="button" className="button-link" onClick={openCreate}>
                Add subcontractor
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table ops-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Subcontractor</th>
                    <th>Trade</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <code className="ops-code">{s.code || '—'}</code>
                      </td>
                      <td>
                        <strong>{s.name}</strong>
                        {s.contact_name && <div className="muted small">{s.contact_name}</div>}
                      </td>
                      <td>{s.trade ?? '—'}</td>
                      <td>
                        <span className={`badge status-${s.status}`}>{s.status}</span>
                      </td>
                      {canManage && (
                        <td>
                          <button type="button" className="ghost" onClick={() => openEdit(s)}>
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
          </>
        )}
      </section>

      {modalOpen && canManage && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card ops-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="subcontractor-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ops-modal-header">
              <div>
                <h2 id="subcontractor-modal-title">{editingId ? 'Edit subcontractor' : 'Add subcontractor'}</h2>
                <p className="muted small">
                  {editingId ? 'Update this trade partner.' : 'Add a new trade partner to the catalog.'}
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="ops-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid">
              <FormField label="Code" error={fieldErrors.code}>
                <input
                  placeholder="Auto-generated if left blank"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </FormField>
              <FormField label="Name" required error={fieldErrors.name}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Trade" error={fieldErrors.trade}>
                <input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} />
              </FormField>
              <FormField label="Contact name" error={fieldErrors.contact_name}>
                <input
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                />
              </FormField>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={busy}>
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create subcontractor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                           */
/* ------------------------------------------------------------------ */

export function OpsCatalogPage({ section }: { section: OpsSection }) {
  switch (section) {
    case 'suppliers':
      return <SuppliersSection />
    case 'inventory':
      return <InventorySection />
    case 'warehouses':
      return <WarehousesSection />
    case 'equipment':
      return <EquipmentSection />
    case 'subcontractors':
      return <SubcontractorsSection />
    default:
      return null
  }
}
