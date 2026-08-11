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

export function SubmittalsPanel({ projectId }: { projectId: number }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [form, setForm] = useState({
    submittal_no: '',
    title: '',
    description: '',
    submittal_type: 'material',
    due_date: '',
    document_id: '',
  })
  const [reviewStatus, setReviewStatus] = useState('approved')
  const [reviewComments, setReviewComments] = useState('')

  const { data: page, isLoading } = useQuery({
    queryKey: ['submittals', projectId],
    queryFn: () => api.listSubmittals(projectId),
    enabled: can('submittals.view'),
  })

  const { data: docsPage } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => api.listDocuments(projectId),
    enabled: can('documents.view') || can('submittals.manage'),
  })

  const activeId = selectedId ?? page?.data?.[0]?.id ?? null
  const { data: selected } = useQuery({
    queryKey: ['submittal', projectId, activeId],
    queryFn: () => api.getSubmittal(projectId, activeId!),
    enabled: !!activeId && can('submittals.view'),
  })

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['submittals', projectId] })
    await qc.invalidateQueries({ queryKey: ['submittal', projectId] })
  }

  const onErr = (err: unknown, fallback: string) => {
    setFieldErrors(getFieldErrors(err))
    setError(getErrorMessage(err, fallback))
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const row = await api.createSubmittal(projectId, {
        submittal_no: form.submittal_no,
        title: form.title,
        description: form.description || null,
        submittal_type: form.submittal_type,
        due_date: form.due_date || null,
      })
      if (form.document_id) await api.attachSubmittalDocument(projectId, row.id, Number(form.document_id))
      return row
    },
    onSuccess: async (row) => {
      setSelectedId(row.id)
      setForm({ submittal_no: '', title: '', description: '', submittal_type: 'material', due_date: '', document_id: '' })
      setError(null)
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to create submittal'),
  })

  const submitMutation = useMutation({
    mutationFn: () => api.submitSubmittal(projectId, activeId!),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Submit failed'),
  })

  const reviewMutation = useMutation({
    mutationFn: () => api.reviewSubmittal(projectId, activeId!, { status: reviewStatus, review_comments: reviewComments || null }),
    onSuccess: async () => {
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Review failed'),
  })

  const rows = page?.data ?? []
  const docs = docsPage?.data ?? []

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}
      <div className="grid-2">
        <section className="panel">
          <h2>Submittals</h2>
          {isLoading ? (
            <p className="muted">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="muted">No submittals yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={activeId === r.id ? 'row-active' : undefined} onClick={() => setSelectedId(r.id)}>
                    <td>{r.submittal_no}</td>
                    <td>
                      <strong>{r.title}</strong>
                    </td>
                    <td>{r.submittal_type}</td>
                    <td>
                      <span className="badge">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('submittals.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(form, {
                  submittal_no: 'Number is required.',
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
              <h3>New submittal</h3>
              <FormField label="Number" required error={fieldErrors.submittal_no}>
                <input
                  value={form.submittal_no}
                  onChange={(e) => {
                    setForm({ ...form, submittal_no: e.target.value })
                    setFieldErrors((prev) => {
                      const n = { ...prev }
                      delete n.submittal_no
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
              <FormField label="Type" error={fieldErrors.submittal_type}>
                <select value={form.submittal_type} onChange={(e) => setForm({ ...form, submittal_type: e.target.value })}>
                  <option value="material">Material</option>
                  <option value="shop_drawing">Shop drawing</option>
                  <option value="sample">Sample</option>
                  <option value="technical">Technical</option>
                  <option value="other">Other</option>
                </select>
              </FormField>
              <FormField label="Attach document" error={fieldErrors.document_id}>
                <select value={form.document_id} onChange={(e) => setForm({ ...form, document_id: e.target.value })}>
                  <option value="">None</option>
                  {docs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
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
            {selected && can('submittals.manage') && selected.status === 'draft' && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Submit submittal?',
                    message: `Submit submittal ${selected.submittal_no}?`,
                    confirmLabel: 'Submit',
                    danger: false,
                  })
                  if (ok) submitMutation.mutate()
                }}
              >
                Submit
              </button>
            )}
          </div>
          {!selected ? (
            <p className="muted">Select or create a submittal.</p>
          ) : (
            <>
              <dl className="kv">
                <div>
                  <dt>Number</dt>
                  <dd>{selected.submittal_no}</dd>
                </div>
                <div>
                  <dt>Title</dt>
                  <dd>{selected.title}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className="badge">{selected.status}</span>
                  </dd>
                </div>
              </dl>
              <p className="muted small">{selected.description || 'No description.'}</p>
              <h3>Attachments</h3>
              <ul className="muted">
                {(selected.attachments ?? []).length === 0 && <li>None</li>}
                {(selected.attachments ?? []).map((a) => (
                  <li key={a.id}>{a.document?.title ?? `Doc #${a.document_id}`}</li>
                ))}
              </ul>
              {can('submittals.manage') && ['submitted', 'consultant_review'].includes(selected.status) && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    reviewMutation.mutate()
                  }}
                >
                  <h3>Review</h3>
                  <FormField label="Decision" error={fieldErrors.status}>
                    <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                      <option value="approved">Approved</option>
                      <option value="approved_with_comments">Approved with comments</option>
                      <option value="rejected">Rejected</option>
                      <option value="consultant_review">Consultant review</option>
                    </select>
                  </FormField>
                  <FormField label="Comments" error={fieldErrors.review_comments}>
                    <textarea rows={2} value={reviewComments} onChange={(e) => setReviewComments(e.target.value)} />
                  </FormField>
                  <button type="submit">Save review</button>
                </form>
              )}
              {selected.review_comments && <p className="muted small">Review: {selected.review_comments}</p>}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
