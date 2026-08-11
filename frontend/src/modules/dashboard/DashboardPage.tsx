import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../auth/AuthContext'
import * as auditApi from '../../services/api/auditApi'
import * as modulesApi from '../../services/api/modulesApi'
import * as saasApi from '../../services/api/saasRbacApi'

const STATUS_COLORS: Record<string, string> = {
  setup: '#64748b',
  planning: '#1F4E79',
  execution: '#C47A11',
  on_hold: '#b45309',
  completed: '#0f766e',
  closed: '#334155',
}

const TENANT_STATUS_COLORS: Record<string, string> = {
  trial: '#C47A11',
  active: '#0f766e',
  suspended: '#be123c',
  cancelled: '#64748b',
  expired: '#b45309',
}

const CHART_PALETTE = ['#1F4E79', '#C47A11', '#0f766e', '#64748b', '#7c3aed', '#be123c']

function formatLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function KpiCard({
  label,
  value,
  hint,
  to,
  tone = 'default',
}: {
  label: string
  value: string | number
  hint?: string
  to?: string
  tone?: 'default' | 'accent' | 'success' | 'warn'
}) {
  const body = (
    <>
      <span className="dash-kpi-label">{label}</span>
      <strong className="dash-kpi-value">{value}</strong>
      {hint ? <span className="dash-kpi-hint">{hint}</span> : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={`dash-kpi tone-${tone}`}>
        {body}
      </Link>
    )
  }

  return <div className={`dash-kpi tone-${tone}`}>{body}</div>
}

