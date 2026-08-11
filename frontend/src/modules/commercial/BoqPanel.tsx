import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import * as api from '../../services/api/modulesApi'
import type { WbsNode } from '../../services/api/modulesApi'
import { useAuth } from '../auth/AuthContext'
import {
  FormField,
  getErrorMessage,
  getFieldErrors,
  requireFields,
  useConfirm,
  type FieldErrors,
} from '../../ui'

function flattenWbs(nodes: WbsNode[], acc: WbsNode[] = []): WbsNode[] {
  for (const n of nodes) {
    acc.push(n)
    if (n.children?.length) flattenWbs(n.children, acc)
  }
  return acc
}

export function BoqPanel({ projectId, wbs }: { projectId: number; wbs: WbsNode[] }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [selectedBoqId, setSelectedBoqId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [boqForm, setBoqForm] = useState({ title: '', version: '1.0', currency: 'AED' })
  const [itemForm, setItemForm] = useState({
    item_no: '',
    description: '',
    unit: 'm3',
    quantity: '',
    rate: '',
    wbs_id: '',
    cost_code_id: '',
  })
  const [codeForm, setCodeForm] = useState({ code: '', name: '', category: 'Civil' })

  const { data: boqsPage, isLoading } = useQuery({
    queryKey: ['boqs', projectId],
    queryFn: () => api.listBoqs(projectId),
    enabled: can('boq.view'),
  })

  const { data: costCodes } = useQuery({
    queryKey: ['cost-codes', projectId],
    queryFn: () => api.listCostCodes(projectId),
    enabled: can('boq.view'),
  })

  const selectedId = selectedBoqId ?? boqsPage?.data?.[0]?.id ?? null

  const { data: selectedBoq } = useQuery({
    queryKey: ['boq', projectId, selectedId],
    queryFn: () => api.getBoq(projectId, selectedId!),
    enabled: !!selectedId && can('boq.view'),
  })

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['boqs', projectId] })
    await qc.invalidateQueries({ queryKey: ['boq', projectId] })
    await qc.invalidateQueries({ queryKey: ['cost-codes', projectId] })
  }

  const createBoq = useMutation({
    mutationFn: () => api.createBoq(projectId, boqForm),
    onSuccess: async (boq) => {
      setBoqForm({ title: '', version: '1.0', currency: 'AED' })
      setSelectedBoqId(boq.id)
      setError(null)
      setFieldErrors({})
      await invalidate()
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create BOQ'))
    },
  })

  const createItem = useMutation({
    mutationFn: () =>
      api.createBoqItem(projectId, selectedId!, {
        item_no: itemForm.item_no,
        description: itemForm.description,
        unit: itemForm.unit || null,
        quantity: Number(itemForm.quantity || 0),
        rate: Number(itemForm.rate || 0),
        wbs_id: itemForm.wbs_id ? Number(itemForm.wbs_id) : null,
        cost_code_id: itemForm.cost_code_id ? Number(itemForm.cost_code_id) : null,
      }),
    onSuccess: async () => {
      setItemForm({ item_no: '', description: '', unit: 'm3', quantity: '', rate: '', wbs_id: '', cost_code_id: '' })
      setError(null)
      setFieldErrors({})
      await invalidate()
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to add item'))
    },
  })

  const approve = useMutation({
    mutationFn: () => api.approveBoq(projectId, selectedId!),
    onSuccess: async () => invalidate(),
    onError: (err: unknown) => setError(getErrorMessage(err, 'Failed to approve BOQ')),
  })

  const createCode = useMutation({
    mutationFn: () => api.createCostCode(projectId, codeForm),
    onSuccess: async () => {
      setCodeForm({ code: '', name: '', category: 'Civil' })
      setError(null)
      setFieldErrors({})
      await invalidate()
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create cost code'))
    },
  })

  const wbsOptions = flattenWbs(wbs)
  const boqs = boqsPage?.data ?? []

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}

      <div className="grid-2">
        <section className="panel">
          <div className="toolbar">
            <h2>BOQ versions</h2>
          </div>
          {isLoading ? (
            <p className="muted">Loading…</p>
          ) : boqs.length === 0 ? (
            <p className="muted">No BOQ yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Ver</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {boqs.map((b) => (
                  <tr key={b.id} className={selectedId === b.id ? 'row-active' : undefined} onClick={() => setSelectedBoqId(b.id)}>
                    <td>
                      <strong>{b.title}</strong>
                    </td>
                    <td>{b.version}</td>
                    <td>
                      <span className="badge">{b.status}</span>
                    </td>
                    <td>
                      {Number(b.total_amount).toLocaleString()} {b.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('boq.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(boqForm, { title: 'Title is required.' })
                if (Object.keys(errs).length > 0) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createBoq.mutate()
              }}
            >
              <h3>New BOQ</h3>
              <FormField label="Title" required error={fieldErrors.title}>
                <input
                  value={boqForm.title}
                  onChange={(e) => {
                    setBoqForm({ ...boqForm, title: e.target.value })
                    setFieldErrors((prev) => {
                      const n = { ...prev }
                      delete n.title
                      return n
                    })
                  }}
                />
              </FormField>
              <FormField label="Version" error={fieldErrors.version}>
                <input value={boqForm.version} onChange={(e) => setBoqForm({ ...boqForm, version: e.target.value })} />
              </FormField>
              <button type="submit" disabled={createBoq.isPending}>
                Create BOQ
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="toolbar">
            <h2>Items {selectedBoq ? `· ${selectedBoq.title}` : ''}</h2>
            {selectedBoq && can('boq.manage') && selectedBoq.status !== 'approved' && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Approve BOQ?',
                    message: `Approve BOQ “${selectedBoq.title}”?`,
                    confirmLabel: 'Approve',
                    danger: false,
                  })
                  if (ok) approve.mutate()
                }}
              >
                Approve BOQ
              </button>
            )}
          </div>

          {!selectedBoq ? (
            <p className="muted">Select or create a BOQ.</p>
          ) : (
            <>
              <p className="muted small">
                Total: <strong>{Number(selectedBoq.total_amount).toLocaleString()} {selectedBoq.currency}</strong> ·{' '}
                {selectedBoq.items_count ?? selectedBoq.items?.length ?? 0} items · {selectedBoq.status}
              </p>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedBoq.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.item_no}</td>
                      <td>
                        {item.description}
                        {item.wbs && <div className="muted small">WBS {item.wbs.code}</div>}
                      </td>
                      <td>
                        {Number(item.quantity)} {item.unit}
                      </td>
                      <td>{Number(item.rate).toLocaleString()}</td>
                      <td>{Number(item.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {can('boq.manage') && selectedBoq.status !== 'approved' && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(itemForm, {
                      item_no: 'Item no is required.',
                      description: 'Description is required.',
                    })
                    if (Object.keys(errs).length > 0) {
                      setFieldErrors(errs)
                      return
                    }
                    setFieldErrors({})
                    createItem.mutate()
                  }}
                >
                  <h3>Add line item</h3>
                  <FormField label="Item no" required error={fieldErrors.item_no}>
                    <input
                      value={itemForm.item_no}
                      onChange={(e) => {
                        setItemForm({ ...itemForm, item_no: e.target.value })
                        setFieldErrors((prev) => {
                          const n = { ...prev }
                          delete n.item_no
                          return n
                        })
                      }}
                    />
                  </FormField>
                  <FormField label="Description" required error={fieldErrors.description}>
                    <input
                      value={itemForm.description}
                      onChange={(e) => {
                        setItemForm({ ...itemForm, description: e.target.value })
                        setFieldErrors((prev) => {
                          const n = { ...prev }
                          delete n.description
                          return n
                        })
                      }}
                    />
                  </FormField>
                  <FormField label="Unit" error={fieldErrors.unit}>
                    <input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} />
                  </FormField>
                  <FormField label="Quantity" error={fieldErrors.quantity}>
                    <input type="number" min="0" step="0.0001" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                  </FormField>
                  <FormField label="Rate" error={fieldErrors.rate}>
                    <input type="number" min="0" step="0.0001" value={itemForm.rate} onChange={(e) => setItemForm({ ...itemForm, rate: e.target.value })} />
                  </FormField>
                  <FormField label="WBS" error={fieldErrors.wbs_id}>
                    <select value={itemForm.wbs_id} onChange={(e) => setItemForm({ ...itemForm, wbs_id: e.target.value })}>
                      <option value="">None</option>
                      {wbsOptions.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.code} — {n.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Cost code" error={fieldErrors.cost_code_id}>
                    <select value={itemForm.cost_code_id} onChange={(e) => setItemForm({ ...itemForm, cost_code_id: e.target.value })}>
                      <option value="">None</option>
                      {(costCodes?.data ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <button type="submit" disabled={createItem.isPending}>
                    Add item
                  </button>
                </form>
              )}

              {can('boq.manage') && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(codeForm, {
                      code: 'Code is required.',
                      name: 'Name is required.',
                    })
                    if (Object.keys(errs).length > 0) {
                      setFieldErrors(errs)
                      return
                    }
                    setFieldErrors({})
                    createCode.mutate()
                  }}
                >
                  <h3>Quick cost code</h3>
                  <FormField label="Code" required error={fieldErrors.code}>
                    <input
                      value={codeForm.code}
                      onChange={(e) => {
                        setCodeForm({ ...codeForm, code: e.target.value })
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
                      value={codeForm.name}
                      onChange={(e) => {
                        setCodeForm({ ...codeForm, name: e.target.value })
                        setFieldErrors((prev) => {
                          const n = { ...prev }
                          delete n.name
                          return n
                        })
                      }}
                    />
                  </FormField>
                  <button type="submit" className="ghost" disabled={createCode.isPending}>
                    Add cost code
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
