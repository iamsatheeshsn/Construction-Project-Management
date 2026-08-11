import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import * as api from '../../services/api/opsApi'
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

export function SubcontractorsPanel({ projectId }: { projectId: number }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pkgForm, setPkgForm] = useState({ subcontractor_id: '', title: '', retention_percent: '5' })
  const [itemForm, setItemForm] = useState({ description: '', unit: 'ls', quantity: '1', rate: '' })

  const { data: subcontractorsPage } = useQuery({
    queryKey: ['subcontractors'],
    queryFn: () => api.listSubcontractors(),
    enabled: can('subcontractors.view'),
  })

  const { data: packagesPage, isLoading } = useQuery({
    queryKey: ['subcontract-packages', projectId],
    queryFn: () => api.listSubcontractPackages(projectId),
    enabled: can('subcontractors.view'),
  })

  const packages = packagesPage?.data ?? []
  const activeId = selectedId ?? packages[0]?.id ?? null

  const { data: selected } = useQuery({
    queryKey: ['subcontract-package', projectId, activeId],
    queryFn: () => api.getSubcontractPackage(projectId, activeId!),
    enabled: !!activeId && can('subcontractors.view'),
  })

  const onErr = (err: unknown, fallback: string) => {
    setFieldErrors(getFieldErrors(err))
    setError(getErrorMessage(err, fallback))
  }

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['subcontract-packages', projectId] }),
      qc.invalidateQueries({ queryKey: ['subcontract-package', projectId] }),
    ])
  }

  const createPackage = useMutation({
    mutationFn: () =>
      api.createSubcontractPackage(projectId, {
        subcontractor_id: Number(pkgForm.subcontractor_id),
        title: pkgForm.title,
        retention_percent: Number(pkgForm.retention_percent || 0),
      }),
    onSuccess: async (row) => {
      setPkgForm({ subcontractor_id: '', title: '', retention_percent: '5' })
      setSelectedId(row.id)
      setError(null)
      setFieldErrors({})
      await invalidate()
      success({ title: 'Package created', message: 'The subcontract package was created.' })
    },
    onError: (err) => onErr(err, 'Failed to create package'),
  })

  const addItem = useMutation({
    mutationFn: () =>
      api.addSubcontractPackageItem(projectId, activeId!, {
        description: itemForm.description,
        unit: itemForm.unit || null,
        quantity: Number(itemForm.quantity),
        rate: Number(itemForm.rate),
      }),
    onSuccess: async () => {
      setItemForm({ description: '', unit: 'ls', quantity: '1', rate: '' })
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to add item'),
  })

  const award = useMutation({
    mutationFn: () => api.awardSubcontractPackage(projectId, activeId!),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Award failed'),
  })

  const activate = useMutation({
    mutationFn: () => api.activateSubcontractPackage(projectId, activeId!),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Activate failed'),
  })

  const complete = useMutation({
    mutationFn: () => api.completeSubcontractPackage(projectId, activeId!),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Complete failed'),
  })

  const subcontractors = subcontractorsPage?.data ?? []

  if (!can('subcontractors.view')) {
    return <p className="muted">You do not have permission to view subcontractors.</p>
  }

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}

      <div className="grid-2">
        <section className="panel">
          <h2>Subcontract packages</h2>
          {isLoading ? (
            <p className="muted">Loading…</p>
          ) : packages.length === 0 ? (
            <p className="muted">No packages yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Title</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p) => (
                  <tr key={p.id} className={activeId === p.id ? 'row-active' : undefined} onClick={() => setSelectedId(p.id)}>
                    <td>{p.package_no}</td>
                    <td>
                      <strong>{p.title}</strong>
                      <div className="muted small">{p.subcontractor?.name ?? `Sub #${p.subcontractor_id}`}</div>
                    </td>
                    <td>{p.contract_value != null ? Number(p.contract_value).toLocaleString() : '—'}</td>
                    <td>
                      <span className="badge">{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('subcontractors.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(pkgForm, {
                  subcontractor_id: 'Select a subcontractor.',
                  title: 'Enter a title.',
                })
                if (Object.keys(errs).length) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createPackage.mutate()
              }}
            >
              <h3>New package</h3>
              <FormField label="Subcontractor" required error={fieldErrors.subcontractor_id}>
                <select value={pkgForm.subcontractor_id} onChange={(e) => setPkgForm({ ...pkgForm, subcontractor_id: e.target.value })}>
                  <option value="">Select…</option>
                  {subcontractors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Title" required error={fieldErrors.title}>
                <input value={pkgForm.title} onChange={(e) => setPkgForm({ ...pkgForm, title: e.target.value })} />
              </FormField>
              <FormField label="Retention %" error={fieldErrors.retention_percent}>
                <input type="number" min="0" max="100" value={pkgForm.retention_percent} onChange={(e) => setPkgForm({ ...pkgForm, retention_percent: e.target.value })} />
              </FormField>
              <button type="submit" disabled={createPackage.isPending}>
                Create package
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          {!selected ? (
            <p className="muted">Select a package to view details.</p>
          ) : (
            <>
              <div className="toolbar">
                <div>
                  <h2>{selected.package_no}</h2>
                  <p className="muted">
                    {selected.title} · <span className="badge">{selected.status}</span>
                  </p>
                </div>
                {can('subcontractors.manage') && (
                  <div className="toolbar">
                    {selected.status === 'draft' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Award package?',
                            message: `Award package ${selected.package_no}?`,
                            confirmLabel: 'Award',
                            danger: false,
                          })
                          if (ok) award.mutate()
                        }}
                      >
                        Award
                      </button>
                    )}
                    {selected.status === 'awarded' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Activate package?',
                            message: `Activate package ${selected.package_no}?`,
                            confirmLabel: 'Activate',
                            danger: false,
                          })
                          if (ok) activate.mutate()
                        }}
                      >
                        Activate
                      </button>
                    )}
                    {selected.status === 'active' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Complete package?',
                            message: `Mark package ${selected.package_no} as complete?`,
                            confirmLabel: 'Complete',
                            danger: false,
                          })
                          if (ok) complete.mutate()
                        }}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                )}
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>
                        {Number(item.quantity)} {item.unit ?? ''}
                      </td>
                      <td>{Number(item.rate).toLocaleString()}</td>
                      <td>{Number(item.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {can('subcontractors.manage') && selected.status === 'draft' && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(itemForm, {
                      description: 'Enter a description.',
                      quantity: 'Enter a quantity.',
                      rate: 'Enter a rate.',
                    })
                    if (Object.keys(errs).length) {
                      setFieldErrors(errs)
                      return
                    }
                    setFieldErrors({})
                    addItem.mutate()
                  }}
                >
                  <h3>Add item</h3>
                  <FormField label="Description" required error={fieldErrors.description}>
                    <input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
                  </FormField>
                  <FormField label="Unit" error={fieldErrors.unit}>
                    <input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} />
                  </FormField>
                  <FormField label="Quantity" required error={fieldErrors.quantity}>
                    <input type="number" min="0" step="any" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                  </FormField>
                  <FormField label="Rate" required error={fieldErrors.rate}>
                    <input type="number" min="0" step="any" value={itemForm.rate} onChange={(e) => setItemForm({ ...itemForm, rate: e.target.value })} />
                  </FormField>
                  <button type="submit" disabled={addItem.isPending}>
                    Add item
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
