import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import * as api from '../../services/api/modulesApi'
import { useAuth } from '../auth/AuthContext'
import {
  FormField,
  getErrorMessage,
  getFieldErrors,
  requireFields,
  type FieldErrors,
} from '../../ui'

export function ContractsPanel({ projectId }: { projectId: number }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [form, setForm] = useState({
    contract_no: '',
    title: '',
    contract_type: 'main',
    status: 'draft',
    currency: 'AED',
    retention_percent: '10',
    advance_percent: '10',
    start_date: '',
    end_date: '',
    import_boq_id: '',
  })

  const { data: contractsPage, isLoading } = useQuery({
    queryKey: ['contracts', projectId],
    queryFn: () => api.listContracts(projectId),
    enabled: can('contracts.view'),
  })

  const { data: boqsPage } = useQuery({
    queryKey: ['boqs', projectId],
    queryFn: () => api.listBoqs(projectId),
    enabled: can('boq.view') || can('contracts.manage'),
  })

  const activeId = selectedId ?? contractsPage?.data?.[0]?.id ?? null

  const { data: selected } = useQuery({
    queryKey: ['contract', projectId, activeId],
    queryFn: () => api.getContract(projectId, activeId!),
    enabled: !!activeId && can('contracts.view'),
  })

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['contracts', projectId] })
    await qc.invalidateQueries({ queryKey: ['contract', projectId] })
    await qc.invalidateQueries({ queryKey: ['project', projectId] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createContract(projectId, {
        ...form,
        retention_percent: Number(form.retention_percent || 0),
        advance_percent: Number(form.advance_percent || 0),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        import_boq_id: form.import_boq_id ? Number(form.import_boq_id) : null,
      }),
    onSuccess: async (contract) => {
      setForm({
        contract_no: '',
        title: '',
        contract_type: 'main',
        status: 'draft',
        currency: 'AED',
        retention_percent: '10',
        advance_percent: '10',
        start_date: '',
        end_date: '',
        import_boq_id: '',
      })
      setSelectedId(contract.id)
      setError(null)
      setFieldErrors({})
      await invalidate()
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Failed to create contract'))
    },
  })

  const importMutation = useMutation({
    mutationFn: (boqId: number) => api.importBoqIntoContract(projectId, activeId!, boqId),
    onSuccess: async () => invalidate(),
    onError: (err: unknown) => setError(getErrorMessage(err, 'Import failed')),
  })

  const contracts = contractsPage?.data ?? []
  const boqs = boqsPage?.data ?? []

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}

      <div className="grid-2">
        <section className="panel">
          <h2>Contracts</h2>
          {isLoading ? (
            <p className="muted">Loading…</p>
          ) : contracts.length === 0 ? (
            <p className="muted">No contracts yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className={activeId === c.id ? 'row-active' : undefined} onClick={() => setSelectedId(c.id)}>
                    <td>{c.contract_no}</td>
                    <td>
                      <strong>{c.title}</strong>
                      <div className="muted small">{c.status}</div>
                    </td>
                    <td>{c.contract_type}</td>
                    <td>
                      {Number(c.contract_value).toLocaleString()} {c.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('contracts.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(form, {
                  contract_no: 'Contract no is required.',
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
              <h3>New contract</h3>
              <FormField label="Contract no" required error={fieldErrors.contract_no}>
                <input
                  value={form.contract_no}
                  onChange={(e) => {
                    setForm({ ...form, contract_no: e.target.value })
                    setFieldErrors((prev) => {
                      const n = { ...prev }
                      delete n.contract_no
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
              <FormField label="Type" error={fieldErrors.contract_type}>
                <select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
                  <option value="main">Main</option>
                  <option value="subcontract">Subcontract</option>
                  <option value="supply">Supply</option>
                  <option value="consultancy">Consultancy</option>
                </select>
              </FormField>
              <FormField label="Retention %" error={fieldErrors.retention_percent}>
                <input type="number" min="0" max="100" value={form.retention_percent} onChange={(e) => setForm({ ...form, retention_percent: e.target.value })} />
              </FormField>
              <FormField label="Advance %" error={fieldErrors.advance_percent}>
                <input type="number" min="0" max="100" value={form.advance_percent} onChange={(e) => setForm({ ...form, advance_percent: e.target.value })} />
              </FormField>
              <FormField label="Import from BOQ (optional)" error={fieldErrors.import_boq_id}>
                <select value={form.import_boq_id} onChange={(e) => setForm({ ...form, import_boq_id: e.target.value })}>
                  <option value="">None</option>
                  {boqs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} v{b.version} ({b.status})
                    </option>
                  ))}
                </select>
              </FormField>
              <button type="submit" disabled={createMutation.isPending}>
                Create contract
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <h2>Contract detail</h2>
          {!selected ? (
            <p className="muted">Select or create a contract.</p>
          ) : (
            <>
              <dl className="kv">
                <div>
                  <dt>Number</dt>
                  <dd>{selected.contract_no}</dd>
                </div>
                <div>
                  <dt>Title</dt>
                  <dd>{selected.title}</dd>
                </div>
                <div>
                  <dt>Value</dt>
                  <dd>
                    {Number(selected.contract_value).toLocaleString()} {selected.currency}
                  </dd>
                </div>
                <div>
                  <dt>Retention / Advance</dt>
                  <dd>
                    {Number(selected.retention_percent ?? 0)}% / {Number(selected.advance_percent ?? 0)}%
                  </dd>
                </div>
                <div>
                  <dt>Client</dt>
                  <dd>{selected.client?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt>Items</dt>
                  <dd>{selected.items_count ?? selected.items?.length ?? 0}</dd>
                </div>
              </dl>

              {can('contracts.manage') && (
                <div className="toolbar" style={{ marginTop: 12 }}>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        importMutation.mutate(Number(e.target.value))
                        e.target.value = ''
                      }
                    }}
                  >
                    <option value="">Import BOQ items…</option>
                    {boqs.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} v{b.version}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <table className="data-table" style={{ marginTop: 12 }}>
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
            </>
          )}
        </section>
      </div>
    </div>
  )
}
