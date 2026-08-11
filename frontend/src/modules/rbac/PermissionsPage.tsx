import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api/saasRbacApi'
import { useAuth } from '../auth/AuthContext'
import { DEFAULT_PAGE_SIZE, Pagination, getErrorMessage, useToast } from '../../ui'

type Permission = { id: number; code: string; name: string; module: string; description?: string | null }

function formatModuleLabel(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function PermissionsPage() {
  const { can } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')

  const canView = can('users.view') || can('roles.manage')

  const { data, isLoading, error } = useQuery({
    queryKey: ['permission-catalog'],
    queryFn: () => api.listPermissionCatalog(),
    enabled: canView,
  })

  const allPermissions: Permission[] = useMemo(() => {
    const list = Array.isArray(data?.data) ? (data.data as Permission[]) : []
    return [...list].sort((a, b) => a.module.localeCompare(b.module) || a.code.localeCompare(b.code))
  }, [data])

  const stats = useMemo(() => {
    const modules = new Set(allPermissions.map((p) => p.module))
    return {
      total: allPermissions.length,
      modules: modules.size,
    }
  }, [allPermissions])

  const moduleOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of allPermissions) {
      counts.set(p.module, (counts.get(p.module) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count, label: formatModuleLabel(value) }))
  }, [allPermissions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allPermissions.filter((p) => {
      if (moduleFilter && p.module !== moduleFilter) return false
      if (!q) return true
      return (
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      )
    })
  }, [allPermissions, search, moduleFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * DEFAULT_PAGE_SIZE, currentPage * DEFAULT_PAGE_SIZE)
  const pageMeta = {
    current_page: currentPage,
    last_page: pageCount,
    per_page: DEFAULT_PAGE_SIZE,
    total: filtered.length,
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      toast(`Copied “${code}”`, 'success')
    } catch {
      toast('Could not copy to clipboard', 'error')
    }
  }

  if (!canView) {
    return <p className="muted">You do not have permission to view permissions.</p>
  }

  return (
    <div className="stack rbac-permissions-page">
      <header className="page-header">
        <div className="page-header-main">
          <div className="page-header-meta">
            <span className="page-chip">RBAC</span>
            <span className="page-meta-sep" aria-hidden />
            <span className="page-meta-text">Access control</span>
          </div>
          <h1 className="page-header-title">Permissions</h1>
          <p className="page-header-desc">
            Read-only catalog of every permission code available on the platform, grouped by module.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="ghost-link" to="/admin/rbac/roles">
            Roles
          </Link>
          <Link className="ghost-link" to="/admin/rbac/policies">
            Policies
          </Link>
          <Link className="ghost-link" to="/admin/rbac/users">
            Users
          </Link>
        </div>
      </header>

      {error && <div className="error">{getErrorMessage(error, 'Failed to load permissions')}</div>}

      <section className="tenant-stats rbac-stats-2">
        <div className="tenant-stat">
          <span className="tenant-stat-label">Total permissions</span>
          <strong className="tenant-stat-value">{stats.total}</strong>
        </div>
        <div className="tenant-stat">
          <span className="tenant-stat-label">Modules</span>
          <strong className="tenant-stat-value">{stats.modules}</strong>
        </div>
      </section>

      <section className="panel rbac-panel">
        <div className="tenants-toolbar">
          <div className="tenants-toolbar-copy">
            <h2>Permission catalog</h2>
            <p className="muted small">{filtered.length} matching</p>
          </div>
          <div className="tenants-filters">
            <label className="tenants-search">
              <span className="sr-only">Search permissions</span>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Search code, name, description…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </label>
          </div>
        </div>

        <div className="tenants-status-chips rbac-module-chips" role="tablist" aria-label="Filter by module">
          <button
            type="button"
            role="tab"
            aria-selected={!moduleFilter}
            className={`tenants-chip${!moduleFilter ? ' active' : ''}`}
            onClick={() => {
              setModuleFilter('')
              setPage(1)
            }}
          >
            All
            <span>{stats.total}</span>
          </button>
          {moduleOptions.map((m) => (
            <button
              key={m.value}
              type="button"
              role="tab"
              aria-selected={moduleFilter === m.value}
              className={`tenants-chip${moduleFilter === m.value ? ' active' : ''}`}
              onClick={() => {
                setModuleFilter(m.value)
                setPage(1)
              }}
            >
              {m.label}
              <span>{m.count}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="muted tenants-empty">Loading permission catalog…</p>
        ) : filtered.length === 0 ? (
          <div className="tenants-empty">
            <h3>No permissions found</h3>
            <p className="muted">
              {search || moduleFilter
                ? 'Try clearing filters or adjusting your search.'
                : 'Permissions are provisioned by the platform.'}
            </p>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table rbac-permissions-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Module</th>
                    <th>Description</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <code className="rbac-code">{p.code}</code>
                      </td>
                      <td>{p.name}</td>
                      <td>
                        <span className="badge rbac-module-badge">{formatModuleLabel(p.module)}</span>
                      </td>
                      <td className="muted">{p.description ?? '—'}</td>
                      <td>
                        <button type="button" className="ghost" onClick={() => void copyCode(p.code)}>
                          Copy
                        </button>
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
    </div>
  )
}
