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

export function SiteDiaryPanel({ projectId }: { projectId: number }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    report_date: today,
    weather: 'Clear',
    temperature_c: '32',
    work_completed: '',
    work_planned: '',
    issues: '',
    delays: '',
  })
  const [labourForm, setLabourForm] = useState({ trade: '', company_name: '', headcount: '1', hours: '8' })
  const [equipForm, setEquipForm] = useState({ equipment_name: '', quantity: '1', hours: '8' })
  const [matForm, setMatForm] = useState({ material_name: '', unit: 'm3', quantity: '' })

  const { data: page, isLoading } = useQuery({
    queryKey: ['site-diaries', projectId],
    queryFn: () => api.listSiteDiaries(projectId),
    enabled: can('site_diary.view'),
  })

  const activeId = selectedId ?? page?.data?.[0]?.id ?? null

  const { data: selected } = useQuery({
    queryKey: ['site-diary', projectId, activeId],
    queryFn: () => api.getSiteDiary(projectId, activeId!),
    enabled: !!activeId && can('site_diary.view'),
  })

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['site-diaries', projectId] })
    await qc.invalidateQueries({ queryKey: ['site-diary', projectId] })
  }

  const onErr = (err: unknown, fallback: string) => {
    setFieldErrors(getFieldErrors(err))
    setError(getErrorMessage(err, fallback))
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createSiteDiary(projectId, {
        ...form,
        temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
      }),
    onSuccess: async (row) => {
      setSelectedId(row.id)
      setError(null)
      setFieldErrors({})
      setForm({ ...form, work_completed: '', work_planned: '', issues: '', delays: '' })
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to create diary'),
  })

  const submitMutation = useMutation({
    mutationFn: () => api.submitSiteDiary(projectId, activeId!),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Submit failed'),
  })

  const approveMutation = useMutation({
    mutationFn: () => api.approveSiteDiary(projectId, activeId!),
    onSuccess: invalidate,
  })

  const addLabour = useMutation({
    mutationFn: () =>
      api.addSiteDiaryLabour(projectId, activeId!, {
        ...labourForm,
        headcount: Number(labourForm.headcount || 0),
        hours: Number(labourForm.hours || 0),
      }),
    onSuccess: async () => {
      setLabourForm({ trade: '', company_name: '', headcount: '1', hours: '8' })
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to add labour'),
  })

  const addEquip = useMutation({
    mutationFn: () =>
      api.addSiteDiaryEquipment(projectId, activeId!, {
        ...equipForm,
        quantity: Number(equipForm.quantity || 0),
        hours: Number(equipForm.hours || 0),
      }),
    onSuccess: async () => {
      setEquipForm({ equipment_name: '', quantity: '1', hours: '8' })
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to add equipment'),
  })

  const addMat = useMutation({
    mutationFn: () =>
      api.addSiteDiaryMaterial(projectId, activeId!, {
        ...matForm,
        quantity: Number(matForm.quantity || 0),
      }),
    onSuccess: async () => {
      setMatForm({ material_name: '', unit: 'm3', quantity: '' })
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to add material'),
  })

  const diaries = page?.data ?? []
  const editable = selected?.status === 'draft'

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}
      <div className="grid-2">
        <section className="panel">
          <h2>Site diaries</h2>
          {isLoading ? (
            <p className="muted">Loading…</p>
          ) : diaries.length === 0 ? (
            <p className="muted">No diary entries yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weather</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {diaries.map((d) => (
                  <tr key={d.id} className={activeId === d.id ? 'row-active' : undefined} onClick={() => setSelectedId(d.id)}>
                    <td>{d.report_date}</td>
                    <td>{d.weather ?? '—'}</td>
                    <td>
                      <span className="badge">{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('site_diary.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(form, { report_date: 'Date is required.' })
                if (Object.keys(errs).length > 0) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createMutation.mutate()
              }}
            >
              <h3>New diary</h3>
              <FormField label="Date" required error={fieldErrors.report_date}>
                <input
                  type="date"
                  value={form.report_date}
                  onChange={(e) => {
                    setForm({ ...form, report_date: e.target.value })
                    setFieldErrors((prev) => {
                      const n = { ...prev }
                      delete n.report_date
                      return n
                    })
                  }}
                />
              </FormField>
              <FormField label="Weather" error={fieldErrors.weather}>
                <input value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} />
              </FormField>
              <FormField label="Temp °C" error={fieldErrors.temperature_c}>
                <input value={form.temperature_c} onChange={(e) => setForm({ ...form, temperature_c: e.target.value })} />
              </FormField>
              <FormField label="Work completed" error={fieldErrors.work_completed}>
                <textarea value={form.work_completed} onChange={(e) => setForm({ ...form, work_completed: e.target.value })} rows={2} />
              </FormField>
              <FormField label="Work planned" error={fieldErrors.work_planned}>
                <textarea value={form.work_planned} onChange={(e) => setForm({ ...form, work_planned: e.target.value })} rows={2} />
              </FormField>
              <button type="submit" disabled={createMutation.isPending}>
                Create diary
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="toolbar">
            <h2>Diary detail</h2>
            {selected && can('site_diary.manage') && editable && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Submit site diary?',
                    message: `Submit diary for ${selected.report_date}?`,
                    confirmLabel: 'Submit',
                    danger: false,
                  })
                  if (ok) submitMutation.mutate()
                }}
              >
                Submit
              </button>
            )}
            {selected && can('site_diary.manage') && selected.status === 'submitted' && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Approve site diary?',
                    message: `Approve diary for ${selected.report_date}?`,
                    confirmLabel: 'Approve',
                    danger: false,
                  })
                  if (ok) approveMutation.mutate()
                }}
              >
                Approve
              </button>
            )}
          </div>

          {!selected ? (
            <p className="muted">Select or create a diary.</p>
          ) : (
            <>
              <dl className="kv">
                <div>
                  <dt>Date</dt>
                  <dd>{selected.report_date}</dd>
                </div>
                <div>
                  <dt>Weather / Temp</dt>
                  <dd>
                    {selected.weather ?? '—'} / {selected.temperature_c ?? '—'}°C
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className="badge">{selected.status}</span>
                  </dd>
                </div>
              </dl>
              <p className="muted small" style={{ whiteSpace: 'pre-wrap' }}>
                {selected.work_completed || 'No work completed notes.'}
              </p>

              <h3>Labour</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trade</th>
                    <th>Headcount</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.labours ?? []).map((r) => (
                    <tr key={r.id}>
                      <td>{r.trade}</td>
                      <td>{r.headcount}</td>
                      <td>{Number(r.hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3>Equipment</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Qty</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.equipment ?? []).map((r) => (
                    <tr key={r.id}>
                      <td>{r.equipment_name}</td>
                      <td>{r.quantity}</td>
                      <td>{Number(r.hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3>Materials</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Qty</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.materials ?? []).map((r) => (
                    <tr key={r.id}>
                      <td>{r.material_name}</td>
                      <td>{Number(r.quantity)}</td>
                      <td>{r.unit ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {can('site_diary.manage') && editable && (
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <form
                    onSubmit={(e: FormEvent) => {
                      e.preventDefault()
                      setError(null)
                      const errs = requireFields(labourForm, { trade: 'Trade is required.' })
                      if (Object.keys(errs).length > 0) {
                        setFieldErrors(errs)
                        return
                      }
                      setFieldErrors({})
                      addLabour.mutate()
                    }}
                  >
                    <h3>Add labour</h3>
                    <FormField label="Trade" required error={fieldErrors.trade}>
                      <input
                        value={labourForm.trade}
                        onChange={(e) => {
                          setLabourForm({ ...labourForm, trade: e.target.value })
                          setFieldErrors((prev) => {
                            const n = { ...prev }
                            delete n.trade
                            return n
                          })
                        }}
                      />
                    </FormField>
                    <FormField label="Headcount" error={fieldErrors.headcount}>
                      <input type="number" min="0" value={labourForm.headcount} onChange={(e) => setLabourForm({ ...labourForm, headcount: e.target.value })} />
                    </FormField>
                    <button type="submit">Add labour</button>
                  </form>
                  <form
                    onSubmit={(e: FormEvent) => {
                      e.preventDefault()
                      setError(null)
                      const errs = requireFields(equipForm, { equipment_name: 'Name is required.' })
                      if (Object.keys(errs).length > 0) {
                        setFieldErrors(errs)
                        return
                      }
                      setFieldErrors({})
                      addEquip.mutate()
                    }}
                  >
                    <h3>Add equipment</h3>
                    <FormField label="Name" required error={fieldErrors.equipment_name}>
                      <input
                        value={equipForm.equipment_name}
                        onChange={(e) => {
                          setEquipForm({ ...equipForm, equipment_name: e.target.value })
                          setFieldErrors((prev) => {
                            const n = { ...prev }
                            delete n.equipment_name
                            return n
                          })
                        }}
                      />
                    </FormField>
                    <FormField label="Quantity" error={fieldErrors.quantity}>
                      <input type="number" min="0" value={equipForm.quantity} onChange={(e) => setEquipForm({ ...equipForm, quantity: e.target.value })} />
                    </FormField>
                    <button type="submit">Add equipment</button>
                  </form>
                  <form
                    onSubmit={(e: FormEvent) => {
                      e.preventDefault()
                      setError(null)
                      const errs = requireFields(matForm, { material_name: 'Name is required.' })
                      if (Object.keys(errs).length > 0) {
                        setFieldErrors(errs)
                        return
                      }
                      setFieldErrors({})
                      addMat.mutate()
                    }}
                  >
                    <h3>Add material</h3>
                    <FormField label="Name" required error={fieldErrors.material_name}>
                      <input
                        value={matForm.material_name}
                        onChange={(e) => {
                          setMatForm({ ...matForm, material_name: e.target.value })
                          setFieldErrors((prev) => {
                            const n = { ...prev }
                            delete n.material_name
                            return n
                          })
                        }}
                      />
                    </FormField>
                    <FormField label="Quantity" error={fieldErrors.quantity}>
                      <input type="number" min="0" step="0.0001" value={matForm.quantity} onChange={(e) => setMatForm({ ...matForm, quantity: e.target.value })} />
                    </FormField>
                    <button type="submit">Add material</button>
                  </form>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