function UsageMeter({ label, used, max }: { label: string; used: number; max: number | null | undefined }) {
  const unlimited = max == null
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(max, 1)) * 100))
  const warn = !unlimited && pct >= 85

  return (
    <div className="dash-meter">
      <div className="dash-meter-head">
        <span>{label}</span>
        <strong>
          {used}
          {unlimited ? ' / ∞' : ` / ${max}`}
        </strong>
      </div>
      <div className="dash-meter-track">
        <div
          className={`dash-meter-fill${warn ? ' warn' : ''}`}
          style={{ width: unlimited ? '12%' : `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user, tenant, can, switchTenant } = useAuth()
  const queryClient = useQueryClient()
  const isSaas = Boolean(user?.is_super_admin)
  const tenantKey = tenant?.id ?? 'none'

  const { data: projectsPage, isLoading: projectsLoading } = useQuery({
    queryKey: ['dashboard-projects', tenantKey],
    queryFn: () => modulesApi.listProjects({ page: 1, per_page: 100 }),
    enabled: can('projects.view'),
  })

  const { data: companiesPage } = useQuery({
    queryKey: ['dashboard-companies', tenantKey],
    queryFn: () => modulesApi.listCompanies('', 1),
    enabled: can('company.view'),
  })

  const { data: clientsPage } = useQuery({
    queryKey: ['dashboard-clients', tenantKey],
    queryFn: () => modulesApi.listClients('', 1),
    enabled: can('clients.view'),
  })

  const { data: usersPage } = useQuery({
    queryKey: ['dashboard-users', tenantKey],
    queryFn: () => saasApi.listRbacUsers('', 1),
    enabled: can('users.view'),
  })

  const { data: usage } = useQuery({
    queryKey: ['dashboard-usage', tenantKey],
    queryFn: () => saasApi.getTenantUsage(),
    enabled: can('company.view'),
  })

  const { data: subscription } = useQuery({
    queryKey: ['dashboard-subscription', tenantKey],
    queryFn: () => saasApi.getTenantSubscription(),
    enabled: can('company.view'),
  })

  const { data: activityPage, isLoading: activityLoading } = useQuery({
    queryKey: ['activity', 'dashboard', tenantKey],
    queryFn: () => auditApi.listActivity(undefined, 1),
    enabled: can('audit.view'),
  })

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count', tenantKey],
    queryFn: () => auditApi.unreadNotificationCount(),
  })

  const { data: saasTenants, isLoading: saasTenantsLoading } = useQuery({
    queryKey: ['dashboard-saas-tenants'],
    queryFn: () => saasApi.listSaasTenants('', 1, '', 100),
    enabled: isSaas,
  })

  const { data: saasUsage, isLoading: saasUsageLoading } = useQuery({
    queryKey: ['dashboard-saas-usage'],
    queryFn: () => saasApi.listSaasUsage(),
    enabled: isSaas,
  })

  const { data: saasTrials } = useQuery({
    queryKey: ['dashboard-saas-trials'],
    queryFn: () => saasApi.listSaasTrials(1),
    enabled: isSaas,
  })

  const { data: saasBilling } = useQuery({
    queryKey: ['dashboard-saas-billing'],
    queryFn: () => saasApi.listSaasBilling(1),
    enabled: isSaas,
  })

  const projects = projectsPage?.data ?? []
  const projectTotal = projectsPage?.meta?.total ?? projects.length
  const allTenants = saasTenants?.data ?? []
  const usageRows = saasUsage ?? []

  const statusChart = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of projects) {
      counts[p.status] = (counts[p.status] ?? 0) + 1
    }
    return Object.entries(counts).map(([status, value]) => ({
      name: formatLabel(status),
      status,
      value,
      fill: STATUS_COLORS[status] ?? '#64748b',
    }))
  }, [projects])

  const activityTrend = useMemo(() => {
    const days: { key: string; label: string; count: number }[] = []
    const now = new Date()
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({
        key,
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        count: 0,
      })
    }
    for (const a of activityPage?.data ?? []) {
      if (!a.created_at) continue
      const key = new Date(a.created_at).toISOString().slice(0, 10)
      const row = days.find((d) => d.key === key)
      if (row) row.count += 1
    }
    return days
  }, [activityPage])

  const tenantStatusChart = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const row of allTenants) {
      const status = (row as { status?: string }).status ?? 'unknown'
      counts[status] = (counts[status] ?? 0) + 1
    }
    if (Object.keys(counts).length === 0) {
      for (const row of usageRows) {
        const status = row.tenant?.status ?? row.usage?.tenant_status ?? 'unknown'
        counts[status] = (counts[status] ?? 0) + 1
      }
    }
    return Object.entries(counts).map(([status, value], i) => ({
      name: formatLabel(status),
      status,
      value,
      fill: TENANT_STATUS_COLORS[status] ?? CHART_PALETTE[i % CHART_PALETTE.length],
    }))
  }, [allTenants, usageRows])

  const usageByTenantId = useMemo(() => {
    const map = new Map<number, any>()
    for (const row of usageRows) {
      const id = row.tenant?.id ?? row.usage?.tenant_id
      if (id != null) map.set(Number(id), row)
    }
    return map
  }, [usageRows])

  const openInvoices = ((saasBilling?.data ?? []) as Array<{ status?: string }>).filter(
    (inv) => inv.status === 'open',
  ).length

  const activeTenants = allTenants.filter((t: any) => t.status === 'active').length
  const trialTenants = allTenants.filter((t: any) => t.status === 'trial').length
  const totalUsersAcross = usageRows.reduce((sum, row) => sum + Number(row.usage?.users?.used ?? 0), 0)
  const totalProjectsAcross = usageRows.reduce((sum, row) => sum + Number(row.usage?.projects?.used ?? 0), 0)

  const greeting = user?.is_super_admin
    ? 'Monitor every tenant, then drill into a selected workspace.'
    : `Workspace · ${tenant?.name ?? 'No tenant'}`

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const avgProgress =
    projects.length === 0
      ? 0
      : Math.round(
          projects.reduce((sum, p) => sum + Number(p.progress_percent ?? 0), 0) / projects.length,
        )

  async function focusTenant(id: number) {
    if (!id || id === tenant?.id) return
    await switchTenant(id)
    await queryClient.invalidateQueries()
  }

  return (
    <div className="stack dash">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">{isSaas ? 'Platform' : 'Workspace'}</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">{todayLabel}</span>
            {tenant && (
              <>
                <span className="page-meta-sep" aria-hidden />
                <span className="page-meta-text">
                  Viewing <strong>{tenant.name}</strong>
                </span>
              </>
            )}
          </div>
          <h1 className="page-header-title">{isSaas ? 'SaaS Admin Dashboard' : 'Dashboard'}</h1>
          <p className="page-header-desc">
            Welcome back, {user?.name}. {greeting}
          </p>
        </div>
        <div className="page-header-actions">
          {!isSaas && can('projects.manage') && (
            <Link className="button-link" to="/admin/organization/projects">
              New project
            </Link>
          )}
          {isSaas && (
            <>
              <Link className="button-link" to="/admin/saas/tenants">
                Manage tenants
              </Link>
              <Link className="ghost-link" to="/admin/saas/registration">
                Register tenant
              </Link>
            </>
          )}
          {can('audit.view') && (
            <Link className="ghost-link" to="/admin/system/audit">
              Audit log
            </Link>
          )}
        </div>
      </header>

      {isSaas && (
        <>
          <section className="dash-kpi-grid">
            <KpiCard
              label="All tenants"
              value={saasTenantsLoading ? '…' : (saasTenants?.meta?.total ?? allTenants.length)}
              hint={`${activeTenants} active · ${trialTenants} trial`}
              to="/admin/saas/tenants"
              tone="accent"
            />
            <KpiCard
              label="Users (all tenants)"
              value={saasUsageLoading ? '…' : totalUsersAcross}
              hint="Across platform"
            />
            <KpiCard
              label="Projects (all tenants)"
              value={saasUsageLoading ? '…' : totalProjectsAcross}
              hint="Across platform"
            />
            <KpiCard
              label="Trials"
              value={saasTrials?.meta?.total ?? saasTrials?.data?.length ?? trialTenants}
              to="/admin/saas/trials"
              tone="warn"
            />
            <KpiCard label="Open invoices" value={openInvoices} to="/admin/saas/billing" />
            <KpiCard
              label="Selected tenant"
              value={tenant?.name ?? 'None'}
              hint={tenant?.status ? formatLabel(tenant.status) : 'Pick from top dropdown'}
              tone="success"
            />
          </section>

          <div className="grid-2 dash-charts">
            <section className="panel dash-panel">
              <div className="toolbar">
                <h2>Tenants by status</h2>
                <Link to="/admin/saas/tenants" className="small">
                  Manage
                </Link>
              </div>
              {tenantStatusChart.length === 0 ? (
                <p className="muted">No tenants yet.</p>
              ) : (
                <div className="dash-chart">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={tenantStatusChart} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                        {tenantStatusChart.map((entry) => (
                          <Cell key={entry.status} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="dash-legend">
                    {tenantStatusChart.map((s) => (
                      <li key={s.status}>
                        <span className="dash-swatch" style={{ background: s.fill }} />
                        {s.name}
                        <strong>{s.value}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="panel dash-panel">
              <div className="toolbar">
                <h2>Platform usage snapshot</h2>
                <Link to="/admin/saas/usage" className="small">
                  Full report
                </Link>
              </div>
              {usageRows.length === 0 ? (
                <p className="muted">No usage snapshots.</p>
              ) : (
                <div className="dash-chart">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={usageRows.slice(0, 12).map((row: any) => ({
                        name: (row.tenant?.name ?? 'Tenant').slice(0, 12),
                        users: row.usage?.users?.used ?? 0,
                        projects: row.usage?.projects?.used ?? 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                      <Tooltip />
                      <Bar dataKey="users" name="Users" fill="#1F4E79" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="projects" name="Projects" fill="#C47A11" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          <section className="panel dash-panel">
            <div className="toolbar">
              <h2>All tenants</h2>
              <span className="muted small">
                Click Switch to change the topbar tenant context
              </span>
            </div>
            {saasTenantsLoading ? (
              <p className="muted">Loading tenants…</p>
            ) : allTenants.length === 0 ? (
              <p className="muted">
                No tenants yet. <Link to="/admin/saas/registration">Register the first tenant</Link>
              </p>
            ) : (
              <div className="table-scroll">
                <table className="data-table dash-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Slug</th>
                      <th>Status</th>
                      <th>Plan</th>
                      <th>Users</th>
                      <th>Projects</th>
                      <th>Trial ends</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {allTenants.map((t: any) => {
                      const row = usageByTenantId.get(Number(t.id))
                      const selected = tenant?.id === t.id
                      const planName = t.subscription?.plan?.name ?? row?.usage?.plan?.name ?? '—'
                      const usersUsed = t.usage?.users?.used ?? row?.usage?.users?.used
                      const usersMax = t.usage?.users?.max ?? row?.usage?.users?.max
                      const projectsUsed = t.usage?.projects?.used ?? row?.usage?.projects?.used
                      const projectsMax = t.usage?.projects?.max ?? row?.usage?.projects?.max
                      return (
                        <tr key={t.id} className={selected ? 'is-selected-row' : undefined}>
                          <td>
                            <strong>{t.name}</strong>
                            {selected ? <span className="badge" style={{ marginLeft: 8 }}>Selected</span> : null}
                          </td>
                          <td className="muted">{t.slug}</td>
                          <td>
                            <span className="badge">{formatLabel(t.status ?? '—')}</span>
                          </td>
                          <td>{planName}</td>
                          <td>
                            {usersUsed ?? '—'}
                            {usersMax != null ? ` / ${usersMax}` : ''}
                          </td>
                          <td>
                            {projectsUsed ?? '—'}
                            {projectsMax != null ? ` / ${projectsMax}` : ''}
                          </td>
                          <td className="muted small">
                            {t.trial_ends_at ? new Date(t.trial_ends_at).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="ghost-link"
                              disabled={selected}
                              onClick={() => void focusTenant(Number(t.id))}
                            >
                              {selected ? 'Current' : 'Switch'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <header className="dash-section-head">
            <h2>Selected workspace · {tenant?.name ?? 'None'}</h2>
            <p className="muted">Tenant-scoped KPIs update when you change the top Tenant dropdown.</p>
          </header>
        </>
      )}

      <section className="dash-kpi-grid">
        {can('projects.view') && (
          <KpiCard
            label="Projects"
            value={projectsLoading ? '…' : projectTotal}
            hint={`${avgProgress}% avg progress`}
            to="/admin/organization/projects"
            tone="accent"
          />
        )}
        {can('clients.view') && (
          <KpiCard
            label="Clients"
            value={clientsPage?.meta?.total ?? clientsPage?.data?.length ?? 0}
            to="/admin/organization/clients"
          />
        )}
        {can('company.view') && (
          <KpiCard
            label="Companies"
            value={companiesPage?.meta?.total ?? companiesPage?.data?.length ?? 0}
            to="/admin/organization/companies"
          />
        )}
        {can('users.view') && (
          <KpiCard
            label="Users"
            value={usersPage?.meta?.total ?? usersPage?.data?.length ?? 0}
            to="/admin/rbac/users"
          />
        )}
        <KpiCard label="Notifications" value={unread} hint="Unread" tone={unread > 0 ? 'warn' : 'default'} />
        {subscription?.plan?.name && (
          <KpiCard
            label="Plan"
            value={subscription.plan.name}
            hint={subscription.status ?? 'subscription'}
            tone="success"
          />
        )}
      </section>

      {can('company.view') && usage && (
        <section className="panel dash-panel">
          <div className="toolbar">
            <h2>Usage limits{isSaas && tenant ? ` · ${tenant.name}` : ''}</h2>
            <span className="muted small">
              {usage.plan?.name ? `${usage.plan.name} plan` : 'Current plan'}
              {usage.subscription_status ? ` · ${usage.subscription_status}` : ''}
            </span>
          </div>
          <div className="dash-meters">
            <UsageMeter label="Projects" used={usage.projects?.used ?? 0} max={usage.projects?.max} />
            <UsageMeter label="Users" used={usage.users?.used ?? 0} max={usage.users?.max} />
          </div>
        </section>
      )}

      <div className="grid-2 dash-charts">
        <section className="panel dash-panel">
          <div className="toolbar">
            <h2>Projects by status</h2>
            {can('projects.view') && (
              <Link to="/admin/organization/projects" className="small">
                View projects
              </Link>
            )}
          </div>
          {!can('projects.view') ? (
            <p className="muted">Project access required.</p>
          ) : projectsLoading ? (
            <p className="muted">Loading chart…</p>
          ) : statusChart.length === 0 ? (
            <p className="muted">No projects yet. Create your first project to see status distribution.</p>
          ) : (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={statusChart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {statusChart.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="dash-legend">
                {statusChart.map((s) => (
                  <li key={s.status}>
                    <span className="dash-swatch" style={{ background: s.fill }} />
                    {s.name}
                    <strong>{s.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="panel dash-panel">
          <div className="toolbar">
            <h2>Activity (7 days)</h2>
            {can('audit.view') && (
              <Link to="/admin/system/audit" className="small">
                View all
              </Link>
            )}
          </div>
          {!can('audit.view') ? (
            <p className="muted">Audit access required for activity trends.</p>
          ) : activityLoading ? (
            <p className="muted">Loading chart…</p>
          ) : (
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={activityTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <Tooltip />
                  <Bar dataKey="count" name="Events" fill="#1F4E79" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="panel dash-panel">
          <div className="toolbar">
            <h2>Recent projects</h2>
            {can('projects.view') && (
              <Link to="/admin/organization/projects" className="small">
                All projects
              </Link>
            )}
          </div>
          {!can('projects.view') ? (
            <p className="muted">You do not have project view access.</p>
          ) : projects.length === 0 ? (
            <p className="muted">
              No projects yet.{' '}
              {can('projects.manage') && <Link to="/admin/organization/projects">Create one</Link>}
            </p>
          ) : (
            <table className="data-table dash-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 6).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/admin/organization/projects/${p.id}`}>{p.project_code}</Link>
                    </td>
                    <td>{p.name}</td>
                    <td>
                      <span className="badge">{formatLabel(p.status)}</span>
                    </td>
                    <td>{Number(p.progress_percent ?? 0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel dash-panel">
          <div className="toolbar">
            <h2>Recent activity</h2>
            {can('audit.view') && (
              <Link to="/admin/system/audit" className="small">
                View all
              </Link>
            )}
          </div>
          {!can('audit.view') ? (
            <p className="muted">Activity feed requires audit access.</p>
          ) : (activityPage?.data ?? []).length === 0 ? (
            <p className="muted">No recent activity yet.</p>
          ) : (
            <ul className="activity-list">
              {(activityPage?.data ?? []).slice(0, 8).map((a) => (
                <li key={a.id}>
                  <strong>{a.description ?? a.event}</strong>
                  <div className="muted small">
                    {a.user?.name ?? 'System'}
                    {a.project ? ` · ${a.project.code ?? a.project.name}` : ''}
                    {a.created_at ? ` · ${new Date(a.created_at).toLocaleString()}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel dash-panel">
        <h2>Quick actions</h2>
        <div className="dash-actions">
          {isSaas && (
            <>
              <Link to="/admin/saas/tenants" className="dash-action">
                <strong>Tenants</strong>
                <span className="muted small">All company workspaces</span>
              </Link>
              <Link to="/admin/saas/billing" className="dash-action">
                <strong>Billing</strong>
                <span className="muted small">Invoices & payments</span>
              </Link>
              <Link to="/admin/saas/plans" className="dash-action">
                <strong>Plans</strong>
                <span className="muted small">Subscription catalog</span>
              </Link>
            </>
          )}
          {can('projects.view') && (
            <Link to="/admin/organization/projects" className="dash-action">
              <strong>Projects</strong>
              <span className="muted small">Planning & delivery</span>
            </Link>
          )}
          {can('clients.view') && (
            <Link to="/admin/organization/clients" className="dash-action">
              <strong>Clients</strong>
              <span className="muted small">Client directory</span>
            </Link>
          )}
          {(can('procurement.view') || can('inventory.view')) && (
            <Link to="/admin/operations/suppliers" className="dash-action">
              <strong>Operations</strong>
              <span className="muted small">Suppliers & inventory</span>
            </Link>
          )}
          {can('users.view') && (
            <Link to="/admin/rbac/users" className="dash-action">
              <strong>Users & RBAC</strong>
              <span className="muted small">Roles and access</span>
            </Link>
          )}
          {can('company.view') && (
            <Link to="/admin/system/branding" className="dash-action">
              <strong>Branding</strong>
              <span className="muted small">Workspace appearance</span>
            </Link>
          )}
          {isSaas && (
            <Link to="/admin/saas/trials" className="dash-action">
              <strong>Trials</strong>
              <span className="muted small">SaaS trial management</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}
