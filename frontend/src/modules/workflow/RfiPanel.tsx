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

export function RfiPanel({ projectId }: { projectId: number }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [form, setForm] = useState({
    rfi_no: '',
    subject: '',
    description: '',
    discipline: 'structural',
    priority: 'medium',
    due_date: '',
    attach_document_id: '',
  })
  const [responseText, setResponseText] = useState('')

  const { data: page, isLoading } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => api.listRfis(projectId),
    enabled: can('rfis.view'),
  })

  const { data: docsPage } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => api.listDocuments(projectId),
    enabled: can('documents.view') || can('rfis.manage'),
  })

  const activeId = selectedId ?? page?.data?.[0]?.id ?? null

  const { data: selected } = useQuery({
    queryKey: ['rfi', projectId, activeId],
    queryFn: () => api.getRfi(projectId, activeId!),
    enabled: !!activeId && can('rfis.view'),
  })

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['rfis', projectId] })
    await qc.invalidateQueries({ queryKey: ['rfi', projectId] })
  }

  const onErr = (err: unknown, fallback: string) => {
    setFieldErrors(getFieldErrors(err))
    setError(getErrorMessage(err, fallback))
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const rfi = await api.createRfi(projectId, {
        rfi_no: form.rfi_no,
        subject: form.subject,
        description: form.description || null,
        discipline: form.discipline || null,
        priority: form.priority,
        due_date: form.due_date || null,
      })
      if (form.attach_document_id) {
        await api.attachRfiDocument(projectId, rfi.id, Number(form.attach_document_id))
      }
      return rfi
    },
    onSuccess: async (rfi) => {
      setForm({
        rfi_no: '',
        subject: '',
        description: '',
        discipline: 'structural',
        priority: 'medium',
        due_date: '',
        attach_document_id: '',
      })
      setSelectedId(rfi.id)
      setError(null)
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to create RFI'),
  })

  const submitMutation = useMutation({
    mutationFn: () => api.submitRfi(projectId, activeId!),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Submit failed'),
  })

  const respondMutation = useMutation({
    mutationFn: () => api.respondRfi(projectId, activeId!, responseText),
    onSuccess: async () => {
      setResponseText('')
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Response failed'),
  })

  const closeMutation = useMutation({
    mutationFn: () => api.closeRfi(projectId, activeId!),
    onSuccess: invalidate,
  })

  const attachMutation = useMutation({
    mutationFn: (documentId: number) => api.attachRfiDocument(projectId, activeId!, documentId),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Attach failed'),
  })

  const rfis = page?.data ?? []
  const docs = docsPage?.data ?? []

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}
      <div className="grid-2">
        <section className="panel">
          <h2>RFIs</h2>
          {isLoading ? (
            <p className="muted">Loading…</p>
          ) : rfis.length === 0 ? (
            <p className="muted">No RFIs yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rfis.map((r) => (
                  <tr key={r.id} className={activeId === r.id ? 'row-active' : undefined} onClick={() => setSelectedId(r.id)}>
                    <td>{r.rfi_no}</td>
                    <td>
                      <strong>{r.subject}</strong>
                    </td>
                    <td>{r.priority}</td>
                    <td>
                      <span className="badge">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('rfis.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(form, {
                  rfi_no: 'RFI no is required.',
                  subject: 'Subject is required.',
                })
                if (Object.keys(errs).length > 0) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createMutation.mutate()
              }}
            >
              <h3>New RFI</h3>
              <FormField label="RFI no" required error={fieldErrors.rfi_no}>
                <input
                  value={form.rfi_no}
                  onChange={(e) => {
                    setForm({ ...form, rfi_no: e.target.value })
                    setFieldErrors((prev) => {
                      const n = { ...prev }
                      delete n.rfi_no
                      return n
                    })
                  }}
                />
              </FormField>
              <FormField label="Subject" required error={fieldErrors.subject}>
                <input
                  value={form.subject}
                  onChange={(e) => {
                    setForm({ ...form, subject: e.target.value })
                    setFieldErrors((prev) => {
                      const n = { ...prev }
                      delete n.subject
                      return n
                    })
                  }}
                />
              </FormField>
              <FormField label="Description" error={fieldErrors.description}>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </FormField>
              <FormField label="Priority" error={fieldErrors.priority}>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </FormField>
              <FormField label="Due date" error={fieldErrors.due_date}>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </FormField>
              <FormField label="Attach document" error={fieldErrors.attach_document_id}>
                <select value={form.attach_document_id} onChange={(e) => setForm({ ...form, attach_document_id: e.target.value })}>
                  <option value="">None</option>
                  {docs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </FormField>
              <button type="submit" disabled={createMutation.isPending}>
                Create RFI
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="toolbar">
            <h2>RFI detail</h2>
            {selected && can('rfis.manage') && selected.status === 'draft' && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Submit RFI?',
                    message: `Submit RFI ${selected.rfi_no}?`,
                    confirmLabel: 'Submit',
                    danger: false,
                  })
                  if (ok) submitMutation.mutate()
                }}
              >
                Submit
              </button>
            )}
            {selected && can('rfis.manage') && selected.status !== 'closed' && selected.status !== 'draft' && (
              <button
                type="button"
                className="ghost"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Close RFI?',
                    message: `Close RFI ${selected.rfi_no}?`,
                    confirmLabel: 'Close',
                    danger: true,
                  })
                  if (ok) closeMutation.mutate()
                }}
              >
                Close
              </button>
            )}
          </div>

          {!selected ? (
            <p className="muted">Select or create an RFI.</p>
          ) : (
            <>
              <dl className="kv">
                <div>
                  <dt>Number</dt>
                  <dd>{selected.rfi_no}</dd>
                </div>
                <div>
                  <dt>Subject</dt>
                  <dd>{selected.subject}</dd>
                </div>
                <div>
                  <dt>Status / Priority</dt>
                  <dd>
                    {selected.status} · {selected.priority}
                  </dd>
                </div>
                <div>
                  <dt>Due</dt>
                  <dd>{selected.due_date ?? '—'}</dd>
                </div>
              </dl>
              <p className="muted small" style={{ whiteSpace: 'pre-wrap' }}>
                {selected.description || 'No description.'}
              </p>

              <h3>Attachments</h3>
              <ul className="muted">
                {(selected.attachments ?? []).length === 0 && <li>None</li>}
                {(selected.attachments ?? []).map((a) => (
                  <li key={a.id}>{a.document?.title ?? `Document #${a.document_id}`}</li>
                ))}
              </ul>

              {can('rfis.manage') && selected.status !== 'closed' && (
                <div className="toolbar" style={{ marginTop: 8 }}>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        attachMutation.mutate(Number(e.target.value))
                        e.target.value = ''
                      }
                    }}
                  >
                    <option value="">Attach document…</option>
                    {docs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <h3>Responses</h3>
              <div className="stack">
                {(selected.responses ?? []).map((r) => (
                  <div key={r.id} className="panel" style={{ padding: 12 }}>
                    <div className="muted small">{r.responder?.name ?? 'User'} · {r.created_at}</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{r.response_text}</div>
                  </div>
                ))}
              </div>

              {can('rfis.manage') && !['draft', 'closed'].includes(selected.status) && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(
                      { response_text: responseText },
                      { response_text: 'Response is required.' },
                    )
                    if (Object.keys(errs).length > 0) {
                      setFieldErrors(errs)
                      return
                    }
                    setFieldErrors({})
                    respondMutation.mutate()
                  }}
                >
                  <h3>Add response</h3>
                  <FormField label="Response" required error={fieldErrors.response_text}>
                    <textarea
                      rows={3}
                      value={responseText}
                      onChange={(e) => {
                        setResponseText(e.target.value)
                        setFieldErrors((prev) => {
                          const n = { ...prev }
                          delete n.response_text
                          return n
                        })
                      }}
                    />
                  </FormField>
                  <button type="submit" disabled={respondMutation.isPending}>
                    Post response
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
