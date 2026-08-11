import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api/saasRbacApi'
import { useAuth } from '../auth/AuthContext'
import {
  FormField,
  Pagination,
  getErrorMessage,
  getFieldErrors,
  useConfirm,
  useSuccess,
  useToast,
  type FieldErrors,
} from '../../ui'

type RoleOption = { id: number; name: string; code: string }
type Membership = {
  id: number
  status: string
  is_owner?: boolean
  job_title?: string | null
  user?: { id: number; name: string; email: string }
  roleAssignments?: Array<{ role?: { id: number; name: string; code: string } }>
  role_assignments?: Array<{ role?: { id: number; name: string; code: string } }>
}

type StatusFilter = '' | 'active' | 'invited' | 'suspended'

const emptyInviteForm = {
  name: '',
  email: '',
  password: '',
  role_id: '',
}

function membershipRoles(m: Membership) {
  return m.roleAssignments ?? m.role_assignments ?? []
}

function initials(name?: string | null) {
  if (!name) return '?'
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function statusBadgeClass(status: string) {
  if (status === 'active') return 'status-active'
  if (status === 'invited') return 'status-trial'
  if (status === 'suspended') return 'status-cancelled'
  return ''
}

export function UsersPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()
  const toast = useToast()

  const canView = can('users.view') || can('users.manage')
  const canManage = can('users.manage')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [page, setPage] = useState(1)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState(emptyInviteForm)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteFieldErrors, setInviteFieldErrors] = useState<FieldErrors>({})
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  const [editMembership, setEditMembership] = useState<Membership | null>(null)
  const [editStatus, setEditStatus] = useState('active')
  const [editRoleIds, setEditRoleIds] = useState<number[]>([])
  const [editError, setEditError] = useState<string | null>(null)
  const [editFieldErrors, setEditFieldErrors] = useState<FieldErrors>({})

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['rbac-users', search, status, page],
    queryFn: () => api.listRbacUsers(search, page, status),
    enabled: canView,
    placeholderData: keepPreviousData,
  })

  const { data: allSummary } = useQuery({
    queryKey: ['rbac-users-summary', 'all'],
    queryFn: () => api.listRbacUsers('', 1, ''),
    enabled: canView,
  })
  const { data: activeSummary } = useQuery({
    queryKey: ['rbac-users-summary', 'active'],
    queryFn: () => api.listRbacUsers('', 1, 'active'),
    enabled: canView,
  })
  const { data: invitedSummary } = useQuery({
    queryKey: ['rbac-users-summary', 'invited'],
    queryFn: () => api.listRbacUsers('', 1, 'invited'),
    enabled: canView,
  })
  const { data: suspendedSummary } = useQuery({
    queryKey: ['rbac-users-summary', 'suspended'],
    queryFn: () => api.listRbacUsers('', 1, 'suspended'),
    enabled: canView,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: () => api.listRbacRoles(),
    enabled: canManage,
  })

  const roleOptions = roles as RoleOption[]
  const rows = (data?.data ?? []) as Membership[]

  const stats = useMemo(
    () => ({
      total: allSummary?.meta?.total ?? 0,
      active: activeSummary?.meta?.total ?? 0,
      invited: invitedSummary?.meta?.total ?? 0,
      suspended: suspendedSummary?.meta?.total ?? 0,
    }),
    [allSummary, activeSummary, invitedSummary, suspendedSummary],
  )

  async function refreshUsers() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['rbac-users'] }),
      qc.invalidateQueries({ queryKey: ['rbac-users-summary'] }),
    ])
  }

  const inviteMutation = useMutation({
    mutationFn: () =>
      api.inviteRbacUser({
        name: inviteForm.name,
        email: inviteForm.email,
        password: inviteForm.password || undefined,
        role_id: Number(inviteForm.role_id),
      }),
    onSuccess: async (res: any) => {
      setInviteForm(emptyInviteForm)
      setInviteError(null)
      setInviteFieldErrors({})
      setGeneratedPassword(res?.generated_password ?? null)
      setInviteOpen(false)
      await refreshUsers()
      success({ title: 'User invited', message: 'Membership created for this workspace.' })
    },
    onError: (err: unknown) => {
      setInviteFieldErrors(getFieldErrors(err))
      setInviteError(getErrorMessage(err, 'Failed to invite user'))
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: string }) => api.updateRbacUser(id, { status: next }),
    onSuccess: async (_res, vars) => {
      await refreshUsers()
      success({ title: 'User updated', message: `Status set to ${vars.next}.` })
    },
    onError: (err: unknown) => toast(getErrorMessage(err, 'Failed to update user'), 'error'),
  })

  const editMutation = useMutation({
    mutationFn: () =>
      api.updateRbacUser(editMembership!.id, {
        status: editStatus,
        role_ids: editRoleIds,
      }),
    onSuccess: async () => {
      setEditMembership(null)
      setEditError(null)
      setEditFieldErrors({})
      await refreshUsers()
      success({ title: 'Membership updated', message: 'Status and roles saved.' })
    },
    onError: (err: unknown) => {
      setEditFieldErrors(getFieldErrors(err))
      setEditError(getErrorMessage(err, 'Failed to update membership'))
    },
  })

  function openInvite() {
    setInviteForm(emptyInviteForm)
    setInviteError(null)
    setInviteFieldErrors({})
    setGeneratedPassword(null)
    setInviteOpen(true)
  }

  function closeInvite() {
    setInviteOpen(false)
    setInviteForm(emptyInviteForm)
    setInviteError(null)
    setInviteFieldErrors({})
  }

  function openEdit(m: Membership) {
    setEditMembership(m)
    setEditStatus(m.status)
    setEditRoleIds(membershipRoles(m).map((ra) => ra.role?.id).filter((id): id is number => id != null))
    setEditError(null)
    setEditFieldErrors({})
  }

  function closeEdit() {
    setEditMembership(null)
    setEditError(null)
    setEditFieldErrors({})
  }

  function toggleEditRole(id: number) {
    setEditRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function onInviteSubmit(e: FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteFieldErrors({})

    const nextErrors: FieldErrors = {}
    if (!inviteForm.name.trim()) nextErrors.name = 'Enter a name.'
    if (!inviteForm.email.trim()) nextErrors.email = 'Enter an email address.'
    if (!inviteForm.role_id) nextErrors.role_id = 'Select a role for this member.'
    if (Object.keys(nextErrors).length) {
      setInviteFieldErrors(nextErrors)
      return
    }

    inviteMutation.mutate()
  }

  function onEditSubmit(e: FormEvent) {
    e.preventDefault()
    setEditError(null)
    setEditFieldErrors({})
    editMutation.mutate()
  }

  async function onActivate(m: Membership) {
    const ok = await confirm({
      title: 'Activate user?',
      message: `Activate ${m.user?.name ?? 'this member'}? They will regain access to the tenant workspace.`,
      confirmLabel: 'Activate',
    })
    if (ok) statusMutation.mutate({ id: m.id, next: 'active' })
  }

  async function onSuspend(m: Membership) {
    const ok = await confirm({
      title: 'Suspend user?',
      message: `Suspend ${m.user?.name ?? 'this member'}? They will immediately lose access to the tenant workspace.`,
      confirmLabel: 'Suspend',
      danger: true,
    })
    if (ok) statusMutation.mutate({ id: m.id, next: 'suspended' })
  }

  async function copyPassword() {
    if (!generatedPassword) return
    try {
      await navigator.clipboard.writeText(generatedPassword)
      toast('Password copied to clipboard', 'success')
    } catch {
      toast('Could not copy to clipboard', 'error')
    }
  }

  if (!canView) {
    return <p className="muted">You do not have permission to manage users.</p>
  }

  return (
    <div className="stack rbac-users-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">RBAC</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Access control</span>
          </div>
          <h1 className="page-header-title">Users</h1>
          <p className="page-header-desc">
            Invite members to this workspace, assign roles, and manage membership status.
          </p>
        </div>
        <div className="page-header-actions">
          {canManage && (
            <button type="button" className="button-link" onClick={openInvite}>
              Invite user
            </button>
          )}
          <Link className="ghost-link" to="/admin/rbac/roles">
            Roles
          </Link>
          <Link className="ghost-link" to="/admin/rbac/policies">
            Policies
          </Link>
        </div>
      </header>

      {generatedPassword && (
        <div className="panel rbac-generated-password">
          <div>
            <h3>Generated password</h3>
            <p className="muted small">Share this securely with the new member — it will not be shown again.</p>
          </div>
          <div className="rbac-generated-password-value">
            <code>{generatedPassword}</code>
            <button type="button" className="ghost" onClick={() => void copyPassword()}>
              Copy
            </button>
            <button type="button" className="ghost" onClick={() => setGeneratedPassword(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <section className="tenant-stats rbac-stats">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Total members</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat tone-success">
          <span className="tenant-stat-label">Active</span>
          <strong className="tenant-stat-value">{stats.active}</strong>
        </div>
        <div className="tenant-stat tone-warn">
          <span className="tenant-stat-label">Invited</span>
          <strong className="tenant-stat-value">{stats.invited}</strong>
        </div>
        <div className="tenant-stat tone-danger">
          <span className="tenant-stat-label">Suspended</span>
          <strong className="tenant-stat-value">{stats.suspended}</strong>
        </div>
      </section>

      <section className="panel rbac-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Members</h2>
            <p className="muted small">
              {data?.meta?.total ?? rows.length} matching
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search users</span>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>

            <div className="tenants-status-chips" role="tablist" aria-label="Filter by status">
              {(
                [
                  { value: '' as const, label: 'All', count: stats.total },
                  { value: 'active' as const, label: 'Active', count: stats.active },
                  { value: 'invited' as const, label: 'Invited', count: stats.invited },
                  { value: 'suspended' as const, label: 'Suspended', count: stats.suspended },
                ]
              ).map((f) => (
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
          </div>
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading members…</p>
        ) : rows.length === 0 ? (
          <div className="tenants-empty">
            <h3>No members found</h3>
            <p className="muted">
              {search || status
                ? 'Try clearing filters or adjusting your search.'
                : 'Invite a member to give them access to this workspace.'}
            </p>
            {!search && !status && canManage && (
              <button type="button" className="button-link" onClick={openInvite}>
                Invite user
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table rbac-users-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Roles</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => {
                    const assignments = membershipRoles(m)
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="rbac-user-cell">
                            <span className="rbac-user-avatar" aria-hidden>
                              {initials(m.user?.name)}
                            </span>
                            <div>
                              <strong>{m.user?.name ?? '—'}</strong>
                              <div className="muted small">{m.user?.email}</div>
                              {m.is_owner && <span className="badge rbac-badge-owner">Owner</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          {assignments.length > 0 ? (
                            <div className="rbac-role-chips">
                              {assignments.map((ra, idx) => (
                                <span key={ra.role?.id ?? idx} className="badge rbac-role-chip">
                                  {ra.role?.name ?? '—'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="muted small">No roles</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${statusBadgeClass(m.status)}`}>{m.status}</span>
                        </td>
                        <td>
                          {canManage && !m.is_owner && (
                            <div className="rbac-row-actions">
                              <button type="button" className="ghost" onClick={() => openEdit(m)}>
                                Edit
                              </button>
                              {m.status !== 'active' && (
                                <button
                                  type="button"
                                  className="ghost"
                                  disabled={statusMutation.isPending}
                                  onClick={() => void onActivate(m)}
                                >
                                  Activate
                                </button>
                              )}
                              {m.status !== 'suspended' && (
                                <button
                                  type="button"
                                  className="ghost danger"
                                  disabled={statusMutation.isPending}
                                  onClick={() => void onSuspend(m)}
                                >
                                  Suspend
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination meta={data?.meta} page={page} onPageChange={setPage} />
          </>
        )}
      </section>

      {inviteOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeInvite}>
          <div
            className="modal-card rbac-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="invite-modal-title">Invite user</h2>
                <p className="muted small">Add a new member and assign their initial role.</p>
              </div>
              <button type="button" className="ghost" onClick={closeInvite} aria-label="Close">
                ✕
              </button>
            </div>

            {inviteError && <div className="error">{inviteError}</div>}

            <form className="rbac-modal-form" onSubmit={onInviteSubmit}>
              <div className="modal-form-scroll form-grid rbac-form-grid">
              <FormField label="Name" required error={inviteFieldErrors.name}>
                <input
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                />
              </FormField>
              <FormField label="Email" required error={inviteFieldErrors.email}>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
              </FormField>
              <FormField label="Password" error={inviteFieldErrors.password}>
                <input
                  type="password"
                  minLength={8}
                  placeholder="Optional — auto-generated if blank"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                />
              </FormField>
              <FormField label="Role" required error={inviteFieldErrors.role_id}>
                <select
                  value={inviteForm.role_id}
                  onChange={(e) => setInviteForm({ ...inviteForm, role_id: e.target.value })}
                >
                  <option value="">Select a role…</option>
                  {roleOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </FormField>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeInvite} disabled={inviteMutation.isPending}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? 'Inviting…' : 'Invite user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editMembership && (
        <div className="modal-backdrop" role="presentation" onClick={closeEdit}>
          <div
            className="modal-card rbac-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-membership-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="edit-membership-title">Edit membership</h2>
                <p className="muted small">
                  {editMembership.user?.name ?? 'Member'} · {editMembership.user?.email}
                </p>
              </div>
              <button type="button" className="ghost" onClick={closeEdit} aria-label="Close">
                ✕
              </button>
            </div>

            {editError && <div className="error">{editError}</div>}

            <form className="rbac-modal-form" onSubmit={onEditSubmit}>
              <div className="modal-form-scroll form-grid">
              <FormField label="Status" required error={editFieldErrors.status}>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="invited">Invited</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="left">Left</option>
                </select>
              </FormField>

              <FormField label="Roles" error={editFieldErrors.role_ids}>
                <div className="rbac-role-checklist">
                  {roleOptions.length === 0 && <p className="muted small">No roles available.</p>}
                  {roleOptions.map((r) => (
                    <label key={r.id} className="checkbox rbac-permission-item">
                      <input
                        type="checkbox"
                        checked={editRoleIds.includes(r.id)}
                        onChange={() => toggleEditRole(r.id)}
                      />
                      <span>
                        {r.name} <span className="muted small rbac-permission-code">({r.code})</span>
                      </span>
                    </label>
                  ))}
                </div>
                {editRoleIds.length === 0 && (
                  <p className="muted small register-hint">
                    No roles selected — this member will lose all role-based permissions.
                  </p>
                )}
              </FormField>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeEdit} disabled={editMutation.isPending}>
                  Cancel
                </button>
                <button type="submit" className="button-link" disabled={editMutation.isPending}>
                  {editMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
