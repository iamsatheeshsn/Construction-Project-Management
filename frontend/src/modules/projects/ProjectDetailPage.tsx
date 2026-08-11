import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import * as api from '../../services/api/modulesApi'
import type { WbsNode } from '../../services/api/modulesApi'
import { useAuth } from '../auth/AuthContext'
import {
  FormField,
  getErrorMessage,
  getFieldErrors,
  requireFields,
  useConfirm,
  useSuccess,
  type FieldErrors,
} from '../../ui'
import { GanttChart } from './GanttChart'
import { BoqPanel } from '../commercial/BoqPanel'
import { ContractsPanel } from '../commercial/ContractsPanel'
import { VariationsPanel } from '../commercial/VariationsPanel'
import { SiteDiaryPanel } from '../site/SiteDiaryPanel'
import { DocumentsPanel } from '../documents/DocumentsPanel'
import { RfiPanel } from '../workflow/RfiPanel'
import { SubmittalsPanel } from '../workflow/SubmittalsPanel'
import { BillingPanel } from '../billing/BillingPanel'
import { ProcurementPanel } from '../ops/ProcurementPanel'
import { InventoryPanel } from '../ops/InventoryPanel'
import { EquipmentPanel } from '../ops/EquipmentPanel'
import { SubcontractorsPanel } from '../ops/SubcontractorsPanel'

type Tab =
  | 'overview'
  | 'wbs'
  | 'tasks'
  | 'gantt'
  | 'boq'
  | 'contracts'
  | 'diary'
  | 'documents'
  | 'rfis'
  | 'submittals'
  | 'variations'
  | 'billing'
  | 'procurement'
  | 'inventory'
  | 'equipment'
  | 'subcontractors'

type TabGroup = {
  id: string
  label: string
  tabs: { key: Tab; label: string }[]
}

