import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import * as api from '../../services/api/modulesApi'
import { useAuth } from '../auth/AuthContext'
import {
  FormField,
  getErrorMessage,
  getFieldErrors,
  requireFields,
  useConfirm,
  type FieldErrors,
} from '../../ui'

export function VariationsPanel({ projectId }: { projectId: number }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [form, setForm] = useState({
    variation_no: '',
    title: '',
    description: '',
    reason: '',
    contract_id: '',
    time_impact_days: '0',
  })
  const [itemForm, setItemForm] = useState({ description: '', unit: 'm3', quantity: '', rate: '' })

  const { data: page, isLoading } = useQuery({
    queryKey: ['variations', projectId],
    queryFn: () => api.listVariations(projectId),
    enabled: can('variations.view'),
  })

  const { data: contractsPage } = useQuery({
    queryKey: ['contracts', projectId],
    queryFn: () => api.listContracts(projectId),
    enabled: can('contracts.view') || can('variations.manage'),
  })

  const activeId = selectedId ?? page?.data?.[0]?.id ?? null
  const { data: selected } = useQuery({
    queryKey: ['variation', projectId, activeId],
    queryFn: () => api.getVariation(projectId, activeId!),
    enabled: !!activeId && can('variations.view'),
  })

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['variations', projectId] })
    await qc.invalidateQueries({ queryKey: ['variation', projectId] })
  }

  const onErr = (err: unknown, fallback: string) => {
    setFieldErrors(getFieldErrors(err))
    setError(getErrorMessage(err, fallback))
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createVariation(projectId, {
        ...form,
        contract_id: form.contract_id ? Number(form.contract_id) : null,
        time_impact_days: Number(form.time_impact_days || 0),
      }),
    onSuccess: async (row) => {
      setSelectedId(row.id)
      setForm({ variation_no: '', title: '', description: '', reason: '', contract_id: '', time_impact_days: '0' })
      setError(null)
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to create variation'),
  })

  const addItem = useMutation({
    mutationFn: () =>
      api.createVariationItem(projectId, activeId!, {
        description: itemForm.description,
        unit: itemForm.unit || null,
        quantity: Number(itemForm.quantity || 0),
        rate: Number(itemForm.rate || 0),
      }),
    onSuccess: async () => {
      setItemForm({ description: '', unit: 'm3', quantity: '', rate: '' })
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to add item'),
  })

  const submitMutation = useMutation({
    mutationFn: () => api.submitVariation(projectId, activeId!),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Submit failed'),
  })

  const decideMutation = useMutation({
    mutationFn: (status: string) => api.decideVariation(projectId, activeId!, status),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Decision failed'),
  })

  const rows = page?.data ?? []
  const contracts = contractsPage?.data ?? []
  const editable = selected?.status === 'draft' || selected?.status === 'cost_assessment'

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}
      <div className="grid-2">
        <section className="panel">
          <h2>Variations</h2>
          {isLoading ? (
            <p className="muted">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="muted">No variations yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Title</th>
                  <th>Impact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={activeId === r.id ? 'row-active' : undefined} onClick={() => setSelectedId(r.id)}>
                    <td>{r.variation_no}</td>
                    <td>
                      <strong>{r.title}</strong>
                    </td>
                    <td>{Number(r.cost_impact).toLocaleString()}</td>
                    <td>
                      <span className="badge">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('variations.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(form, {
                  variation_no: 'Number is required.',
                  title: 'Title is required.',
                })
                if (Object.keys(errs).length > 0) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createMutation.mutate()
              }}
            >
              <h3>New variation</h3>
              <FormField label="Number" required error={fieldErrors.variation_no}>
                <input
                  value={form.variation_no}
                  onChange={(e) => {
                    setForm({ ...form, variation_no: e.target.value })
                    setFieldErrors((prev) => {
                      const n = { ...prev }
                      delete n.variation_no
                      return n
                    })
                  }}
                />
              </FormField>
              <FormField label="Title" required error={fieldErrors.title}>
                <input
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value })
                    setFieldErrors((prev) => {
                      const n = { ...prev }
                      delete n.title
                      return n
                    })
                  }}
                />
              </FormField>
              <FormField label="Contract" error={fieldErrors.contract_id}>
                <select value={form.contract_id} onChange={(e) => setForm({ ...form, contract_id: e.target.value })}>
                  <option value="">None</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contract_no}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Time impact (days)" error={fieldErrors.time_impact_days}>
                <input type="number" value={form.time_impact_days} onChange={(e) => setForm({ ...form, time_impact_days: e.target.value })} />
              </FormField>
              <button type="submit" disabled={createMutation.isPending}>
                Create
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="toolbar">
            <h2>Detail</h2>
            {selected && can('variations.manage') && selected.status === 'draft' && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Submit variation?',
                    message: `Submit variation ${selected.variation_no}?`,
                    confirmLabel: 'Submit',
                    danger: false,
                  })
                  if (ok) submitMutation.mutate()
                }}
              >
                Submit
              </button>
            )}
            {selected && can('variations.manage') && selected.status === 'submitted' && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Approve variation?',
                      message: `Approve variation ${selected.variation_no}?`,
                      confirmLabel: 'Approve',
                      danger: false,
                    })
                    if (ok) decideMutation.mutate('approved')
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Reject variation?',
                      message: `Reject variation ${selected.variation_no}?`,
                      confirmLabel: 'Reject',
                      danger: true,
                    })
                    if (ok) decideMutation.mutate('rejected')
                  }}
                >
                  Reject
                </button>
              </>
            )}
          </div>
          {!selected ? (
            <p className="muted">Select or create a variation.</p>
          ) : (
            <>
              <dl className="kv">
                <div>
                  <dt>Number</dt>
                  <dd>{selected.variation_no}</dd>
                </div>
                <div>
                  <dt>Cost impact</dt>
                  <dd>{Number(selected.cost_impact).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Time impact</dt>
                  <dd>{selected.time_impact_days} days</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className="badge">{selected.status}</span>
                  </dd>
                </div>
              </dl>
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
                        {Number(item.quantity)} {item.unit}
                      </td>
                      <td>{Number(item.rate).toLocaleString()}</td>
                      <td>{Number(item.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {can('variations.manage') && editable && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(itemForm, { description: 'Description is required.' })
                    if (Object.keys(errs).length > 0) {
                      setFieldErrors(errs)
                      return
                    }
                    setFieldErrors({})
                    addItem.mutate()
                  }}
                >
                  <h3>Add item</h3>
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
                  <FormField label="Quantity" error={fieldErrors.quantity}>
                    <input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                  </FormField>
                  <FormField label="Rate" error={fieldErrors.rate}>
                    <input type="number" value={itemForm.rate} onChange={(e) => setItemForm({ ...itemForm, rate: e.target.value })} />
                  </FormField>
                  <button type="submit">Add item</button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
