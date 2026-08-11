import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../modules/auth/AuthContext'
import { NotificationBell } from '../../modules/audit/NotificationBell'
import { ChangePasswordModal } from '../../modules/auth/ChangePasswordModal'
import { APP_NAME, BrandMark } from '../../brand'
import {
  filterNav,
  findActiveGroupId,
  pathActivatesLeaf,
  type NavLeaf,
} from '../nav/adminNav'

const ICONS: Record<string, string> = {
  dashboard: 'M4 13h6V4H4v9zm0 7h6v-5H4v5zm8 0h8V11h-8v9zm0-18v7h8V2h-8z',
  organization: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6',
  companies: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6',
  clients: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  projects: 'M3 7h18M3 12h18M3 17h18',
  operations: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  suppliers: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9z',
  inventory: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  warehouses: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  equipment: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  subcontractors: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  system: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  audit: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  saas: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  tenants: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6',
  registration: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12.5 7.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM20 8v6M23 11h-6',
  plans: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  trials: 'M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  billing: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  features: 'M12 2l3 7h7l-5.5 4.5L19 21l-7-4-7 4 2.5-7.5L2 9h7z',
  branding: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z',
  usage: 'M18 20V10M12 20V4M6 20v-6',
  rbac: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  roles: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  permissions: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  policies: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15h6M9 11h6',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  collapse: 'M15 18l-6-6 6-6',
  expand: 'M9 18l6-6-6-6',
  chevron: 'M6 9l6 6 6-6',
}

function Icon({ name }: { name: string }) {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={ICONS[name] ?? ICONS.dashboard} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LeafLink({
  leaf,
  collapsed,
  onNavigate,
}: {
  leaf: NavLeaf
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const location = useLocation()
  const active = pathActivatesLeaf(location.pathname, leaf)

  return (
    <NavLink
      to={leaf.to}
      end
      className={`nav-link${active ? ' active' : ''}`}
      title={leaf.label}
      onClick={onNavigate}
    >
      <Icon name={leaf.icon} />
      {!collapsed && <span className="nav-label">{leaf.label}</span>}
    </NavLink>
  )
}

export function AdminLayout() {
  const { user, tenant, tenants, logout, can, switchTenant } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const nav = useMemo(
    () => filterNav({ can, isSuperAdmin: Boolean(user?.is_super_admin) }),
    [can, user?.is_super_admin],
  )

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cpm.sidebarCollapsed') === '1')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [switchingTenant, setSwitchingTenant] = useState(false)

  const activeGroupId = findActiveGroupId(location.pathname, nav)

  useEffect(() => {
    localStorage.setItem('cpm.sidebarCollapsed', collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    localStorage.removeItem('cpm.navOpenGroups')
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 960) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!accountOpen) return
    const onDoc = () => setAccountOpen(false)
    const t = window.setTimeout(() => document.addEventListener('click', onDoc), 0)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('click', onDoc)
    }
  }, [accountOpen])

  function openGroup(groupId: string, firstChildTo?: string) {
    if (collapsed) setCollapsed(false)
    if (firstChildTo && activeGroupId !== groupId) {
      navigate(firstChildTo)
      setMobileOpen(false)
    }
  }

  async function onTenantChange(nextId: string) {
    const id = Number(nextId)
    if (!id || id === tenant?.id) return
    setSwitchingTenant(true)
    try {
      await switchTenant(id)
      await queryClient.invalidateQueries()
    } finally {
      setSwitchingTenant(false)
    }
  }

  const shellClass = ['app-shell', collapsed ? 'sidebar-collapsed' : '', mobileOpen ? 'sidebar-open' : '']
    .filter(Boolean)
    .join(' ')

  const showTenantSwitcher = tenants.length > 0 && (Boolean(user?.is_super_admin) || tenants.length > 1)

  return (
    <div className={shellClass}>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="brand">
            <BrandMark size={36} className="brand-mark-img" />
            <div className="brand-copy">
              <strong>{APP_NAME}</strong>
              <span>{tenant?.name ?? 'No tenant'}</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle desktop-only"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((v) => !v)}
          >
            <Icon name={collapsed ? 'expand' : 'collapse'} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main">
          {nav.map((entry) => {
            if (entry.type === 'link') {
              return (
                <div key={entry.item.id} className="nav-block">
                  <LeafLink leaf={entry.item} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
                </div>
              )
            }

            const group = entry.item
            const isActiveGroup = activeGroupId === group.id
            const isOpen = !collapsed && isActiveGroup
            const firstChild = group.children[0]

            return (
              <div key={group.id} className={`nav-block nav-accordion${isActiveGroup ? ' has-active' : ''}`}>
                <button
                  type="button"
                  className={`nav-parent${isActiveGroup ? ' active-branch' : ''}${isOpen ? ' open' : ''}`}
                  aria-expanded={isOpen}
                  title={group.label}
                  onClick={() => openGroup(group.id, firstChild?.to)}
                >
                  <Icon name={group.icon} />
                  {!collapsed && (
                    <>
                      <span className="nav-label">{group.label}</span>
                      <svg className="nav-chevron" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d={ICONS.chevron} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>

                {isOpen && (
                  <div className="nav-children" role="group" aria-label={group.label}>
                    {group.children.map((child) => {
                      const active = pathActivatesLeaf(location.pathname, child)
                      return (
                        <NavLink
                          key={child.id}
                          to={child.to}
                          end
                          className={`nav-link nav-sublink${active ? ' active' : ''}`}
                          title={child.label}
                          onClick={() => setMobileOpen(false)}
                        >
                          <span className="nav-sub-dot" aria-hidden />
                          <span className="nav-label">{child.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-btn mobile-only"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              style={{ background: '#f5f8fb', color: 'var(--ink)', border: '1px solid var(--line)' }}
            >
              <Icon name="menu" />
            </button>
            <div className="topbar-identity">
              <div className="topbar-avatar" aria-hidden>
                {(user?.name ?? 'U')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join('') || 'U'}
              </div>
              <div className="topbar-identity-text">
                <div className="topbar-title">{user?.name}</div>
                <div className="topbar-subtitle">
                  {user?.is_super_admin ? 'SaaS administrator' : 'Workspace member'}
                  {tenant ? (
                    <>
                      <span className="topbar-dot" aria-hidden />
                      <span className="topbar-tenant-name">{tenant.name}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            {showTenantSwitcher && (
              <div className={`tenant-switcher${switchingTenant ? ' is-busy' : ''}`}>
                <span className="tenant-switcher-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                    <path
                      d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="tenant-switcher-fields">
                  <span className="tenant-switcher-label">
                    {user?.is_super_admin ? 'Active tenant' : 'Workspace'}
                  </span>
                  <select
                    value={tenant?.id ?? ''}
                    disabled={switchingTenant}
                    aria-label="Change tenant"
                    onChange={(e) => void onTenantChange(e.target.value)}
                  >
                    {!tenant && <option value="">Select tenant…</option>}
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                {switchingTenant && <span className="tenant-switcher-busy">Switching…</span>}
              </div>
            )}
            <div className="topbar-divider" aria-hidden />
            <NotificationBell />
            <div className="account-menu">
              <button
                type="button"
                className="account-trigger"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((v) => !v)}
              >
                <span className="account-trigger-label">Account</span>
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14" aria-hidden>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {accountOpen && (
                <div className="account-dropdown">
                  <div className="account-dropdown-head">
                    <strong>{user?.name}</strong>
                    <span className="muted small">{user?.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false)
                      setPasswordOpen(true)
                    }}
                  >
                    Change password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false)
                      void logout()
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  )
}