const TAB_GROUPS: TabGroup[] = [
  {
    id: 'planning',
    label: 'Planning',
    tabs: [
      { key: 'overview', label: 'Overview' },
      { key: 'wbs', label: 'WBS' },
      { key: 'tasks', label: 'Tasks' },
      { key: 'gantt', label: 'Gantt' },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    tabs: [
      { key: 'boq', label: 'BOQ' },
      { key: 'contracts', label: 'Contracts' },
      { key: 'variations', label: 'Variations' },
      { key: 'billing', label: 'Billing' },
    ],
  },
  {
    id: 'site',
    label: 'Site & docs',
    tabs: [
      { key: 'diary', label: 'Site diary' },
      { key: 'documents', label: 'Documents' },
      { key: 'rfis', label: 'RFIs' },
      { key: 'submittals', label: 'Submittals' },
    ],
  },
  {
    id: 'ops',
    label: 'Operations',
    tabs: [
      { key: 'procurement', label: 'Procurement' },
      { key: 'inventory', label: 'Inventory' },
      { key: 'equipment', label: 'Equipment' },
      { key: 'subcontractors', label: 'Subcontractors' },
    ],
  },
]

const ALL_TABS = TAB_GROUPS.flatMap((g) => g.tabs.map((t) => t.key))

function isTab(value: string | null): value is Tab {
  return !!value && (ALL_TABS as string[]).includes(value)
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

function taskStatusTone(status: string) {
  switch (status) {
    case 'in_progress':
      return 'tone-progress'
    case 'completed':
      return 'tone-success'
    case 'on_hold':
      return 'tone-warn'
    case 'cancelled':
      return 'tone-neutral'
    default:
      return 'tone-info'
  }
}

function formatMoney(value: string | number | undefined | null, currency = 'AED') {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num) || num === 0) return '—'
  return `${currency} ${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function progressPct(value?: string | number | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
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

function flattenWbs(nodes: WbsNode[], acc: WbsNode[] = []): WbsNode[] {
  for (const n of nodes) {
    acc.push(n)
    if (n.children?.length) flattenWbs(n.children, acc)
  }
  return acc
}

function WbsTree({
  nodes,
  depth = 0,
  onDelete,
  canManage,
}: {
  nodes: WbsNode[]
  depth?: number
  onDelete: (id: number) => void
  canManage: boolean
}) {
  return (
    <ul className={`pd-wbs-tree${depth === 0 ? ' is-root' : ''}`}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="pd-wbs-row" style={{ paddingLeft: depth * 14 }}>
            <div className="pd-wbs-main">
              <code>{node.code}</code>
              <div>
                <strong>{node.name}</strong>
                <div className="muted small">Level {node.level}</div>
              </div>
            </div>
            <div className="pd-wbs-side">
              <span className="muted small">{progressPct(node.progress_percent)}%</span>
              {canManage && (
                <button type="button" className="ghost danger" onClick={() => onDelete(node.id)}>
                  Delete
                </button>
              )}
            </div>
          </div>
          {node.children && node.children.length > 0 && (
            <WbsTree nodes={node.children} depth={depth + 1} onDelete={onDelete} canManage={canManage} />
          )}
        </li>
      ))}
    </ul>
  )
}

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabFromUrl = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(isTab(tabFromUrl) ? tabFromUrl : 'overview')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const [wbsForm, setWbsForm] = useState({ code: '', name: '', parent_id: '', description: '' })
  const [taskForm, setTaskForm] = useState({
    task_code: '',
    name: '',
    wbs_id: '',
    status: 'not_started',
    priority: 'medium',
    planned_start_date: '',
    planned_end_date: '',
    progress_percent: '0',
    predecessor_task_id: '',
    dependency_type: 'FS',
  })

  useEffect(() => {
    if (isTab(tabFromUrl)) setTab(tabFromUrl)
    else if (!tabFromUrl) setTab('overview')
  }, [tabFromUrl])

  function selectTab(next: Tab) {
    setTab(next)
    setError(null)
    setFieldErrors({})
    const params = new URLSearchParams(searchParams)
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const activeGroup =
    TAB_GROUPS.find((g) => g.tabs.some((t) => t.key === tab)) ?? TAB_GROUPS[0]

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.getProject(id),
    enabled: Number.isFinite(id),
  })

  const { data: wbs = [], isLoading: wbsLoading } = useQuery({
    queryKey: ['wbs', id],
    queryFn: () => api.listWbs(id),
    enabled: Number.isFinite(id) && can('wbs.view'),
  })

  const { data: tasksPage, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api.listTasks(id),
    enabled: Number.isFinite(id) && can('tasks.view'),
  })

  const { data: gantt, isLoading: ganttLoading } = useQuery({
    queryKey: ['gantt', id],
    queryFn: () => api.getGantt(id),
    enabled: Number.isFinite(id) && can('tasks.view') && tab === 'gantt',
  })

  const tasks = tasksPage?.data ?? []
  const wbsOptions = useMemo(() => flattenWbs(wbs), [wbs])
  const avgTaskProgress = useMemo(() => {
    if (!tasks.length) return progressPct(project?.progress_percent)
    const sum = tasks.reduce((acc, t) => acc + Number(t.progress_percent ?? 0), 0)
    return Math.round(sum / tasks.length)
  }, [tasks, project?.progress_percent])

  const invalidatePlanning = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['wbs', id] }),
      qc.invalidateQueries({ queryKey: ['tasks', id] }),
      qc.invalidateQueries({ queryKey: ['gantt', id] }),
      qc.invalidateQueries({ queryKey: ['project', id] }),
      qc.invalidateQueries({ queryKey: ['projects'] }),
    ])
  }

  const createWbsMutation = useMutation({
    mutationFn: () =>
      api.createWbs(id, {
        code: wbsForm.code.trim(),
        name: wbsForm.name.trim(),
        description: wbsForm.description.trim() || null,
        parent_id: wbsForm.parent_id ? Number(wbsForm.parent_id) : null,
      }),
    onSuccess: async () => {
      setWbsForm({ code: '', name: '', parent_id: '', description: '' })
      setError(null)
      setFieldErrors({})
      await invalidatePlanning()
      success({ title: 'WBS node created', message: 'The work breakdown node was added.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create WBS node'))
    },
  })

  const deleteWbsMutation = useMutation({
    mutationFn: (wbsId: number) => api.deleteWbs(id, wbsId),
    onSuccess: async () => {
      await invalidatePlanning()
      success({ title: 'WBS deleted', message: 'The work breakdown node was removed.' })
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to delete WBS node')),
  })

  async function onDeleteWbs(wbsId: number) {
    const ok = await confirm({
      title: 'Delete WBS node?',
      message: 'Delete this WBS node? Child nodes and linked tasks may be affected.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteWbsMutation.mutate(wbsId)
  }

  const createTaskMutation = useMutation({
    mutationFn: () =>
      api.createTask(id, {
        task_code: taskForm.task_code.trim() || null,
        name: taskForm.name.trim(),
        wbs_id: taskForm.wbs_id ? Number(taskForm.wbs_id) : null,
        status: taskForm.status,
        priority: taskForm.priority,
        planned_start_date: taskForm.planned_start_date || null,
        planned_end_date: taskForm.planned_end_date || null,
        progress_percent: Number(taskForm.progress_percent || 0),
        predecessor_task_id: taskForm.predecessor_task_id ? Number(taskForm.predecessor_task_id) : null,
        dependency_type: taskForm.dependency_type,
      }),
    onSuccess: async () => {
      setTaskForm({
        task_code: '',
        name: '',
        wbs_id: '',
        status: 'not_started',
        priority: 'medium',
        planned_start_date: '',
        planned_end_date: '',
        progress_percent: '0',
        predecessor_task_id: '',
        dependency_type: 'FS',
      })
      setError(null)
      setFieldErrors({})
      await invalidatePlanning()
      success({ title: 'Task created', message: 'The schedule task was added.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create task'))
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => api.deleteTask(id, taskId),
    onSuccess: async () => {
      await invalidatePlanning()
      success({ title: 'Task deleted', message: 'The schedule task was removed.' })
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to delete task')),
  })

  async function onDeleteTask(taskId: number, name: string) {
    const ok = await confirm({
      title: 'Delete task?',
      message: `Delete “${name}”? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteTaskMutation.mutate(taskId)
  }

  if (isLoading) {
    return (
      <div className="stack pd-page">
        <div className="panel empty-state">
          <h3>Loading project…</h3>
          <p className="muted">Fetching workspace details.</p>
        </div>
      </div>
    )
  }

  if (isError || !project) {
    return (
      <div className="stack pd-page">
        <div className="panel empty-state">
          <h3>Project not found</h3>
          <p className="muted">This project may belong to another workspace, or the link is invalid.</p>
          <Link to="/admin/organization/projects" className="button-link">
            Back to projects
          </Link>
        </div>
      </div>
    )
  }

  const currency = project.currency || 'AED'
  const storedProgress = progressPct(project.progress_percent)
  const progress = storedProgress > 0 ? storedProgress : avgTaskProgress

  return (
    <div className="stack pd-page">
      <header className="page-header pd-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <Link to="/admin/organization/projects" className="page-chip ghost-link">
              ← Projects
            </Link>
            <span className="page-chip">{project.project_code}</span>
            <span className={`status-pill ${statusTone(project.status)}`}>{statusLabel(project.status)}</span>
          </div>
          <div className="pd-title-row">
            <div className="pd-avatar" aria-hidden>
              {initials(project.name)}
            </div>
            <div>
              <h1 className="page-header-title">{project.name}</h1>
              <p className="page-header-desc">
                {[project.client?.name, project.company?.name, project.location, currency].filter(Boolean).join(' · ') ||
                  'Project workspace for planning, commercial, and site delivery.'}
              </p>
            </div>
          </div>
        </div>
        <div className="page-header-actions">
          <button type="button" className="ghost" onClick={() => selectTab('tasks')}>
            Tasks
          </button>
          <button type="button" className="primary" onClick={() => selectTab('wbs')}>
            Open WBS
          </button>
        </div>
      </header>

      <div className="tenant-stats pd-stats">
        <div className="tenant-stat">
          <div className="tenant-stat-label">Progress</div>
          <div className="tenant-stat-value">{progress}%</div>
          <div className="tenant-stat-hint">Overall completion</div>
        </div>
        <div className="tenant-stat">
          <div className="tenant-stat-label">Budget</div>
          <div className="tenant-stat-value projects-stat-money">{formatMoney(project.budget_amount, currency)}</div>
          <div className="tenant-stat-hint">Approved budget</div>
        </div>
        <div className="tenant-stat">
          <div className="tenant-stat-label">Contract</div>
          <div className="tenant-stat-value projects-stat-money">{formatMoney(project.contract_value, currency)}</div>
          <div className="tenant-stat-hint">Contract value</div>
        </div>
        <div className="tenant-stat">
          <div className="tenant-stat-label">WBS / Tasks</div>
          <div className="tenant-stat-value">
            {project.wbs_count ?? wbsOptions.length} / {tasks.length}
          </div>
          <div className="tenant-stat-hint">{project.members_count ?? 0} members</div>
        </div>
      </div>

      <nav className="pd-nav" aria-label="Project modules">
        <div className="pd-nav-groups" role="tablist" aria-label="Module groups">
          {TAB_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              className={activeGroup.id === group.id ? 'pd-group active' : 'pd-group'}
              onClick={() => {
                const first = group.tabs[0]
                if (first) selectTab(first.key)
              }}
            >
              {group.label}
            </button>
          ))}
        </div>
        <div className="pd-nav-tabs" role="tablist" aria-label={activeGroup.label}>
          {activeGroup.tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? 'tab active' : 'tab'}
              onClick={() => selectTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {error && <div className="error">{error}</div>}

      {tab === 'overview' && (
        <div className="pd-overview">
          <section className="panel pd-overview-main">
            <div className="panel-head">
              <div>
                <h2>Project summary</h2>
                <p className="muted small">Scope, schedule, and commercial snapshot for this workspace.</p>
              </div>
              <span className={`status-pill ${statusTone(project.status)}`}>{statusLabel(project.status)}</span>
            </div>

            {project.description ? (
              <p className="pd-description">{project.description}</p>
            ) : (
              <p className="muted">No description yet. Add planning notes from project settings when ready.</p>
            )}

            <div className="pd-progress">
              <div className="pd-progress-head">
                <span>Overall progress</span>
                <strong>{progress}%</strong>
              </div>
              <div className="pd-progress-track" aria-hidden>
                <div className="pd-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <dl className="pd-meta-grid">
              <div>
                <dt>Client</dt>
                <dd>{project.client?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Company</dt>
                <dd>{project.company?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{project.location ?? '—'}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>{currency}</dd>
              </div>
              <div>
                <dt>Start</dt>
                <dd>{formatDate(project.start_date)}</dd>
              </div>
              <div>
                <dt>End</dt>
                <dd>{formatDate(project.end_date)}</dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>{formatMoney(project.budget_amount, currency)}</dd>
              </div>
              <div>
                <dt>Contract value</dt>
                <dd>{formatMoney(project.contract_value, currency)}</dd>
              </div>
            </dl>
          </section>

          <aside className="pd-overview-side">
            <section className="panel">
              <h3>Quick links</h3>
              <div className="pd-quick-links">
                <button type="button" className="ghost" onClick={() => selectTab('wbs')}>
                  Work breakdown
                </button>
                <button type="button" className="ghost" onClick={() => selectTab('tasks')}>
                  Schedule tasks
                </button>
                <button type="button" className="ghost" onClick={() => selectTab('gantt')}>
                  Gantt chart
                </button>
                <button type="button" className="ghost" onClick={() => selectTab('boq')}>
                  Bill of quantities
                </button>
                <button type="button" className="ghost" onClick={() => selectTab('diary')}>
                  Site diary
                </button>
                <button type="button" className="ghost" onClick={() => selectTab('procurement')}>
                  Procurement
                </button>
              </div>
            </section>

            <section className="panel">
              <h3>Delivery pulse</h3>
              <ul className="pd-pulse">
                <li>
                  <span>WBS nodes</span>
                  <strong>{project.wbs_count ?? wbsOptions.length}</strong>
                </li>
                <li>
                  <span>Tasks</span>
                  <strong>{tasks.length}</strong>
                </li>
                <li>
                  <span>Members</span>
                  <strong>{project.members_count ?? 0}</strong>
                </li>
                <li>
                  <span>Avg. task progress</span>
                  <strong>{avgTaskProgress}%</strong>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      )}

      {tab === 'wbs' && (
        <div className="pd-split">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Work breakdown structure</h2>
                <p className="muted small">Structure scope into packages for planning and cost control.</p>
              </div>
              <span className="muted small">{wbsOptions.length} nodes</span>
            </div>
            {wbsLoading ? (
              <p className="muted">Loading WBS…</p>
            ) : wbs.length === 0 ? (
              <div className="empty-state compact">
                <h3>No WBS nodes yet</h3>
                <p className="muted">Create a root package to start breaking down the project.</p>
              </div>
            ) : (
              <WbsTree nodes={wbs} onDelete={onDeleteWbs} canManage={can('wbs.manage')} />
            )}
          </section>

          {can('wbs.manage') && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Add WBS node</h2>
                  <p className="muted small">Codes should stay unique within this project.</p>
                </div>
              </div>
              <form
                className="form-grid pd-form"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  setError(null)
                  const errs = requireFields(wbsForm, {
                    code: 'Code is required.',
                    name: 'Name is required.',
                  })
                  if (Object.keys(errs).length > 0) {
                    setFieldErrors(errs)
                    return
                  }
                  setFieldErrors({})
                  createWbsMutation.mutate()
                }}
              >
                <FormField label="Code" required error={fieldErrors.code}>
                  <input
                    placeholder="e.g. 1.0"
                    value={wbsForm.code}
                    onChange={(e) => {
                      setWbsForm({ ...wbsForm, code: e.target.value })
                      setFieldErrors((prev) => {
                        const n = { ...prev }
                        delete n.code
                        return n
                      })
                    }}
                  />
                </FormField>
                <FormField label="Name" required error={fieldErrors.name}>
                  <input
                    placeholder="Package name"
                    value={wbsForm.name}
                    onChange={(e) => {
                      setWbsForm({ ...wbsForm, name: e.target.value })
                      setFieldErrors((prev) => {
                        const n = { ...prev }
                        delete n.name
                        return n
                      })
                    }}
                  />
                </FormField>
                <FormField label="Parent" className="full">
                  <select value={wbsForm.parent_id} onChange={(e) => setWbsForm({ ...wbsForm, parent_id: e.target.value })}>
                    <option value="">Root level</option>
                    {wbsOptions.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.code} — {n.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Description" className="full">
                  <textarea
                    rows={3}
                    placeholder="Optional scope notes"
                    value={wbsForm.description}
                    onChange={(e) => setWbsForm({ ...wbsForm, description: e.target.value })}
                  />
                </FormField>
                <div className="modal-actions full">
                  <button type="submit" className="primary" disabled={createWbsMutation.isPending}>
                    {createWbsMutation.isPending ? 'Adding…' : 'Add node'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="pd-split">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Schedule tasks</h2>
                <p className="muted small">Activities with dates feed the Gantt chart.</p>
              </div>
              <span className="muted small">{tasks.length} tasks</span>
            </div>
            {tasksLoading ? (
              <p className="muted">Loading tasks…</p>
            ) : tasks.length === 0 ? (
              <div className="empty-state compact">
                <h3>No tasks yet</h3>
                <p className="muted">Create schedule activities with planned dates for Gantt.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>WBS</th>
                      <th>Dates</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <code>{t.task_code ?? '—'}</code>
                        </td>
                        <td>
                          <strong>{t.name}</strong>
                          {t.predecessors && t.predecessors.length > 0 && (
                            <div className="muted small">
                              Depends on:{' '}
                              {t.predecessors
                                .map((p) => `${p.dependency_type}#${p.predecessor_task_id}`)
                                .join(', ')}
                            </div>
                          )}
                        </td>
                        <td>{t.wbs ? t.wbs.code : '—'}</td>
                        <td className="small">
                          {formatDate(t.planned_start_date)} → {formatDate(t.planned_end_date)}
                        </td>
                        <td>
                          <div className="pd-mini-progress">
                            <div className="pd-mini-track">
                              <div className="pd-mini-fill" style={{ width: `${progressPct(t.progress_percent)}%` }} />
                            </div>
                            <span>{progressPct(t.progress_percent)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${taskStatusTone(t.status)}`}>
                            {statusLabel(t.status)}
                          </span>
                        </td>
                        <td>
                          {can('tasks.manage') && (
                            <button type="button" className="ghost danger" onClick={() => onDeleteTask(t.id, t.name)}>
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {can('tasks.manage') && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Add task</h2>
                  <p className="muted small">Link to WBS and set planned dates when known.</p>
                </div>
              </div>
              <form
                className="form-grid pd-form"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  setError(null)
                  const errs = requireFields(taskForm, {
                    name: 'Task name is required.',
                  })
                  if (
                    taskForm.planned_start_date &&
                    taskForm.planned_end_date &&
                    taskForm.planned_end_date < taskForm.planned_start_date
                  ) {
                    errs.planned_end_date = 'End date must be on or after the start date.'
                  }
                  if (Object.keys(errs).length > 0) {
                    setFieldErrors(errs)
                    return
                  }
                  setFieldErrors({})
                  createTaskMutation.mutate()
                }}
              >
                <FormField label="Code">
                  <input
                    placeholder="e.g. T-001"
                    value={taskForm.task_code}
                    onChange={(e) => setTaskForm({ ...taskForm, task_code: e.target.value })}
                  />
                </FormField>
                <FormField label="Name" required error={fieldErrors.name}>
                  <input
                    placeholder="Activity name"
                    value={taskForm.name}
                    onChange={(e) => {
                      setTaskForm({ ...taskForm, name: e.target.value })
                      setFieldErrors((prev) => {
                        const n = { ...prev }
                        delete n.name
                        return n
                      })
                    }}
                  />
                </FormField>
                <FormField label="WBS" className="full">
                  <select value={taskForm.wbs_id} onChange={(e) => setTaskForm({ ...taskForm, wbs_id: e.target.value })}>
                    <option value="">None</option>
                    {wbsOptions.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.code} — {n.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Start">
                  <input
                    type="date"
                    value={taskForm.planned_start_date}
                    onChange={(e) => {
                      setTaskForm({ ...taskForm, planned_start_date: e.target.value })
                      setFieldErrors((prev) => {
                        const n = { ...prev }
                        delete n.planned_end_date
                        return n
                      })
                    }}
                  />
                </FormField>
                <FormField label="End" error={fieldErrors.planned_end_date}>
                  <input
                    type="date"
                    value={taskForm.planned_end_date}
                    onChange={(e) => {
                      setTaskForm({ ...taskForm, planned_end_date: e.target.value })
                      setFieldErrors((prev) => {
                        const n = { ...prev }
                        delete n.planned_end_date
                        return n
                      })
                    }}
                  />
                </FormField>
                <FormField label="Progress %">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={taskForm.progress_percent}
                    onChange={(e) => setTaskForm({ ...taskForm, progress_percent: e.target.value })}
                  />
                </FormField>
                <FormField label="Status">
                  <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </FormField>
                <FormField label="Priority">
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </FormField>
                <FormField label="Predecessor">
                  <select
                    value={taskForm.predecessor_task_id}
                    onChange={(e) => setTaskForm({ ...taskForm, predecessor_task_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {(t.task_code ? `${t.task_code} · ` : '') + t.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Dependency">
                  <select
                    value={taskForm.dependency_type}
                    onChange={(e) => setTaskForm({ ...taskForm, dependency_type: e.target.value })}
                  >
                    <option value="FS">FS — Finish to Start</option>
                    <option value="SS">SS — Start to Start</option>
                    <option value="FF">FF — Finish to Finish</option>
                    <option value="SF">SF — Start to Finish</option>
                  </select>
                </FormField>
                <div className="modal-actions full">
                  <button type="submit" className="primary" disabled={createTaskMutation.isPending}>
                    {createTaskMutation.isPending ? 'Creating…' : 'Create task'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      )}

      {tab === 'gantt' && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Gantt chart</h2>
              <p className="muted small">Visual schedule from tasks with planned start and end dates.</p>
            </div>
          </div>
          <GanttChart data={gantt} loading={ganttLoading} />
        </section>
      )}

      {tab === 'boq' && <BoqPanel projectId={id} wbs={wbs} />}
      {tab === 'contracts' && <ContractsPanel projectId={id} />}
      {tab === 'diary' && <SiteDiaryPanel projectId={id} />}
      {tab === 'documents' && <DocumentsPanel projectId={id} />}
      {tab === 'rfis' && <RfiPanel projectId={id} />}
      {tab === 'submittals' && <SubmittalsPanel projectId={id} />}
      {tab === 'variations' && <VariationsPanel projectId={id} />}
      {tab === 'billing' && <BillingPanel projectId={id} />}
      {tab === 'procurement' && <ProcurementPanel projectId={id} />}
      {tab === 'inventory' && <InventoryPanel projectId={id} />}
      {tab === 'equipment' && <EquipmentPanel projectId={id} />}
      {tab === 'subcontractors' && <SubcontractorsPanel projectId={id} />}
    </div>
  )
}
