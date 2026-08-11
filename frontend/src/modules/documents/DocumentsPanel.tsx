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

export function DocumentsPanel({ projectId }: { projectId: number }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [form, setForm] = useState({
    title: '',
    document_no: '',
    document_type: 'drawing',
    change_notes: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [versionNotes, setVersionNotes] = useState('')

  const { data: page, isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => api.listDocuments(projectId),
    enabled: can('documents.view'),
  })

  const activeId = selectedId ?? page?.data?.[0]?.id ?? null

  const { data: selected } = useQuery({
    queryKey: ['document', projectId, activeId],
    queryFn: () => api.getDocument(projectId, activeId!),
    enabled: !!activeId && can('documents.view'),
  })

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['documents', projectId] })
    await qc.invalidateQueries({ queryKey: ['document', projectId] })
  }

  const onErr = (err: unknown, fallback: string) => {
    setFieldErrors(getFieldErrors(err))
    setError(getErrorMessage(err, fallback))
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('title', form.title)
      if (form.document_no) fd.append('document_no', form.document_no)
      fd.append('document_type', form.document_type)
      if (form.change_notes) fd.append('change_notes', form.change_notes)
      if (file) fd.append('file', file)
      return api.createDocument(projectId, fd)
    },
    onSuccess: async (doc) => {
      setForm({ title: '', document_no: '', document_type: 'drawing', change_notes: '' })
      setFile(null)
      setSelectedId(doc.id)
      setError(null)
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to create document'),
  })

  const uploadVersion = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('file', versionFile!)
      if (versionNotes) fd.append('change_notes', versionNotes)
      return api.uploadDocumentVersion(projectId, activeId!, fd)
    },
    onSuccess: async () => {
      setVersionFile(null)
      setVersionNotes('')
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Upload failed'),
  })

  const approveMutation = useMutation({
    mutationFn: () => api.approveDocument(projectId, activeId!),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Approve failed'),
  })

  const docs = page?.data ?? []

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}
      <div className="grid-2">
        <section className="panel">
          <h2>Documents</h2>
          {isLoading ? (
            <p className="muted">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="muted">No documents yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Ver</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className={activeId === d.id ? 'row-active' : undefined} onClick={() => setSelectedId(d.id)}>
                    <td>
                      <strong>{d.title}</strong>
                      {d.document_no && <div className="muted small">{d.document_no}</div>}
                    </td>
                    <td>{d.document_type}</td>
                    <td>{d.current_version}</td>
                    <td>
                      <span className="badge">{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('documents.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(form, { title: 'Title is required.' })
                if (Object.keys(errs).length > 0) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createMutation.mutate()
              }}
            >
              <h3>Upload document</h3>
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
              <FormField label="Document no" error={fieldErrors.document_no}>
                <input value={form.document_no} onChange={(e) => setForm({ ...form, document_no: e.target.value })} />
              </FormField>
              <FormField label="Type" error={fieldErrors.document_type}>
                <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
                  <option value="drawing">Drawing</option>
                  <option value="contract">Contract</option>
                  <option value="report">Report</option>
                  <option value="photo">Photo</option>
                  <option value="certificate">Certificate</option>
                  <option value="rfi">RFI</option>
                  <option value="submittal">Submittal</option>
                  <option value="variation">Variation</option>
                  <option value="other">Other</option>
                </select>
              </FormField>
              <FormField label="File" error={fieldErrors.file}>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </FormField>
              <button type="submit" disabled={createMutation.isPending}>
                Create
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="toolbar">
            <h2>Document detail</h2>
            {selected && can('documents.manage') && selected.status !== 'approved' && selected.current_version > 0 && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Approve document?',
                    message: `Approve “${selected.title}”?`,
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
            <p className="muted">Select or upload a document.</p>
          ) : (
            <>
              <dl className="kv">
                <div>
                  <dt>Title</dt>
                  <dd>{selected.title}</dd>
                </div>
                <div>
                  <dt>Type / Status</dt>
                  <dd>
                    {selected.document_type} · {selected.status}
                  </dd>
                </div>
                <div>
                  <dt>Current version</dt>
                  <dd>{selected.current_version}</dd>
                </div>
              </dl>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ver</th>
                    <th>File</th>
                    <th>Size</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.versions ?? []).map((v) => (
                    <tr key={v.id}>
                      <td>v{v.version_no}</td>
                      <td>{v.file_name}</td>
                      <td>{v.file_size ? `${Math.round(v.file_size / 1024)} KB` : '—'}</td>
                      <td>{v.change_notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {can('documents.manage') && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    if (!versionFile) {
                      setFieldErrors({ file: 'File is required.' })
                      return
                    }
                    setFieldErrors({})
                    uploadVersion.mutate()
                  }}
                >
                  <h3>New version</h3>
                  <FormField label="File" required error={fieldErrors.file}>
                    <input
                      type="file"
                      onChange={(e) => {
                        setVersionFile(e.target.files?.[0] ?? null)
                        setFieldErrors((prev) => {
                          const n = { ...prev }
                          delete n.file
                          return n
                        })
                      }}
                    />
                  </FormField>
                  <FormField label="Change notes" error={fieldErrors.change_notes}>
                    <input value={versionNotes} onChange={(e) => setVersionNotes(e.target.value)} />
                  </FormField>
                  <button type="submit" disabled={uploadVersion.isPending || !versionFile}>
                    Upload version
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
