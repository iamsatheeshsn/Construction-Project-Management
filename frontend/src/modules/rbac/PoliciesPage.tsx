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

type Permission = { id: number; code: string; name: string; module: string }
type Policy = {
  id: number
  code: string
  name: string
  description?: string | null
  effect: string
  scope: string
  permission_codes?: string[] | null
  is_active?: boolean
  is_system?: boolean
  tenant_id?: number | null
}

type EffectFilter = 'all' | 'allow' | 'deny'
type ActiveFilter = 'all' | 'active' | 'inactive'

const emptyForm = {
  code: '',
  name: '',
  description: '',
  effect: 'allow' as 'allow' | 'deny',
  scope: 'tenant' as 'tenant' | 'project',
  permission_codes: [] as string[],
  is_active: true,
}

export function PoliciesPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [effectFilter, setEffectFilter] = useState<EffectFilter>('all')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const canView = can('users.view') || can('roles.manage')
  const canManage = can('roles.manage')

  const { data: policies = [], isLoading, isFetching } = useQuery({
    queryKey: ['rbac-policies'],
    queryFn: () => api.listRbacPolicies(),
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

  const allPolicies = policies as Policy[]

  const stats = useMemo(() => {
    const allow = allPolicies.filter((p) => p.effect === 'allow').length
    const deny = allPolicies.filter((p) => p.effect === 'deny').length
    const active = allPolicies.filter((p) => p.is_active !== false).length
    return { total: allPolicies.length, allow, deny, active }
  }, [allPolicies])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allPolicies.filter((p) => {
      if (effectFilter !== 'all' && p.effect !== effectFilter) return false
      if (activeFilter === 'active' && p.is_active === false) return false
      if (activeFilter === 'inactive' && p.is_active !== false) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    })
  }, [allPolicies, search, effectFilter, activeFilter])

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
      api.createRbacPolicy({
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        effect: form.effect,
        scope: form.scope,
        permission_codes: form.permission_codes,
        is_active: form.is_active,
      }),
    onSuccess: async () => {
      closeModal()
      await qc.invalidateQueries({ queryKey: ['rbac-policies'] })
      success({ title: 'Policy created', message: 'Access policy is active for this tenant.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create policy'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateRbacPolicy(editingPolicy!.id, {
        name: form.name,
        description: form.description || null,
        effect: form.effect,
        scope: form.scope,
        permission_codes: form.permission_codes,
        is_active: form.is_active,
      }),
    onSuccess: async () => {
      closeModal()
      await qc.invalidateQueries({ queryKey: ['rbac-policies'] })
      success({ title: 'Policy updated', message: 'Access policy changes saved.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to update policy'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteRbacPolicy(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['rbac-policies'] })
      success({ title: 'Policy deleted', message: 'The access policy was removed.' })
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to delete policy')),
  })

  function openCreate() {
    setEditingPolicy(null)
    setForm(emptyForm)
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(policy: Policy) {
    setEditingPolicy(policy)
    setForm({
      code: policy.code,
      name: policy.name,
      description: policy.description ?? '',
      effect: (policy.effect as 'allow' | 'deny') || 'allow',
      scope: (policy.scope as 'tenant' | 'project') || 'tenant',
      permission_codes: policy.permission_codes ?? [],
      is_active: policy.is_active !== false,
    })
    setError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingPolicy(null)
    setForm(emptyForm)
    setError(null)
    setFieldErrors({})
  }

  function togglePermissionCode(code: string) {
    setForm((prev) => ({
      ...prev,
      permission_codes: prev.permission_codes.includes(code)
        ? prev.permission_codes.filter((x) => x !== code)
        : [...prev.permission_codes, code],
    }))
  }

  async function onDelete(policy: Policy) {
    const ok = await confirm({
      title: 'Delete policy?',
      message: `Delete “${policy.name}”? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteMutation.mutate(policy.id)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const nextErrors: FieldErrors = {}
    if (!editingPolicy && !form.code.trim()) nextErrors.code = 'Enter a policy code.'
    if (!form.name.trim()) nextErrors.name = 'Enter a policy name.'
    if (!form.effect) nextErrors.effect = 'Select an effect.'
    if (!form.scope) nextErrors.scope = 'Select a scope.'
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      return
    }

    if (editingPolicy) updateMutation.mutate()
    else createMutation.mutate()
  }

  const pending = createMutation.isPending || updateMutation.isPending

  if (!canView) {
    return <p className="muted">You do not have permission to view policies.</p>
  }

  return (
    <div className="stack rbac-policies-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">RBAC</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Access control</span>
          </div>
          <h1 className="page-header-title">Access policies</h1>
          <p className="page-header-desc">
            Allow / deny rules layered on top of role permissions for fine-grained overrides.
          </p>
        </div>
        <div className="page-header-actions">
          {canManage && (
            <button type="button" className="button-link" onClick={openCreate}>
              Create policy
            </button>
          )}
          <Link className="ghost-link" to="/admin/rbac/roles">
            Roles
          </Link>
          <Link className="ghost-link" to="/admin/rbac/users">
            Users
          </Link>
        </div>
      </header>

      {error && !modalOpen && <div className="error">{error}</div>}

      <section className="tenant-stats rbac-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Total policies</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat tone-success">
          <span className="tenant-stat-label">Allow</span>
          <strong className="tenant-stat-value">{stats.allow}</strong>
        </div>
        <div className="tenant-stat tone-danger">
          <span className="tenant-stat-label">Deny</span>
          <strong className="tenant-stat-value">{stats.deny}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Active</span>
          <strong className="tenant-stat-value">{stats.active}</strong>
        </div>
      </section>

      <section className="panel rbac-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Policy list</h2>
            <p className="muted small">
              {filtered.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search policies</span>
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

            <div className="tenants-status-chips" role="tablist" aria-label="Filter by effect">
              {(
                [
                  { value: 'all' as const, label: 'All', count: stats.total },
                  { value: 'allow' as const, label: 'Allow', count: stats.allow },
                  { value: 'deny' as const, label: 'Deny', count: stats.deny },
                ]
              ).map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={effectFilter === f.value}
                  className={`tenants-chip${effectFilter === f.value ? ' active' : ''}`}
                  onClick={() => {
                    setEffectFilter(f.value)
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

        <div className="tenants-status-chips rbac-active-chips" role="tablist" aria-label="Filter by active state">
          {(
            [
              { value: 'all' as const, label: 'All states', count: stats.total },
              { value: 'active' as const, label: 'Active', count: stats.active },
              { value: 'inactive' as const, label: 'Inactive', count: stats.total - stats.active },
            ]
          ).map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={activeFilter === f.value}
              className={`tenants-chip${activeFilter === f.value ? ' active' : ''}`}
              onClick={() => {
                setActiveFilter(f.value)
                setPage(1)
              }}
            >
              {f.label}
              <span>{f.count}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading policies…</p>
        ) : filtered.length === 0 ? (
          <div className="tenants-empty">
            <h3>No policies found</h3>
            <p className="muted">
              {search || effectFilter !== 'all' || activeFilter !== 'all'
                ? 'Try clearing filters or adjusting your search.'
                : 'Create a policy to allow or deny specific permission overrides.'}
            </p>
            {!search && effectFilter === 'all' && activeFilter === 'all' && canManage && (
              <button type="button" className="button-link" onClick={openCreate}>
                Create policy
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table rbac-policies-table">
                <thead>
                  <tr>
                    <th>Policy</th>
                    <th>Effect</th>
                    <th>Scope</th>
                    <th>Permissions</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <div className="muted small">
                          <code className="rbac-code">{p.code}</code>
                          {p.is_system ? ' · system' : ''}
                        </div>
                        {p.description ? <div className="muted small">{p.description}</div> : null}
                      </td>
                      <td>
                        <span className={`badge ${p.effect === 'allow' ? 'rbac-effect-allow' : 'rbac-effect-deny'}`}>
                          {p.effect}
                        </span>
                      </td>
                      <td className="rbac-capitalize">{p.scope}</td>
                      <td>
                        <span className="rbac-count-pill">{p.permission_codes?.length ?? 0}</span>
                      </td>
                      <td>
                        <span className={`badge ${p.is_active === false ? 'status-cancelled' : 'status-active'}`}>
                          {p.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td>
                        {canManage && (
                          <div className="rbac-row-actions">
                            <button type="button" className="ghost" onClick={() => openEdit(p)}>
                              Edit
                            </button>
                            {!p.is_system && p.tenant_id != null && (
                              <button type="button" className="ghost danger" onClick={() => void onDelete(p)}>
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
            aria-labelledby="policy-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="policy-modal-title">{editingPolicy ? 'Update policy' : 'Create policy'}</h2>
                <p className="muted small">
                  {editingPolicy
                    ? 'Change the effect, scope, or permissions covered by this policy.'
                    : 'Add an allow or deny rule for this tenant.'}
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <div className="error">{error}</div>}

            <form className="rbac-modal-form" onSubmit={onSubmit}>
              <div className="modal-form-scroll form-grid rbac-form-grid">
              {!editingPolicy && (
                <FormField label="Code" required error={fieldErrors.code}>
                  <input
                    placeholder="e.g. deny_export_finance"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </FormField>
              )}
              <FormField label="Name" required error={fieldErrors.name}>
                <input
                  placeholder="e.g. Deny finance export"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FormField>
              <FormField label="Description" error={fieldErrors.description}>
                <input
                  placeholder="Optional summary of this policy"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </FormField>
              <FormField label="Effect" required error={fieldErrors.effect}>
                <select
                  value={form.effect}
                  onChange={(e) => setForm({ ...form, effect: e.target.value as 'allow' | 'deny' })}
                >
                  <option value="allow">Allow</option>
                  <option value="deny">Deny</option>
                </select>
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

              <FormField label="Permission codes" error={fieldErrors.permission_codes} className="span-2">
                {byModule.length > 0 ? (
                  <div className="rbac-permission-groups">
                    {byModule.map(([module, perms]) => (
                      <div key={module} className="rbac-permission-group">
                        <strong className="rbac-permission-group-title">{module}</strong>
                        <div className="rbac-permission-grid">
                          {perms.map((p) => (
                            <label key={p.id} className="checkbox rbac-permission-item">
                              <input
                                type="checkbox"
                                checked={form.permission_codes.includes(p.code)}
                                onChange={() => togglePermissionCode(p.code)}
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
                ) : (
                  <input
                    placeholder="comma-separated, e.g. projects.view, boq.manage"
                    value={form.permission_codes.join(', ')}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        permission_codes: e.target.value
                          .split(/[,\s]+/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )}
                {form.permission_codes.length === 0 && (
                  <p className="muted small register-hint">
                    No permission codes selected — this policy will not affect any access checks.
                  </p>
                )}
              </FormField>

              <label className="checkbox span-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Active
              </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeModal} disabled={pending}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={pending}>
                  {pending ? 'Saving…' : editingPolicy ? 'Update policy' : 'Create policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
