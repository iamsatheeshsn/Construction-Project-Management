import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api/saasRbacApi'
import { useAuth } from '../auth/AuthContext'
import {
  DEFAULT_PAGE_SIZE,
  FormField,
  Pagination,
  getErrorMessage,
  getFieldErrors,
  useConfirm,
  useSuccess,
  type FieldErrors,
} from '../../ui'

type Permission = { id: number; code: string; name: string; module: string; description?: string | null }
type Role = {
  id: number
  code: string
  name: string
  description?: string | null
  scope?: string
  is_system?: boolean
  tenant_id?: number | null
  permissions?: Permission[]
}

type RoleFilter = 'all' | 'system' | 'custom'

const emptyForm = {
  code: '',
  name: '',
  description: '',
  scope: 'tenant' as 'tenant' | 'project',
  permission_ids: [] as number[],
}

export function RolesPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<RoleFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const canView = can('users.view') || can('roles.manage')
  const canManage = can('roles.manage')

  const { data: roles = [], isLoading, isFetching } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: () => api.listRbacRoles(),
    enabled: canView,
  })

  const { data: catalog } = useQuery({
    queryKey: ['permission-catalog'],
    queryFn: () => api.listPermissionCatalog(),
    enabled: canManage,
  })

  const permissions: Permission[] = useMemo(() => {
    const raw = catalog?.data ?? []
    return Array.isArray(raw) ? raw : []
  }, [catalog])

  const byModule = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of permissions) {
      const list = map.get(p.module) ?? []
      list.push(p)
      map.set(p.module, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [permissions])

  const allRoles = roles as Role[]

  const stats = useMemo(() => {
    const system = allRoles.filter((r) => r.is_system).length
    const custom = allRoles.length - system
    const totalPermissions = allRoles.reduce((sum, r) => sum + (r.permissions?.length ?? 0), 0)
    return {
      total: allRoles.length,
      system,
      custom,
      totalPermissions,
    }
  }, [allRoles])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRoles.filter((r) => {
      if (filter === 'system' && !r.is_system) return false
      if (filter === 'custom' && r.is_system) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
    })
  }, [allRoles, search, filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * DEFAULT_PAGE_SIZE, currentPage * DEFAULT_PAGE_SIZE)
  const pageMeta = {
    current_page: currentPage,
    last_page: pageCount,
    per_page: DEFAULT_PAGE_SIZE,
    total: filtered.length,
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createRbacRole({
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        scope: form.scope,
        permission_ids: form.permission_ids,
      }),
    onSuccess: async () => {
      closeModal()
      await qc.invalidateQueries({ queryKey: ['rbac-roles'] })
      success({ title: 'Role created', message: 'Custom role is ready to assign.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create role'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateRbacRole(editingRole!.id, {
        name: form.name,
        description: form.description || null,
        scope: form.scope,
        permission_ids: form.permission_ids,
      }),
    onSuccess: async () => {
      closeModal()
      await qc.invalidateQueries({ queryKey: ['rbac-roles'] })
      success({ title: 'Role updated', message: 'Permissions and details saved.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to update role'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteRbacRole(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['rbac-roles'] })
      success({ title: 'Role deleted', message: 'The role was removed.' })
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to delete role')),
  })

  function openCreate() {
    setEditingRole(null)
    setForm(emptyForm)
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(role: Role) {
    setEditingRole(role)
    setForm({
      code: role.code,
      name: role.name,
      description: role.description ?? '',
      scope: (role.scope as 'tenant' | 'project') || 'tenant',
      permission_ids: (role.permissions ?? []).map((p) => p.id),
    })
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingRole(null)
    setForm(emptyForm)
    setError(null)
    setFieldErrors({})
  }

  function togglePermission(id: number) {
    setForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(id)
        ? prev.permission_ids.filter((x) => x !== id)
        : [...prev.permission_ids, id],
    }))
  }

  async function onDelete(role: Role) {
    const ok = await confirm({
      title: 'Delete role?',
      message: `Delete “${role.name}”? This cannot be undone and any members holding this role will lose its permissions.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteMutation.mutate(role.id)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const nextErrors: FieldErrors = {}
    if (!editingRole && !form.code.trim()) nextErrors.code = 'Enter a role code.'
    if (!form.name.trim()) nextErrors.name = 'Enter a role name.'
    if (!form.scope) nextErrors.scope = 'Select a scope.'
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      return
    }

    if (editingRole) updateMutation.mutate()
    else createMutation.mutate()
  }

  const pending = createMutation.isPending || updateMutation.isPending

  if (!canView) {
    return <p className="muted">You do not have permission to view roles.</p>
  }

  return (
    <div className="stack rbac-roles-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">RBAC</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Access control</span>
          </div>
          <h1 className="page-header-title">Roles</h1>
          <p className="page-header-desc">
            Define roles and attach permissions from the catalog. System roles ship with the platform; custom
            roles are scoped to your tenant.
          </p>
        </div>
        <div className="page-header-actions">
          {canManage && (
            <button type="button" className="button-link" onClick={openCreate}>
              Create role
            </button>
          )}
          <Link className="ghost-link" to="/admin/rbac/permissions">
            Permissions
          </Link>
          <Link className="ghost-link" to="/admin/rbac/policies">
            Policies
          </Link>
          <Link className="ghost-link" to="/admin/rbac/users">
            Users
          </Link>
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats rbac-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Total roles</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">System roles</span>
          <strong className="tenant-stat-value">{stats.system}</strong>
        </div>
        <div className="tenant-stat tone-success">
          <span className="tenant-stat-label">Custom roles</span>
          <strong className="tenant-stat-value">{stats.custom}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Permissions attached</span>
          <strong className="tenant-stat-value">{stats.totalPermissions}</strong>
        </div>
      </section>

      <section className="panel rbac-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Role list</h2>
            <p className="muted small">
              {filtered.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search roles</span>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search name or code…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>

            <div className="tenants-status-chips" role="tablist" aria-label="Filter by type">
              {(
                [
                  { value: 'all' as const, label: 'All', count: stats.total },
                  { value: 'system' as const, label: 'System', count: stats.system },
                  { value: 'custom' as const, label: 'Custom', count: stats.custom },
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
          <p className="muted tenants-empty">Loading roles…</p>
        ) : filtered.length === 0 ? (
          <div className="tenants-empty">
            <h3>No roles found</h3>
            <p className="muted">
              {search || filter !== 'all'
                ? 'Try clearing filters or adjusting your search.'
                : 'Create a role to start assigning tailored permission sets.'}
            </p>
            {!search && filter === 'all' && canManage && (
              <button type="button" className="button-link" onClick={openCreate}>
                Create role
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table rbac-roles-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Scope</th>
                    <th>Permissions</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.name}</strong>
                        <div className="muted small">
                          <code className="rbac-code">{r.code}</code>
                        </div>
                        {r.description ? <div className="muted small">{r.description}</div> : null}
                      </td>
                      <td className="rbac-capitalize">{r.scope ?? 'tenant'}</td>
                      <td>
                        <span className="rbac-count-pill">{r.permissions?.length ?? 0}</span>
                      </td>
                      <td>
                        <span className={`badge ${r.is_system ? 'rbac-badge-system' : 'rbac-badge-custom'}`}>
                          {r.is_system ? 'System' : 'Custom'}
                        </span>
                      </td>
                      <td>
                        {canManage && (
                          <div className="rbac-row-actions">
                            <button type="button" className="ghost" onClick={() => openEdit(r)}>
                              Edit
                            </button>
                            {!r.is_system && r.tenant_id != null && (
                              <button type="button" className="ghost danger" onClick={() => void onDelete(r)}>
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={pageMeta} page={currentPage} onPageChange={setPage} />
          </>
        )}
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card rbac-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="role-modal-title">{editingRole ? 'Update role' : 'Create role'}</h2>
                <p className="muted small">
                  {editingRole ? 'Change details and attached permissions.' : 'Add a new custom role for this tenant.'}
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="rbac-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid rbac-form-grid">
              {!editingRole && (
                <FormField label="Code" required error={fieldErrors.code}>
                  <input
                    placeholder="e.g. site_supervisor"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </FormField>
              )}
              <FormField label="Name" required error={fieldErrors.name}>
                <input
                  placeholder="e.g. Site Supervisor"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FormField>
              <FormField label="Description" error={fieldErrors.description}>
                <input
                  placeholder="Optional summary of what this role can do"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </FormField>
              <FormField label="Scope" required error={fieldErrors.scope}>
                <select
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value as 'tenant' | 'project' })}
                >
                  <option value="tenant">Tenant</option>
                  <option value="project">Project</option>
                </select>
              </FormField>

              <FormField label="Permissions" required error={fieldErrors.permission_ids} className="span-2">
                <div className="rbac-permission-groups">
                  {byModule.length === 0 && <p className="muted small">No permissions available.</p>}
                  {byModule.map(([module, perms]) => (
                    <div key={module} className="rbac-permission-group">
                      <strong className="rbac-permission-group-title">{module}</strong>
                      <div className="rbac-permission-grid">
                        {perms.map((p) => (
                          <label key={p.id} className="checkbox rbac-permission-item">
                            <input
                              type="checkbox"
                              checked={form.permission_ids.includes(p.id)}
                              onChange={() => togglePermission(p.id)}
                            />
                            <span>
                              {p.name}
                              <span className="muted small rbac-permission-code"> ({p.code})</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {form.permission_ids.length === 0 && (
                  <p className="muted small register-hint">
                    No permissions selected — members with this role will have no access until permissions are
                    attached.
                  </p>
                )}
              </FormField>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={pending}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={pending}>
                  {pending ? 'Saving…' : editingRole ? 'Update role' : 'Create role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
