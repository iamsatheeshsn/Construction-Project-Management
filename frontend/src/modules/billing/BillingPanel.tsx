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

export function BillingPanel({ projectId }: { projectId: number }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [appForm, setAppForm] = useState({
    application_no: '',
    contract_id: '',
    period_start: '',
    period_end: '',
    advance_recovery: '0',
  })
  const [itemForm, setItemForm] = useState({ description: '', previous_amount: '0', this_period_amount: '' })
  const [certNo, setCertNo] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [payForm, setPayForm] = useState({ payment_date: new Date().toISOString().slice(0, 10), amount: '', method: 'bank_transfer', reference: '' })

  const { data: appsPage, isLoading } = useQuery({
    queryKey: ['payment-applications', projectId],
    queryFn: () => api.listPaymentApplications(projectId),
    enabled: can('billing.view'),
  })

  const { data: invoicesPage } = useQuery({
    queryKey: ['invoices', projectId],
    queryFn: () => api.listInvoices(projectId),
    enabled: can('billing.view'),
  })

  const { data: contractsPage } = useQuery({
    queryKey: ['contracts', projectId],
    queryFn: () => api.listContracts(projectId),
    enabled: can('contracts.view') || can('billing.manage'),
  })

  const activeId = selectedId ?? appsPage?.data?.[0]?.id ?? null
  const { data: selected } = useQuery({
    queryKey: ['payment-application', projectId, activeId],
    queryFn: () => api.getPaymentApplication(projectId, activeId!),
    enabled: !!activeId && can('billing.view'),
  })

  const activeInvoiceId = selectedInvoiceId ?? invoicesPage?.data?.[0]?.id ?? null
  const { data: selectedInvoice } = useQuery({
    queryKey: ['invoice', projectId, activeInvoiceId],
    queryFn: () => api.getInvoice(projectId, activeInvoiceId!),
    enabled: !!activeInvoiceId && can('billing.view'),
  })

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['payment-applications', projectId] }),
      qc.invalidateQueries({ queryKey: ['payment-application', projectId] }),
      qc.invalidateQueries({ queryKey: ['invoices', projectId] }),
      qc.invalidateQueries({ queryKey: ['invoice', projectId] }),
    ])
  }

  const onErr = (err: unknown, fallback: string) => {
    setFieldErrors(getFieldErrors(err))
    setError(getErrorMessage(err, fallback))
  }

  const createApp = useMutation({
    mutationFn: () =>
      api.createPaymentApplication(projectId, {
        ...appForm,
        contract_id: appForm.contract_id ? Number(appForm.contract_id) : null,
        period_start: appForm.period_start || null,
        period_end: appForm.period_end || null,
        advance_recovery: Number(appForm.advance_recovery || 0),
      }),
    onSuccess: async (row) => {
      setSelectedId(row.id)
      setAppForm({ application_no: '', contract_id: '', period_start: '', period_end: '', advance_recovery: '0' })
      setError(null)
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to create application'),
  })

  const addItem = useMutation({
    mutationFn: () =>
      api.createPaymentApplicationItem(projectId, activeId!, {
        description: itemForm.description,
        previous_amount: Number(itemForm.previous_amount || 0),
        this_period_amount: Number(itemForm.this_period_amount || 0),
      }),
    onSuccess: async () => {
      setItemForm({ description: '', previous_amount: '0', this_period_amount: '' })
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Failed to add item'),
  })

  const submitApp = useMutation({
    mutationFn: () => api.submitPaymentApplication(projectId, activeId!),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Submit failed'),
  })

  const certify = useMutation({
    mutationFn: () => api.certifyPaymentApplication(projectId, activeId!, { certificate_no: certNo }),
    onSuccess: async () => {
      setCertNo('')
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Certify failed'),
  })

  const createInvoice = useMutation({
    mutationFn: () =>
      api.createInvoice(projectId, {
        payment_certificate_id: selected!.certificate!.id,
        invoice_no: invoiceNo,
      }),
    onSuccess: async (inv) => {
      setInvoiceNo('')
      setSelectedInvoiceId(inv.id)
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Invoice failed'),
  })

  const recordPay = useMutation({
    mutationFn: () =>
      api.recordInvoicePayment(projectId, activeInvoiceId!, {
        ...payForm,
        amount: Number(payForm.amount || 0),
      }),
    onSuccess: async () => {
      setPayForm({ ...payForm, amount: '', reference: '' })
      setFieldErrors({})
      await invalidate()
    },
    onError: (err) => onErr(err, 'Payment failed'),
  })

  const apps = appsPage?.data ?? []
  const invoices = invoicesPage?.data ?? []
  const contracts = contractsPage?.data ?? []

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}
      <div className="grid-2">
        <section className="panel">
          <h2>Payment applications</h2>
          {isLoading ? (
            <p className="muted">Loading…</p>
          ) : apps.length === 0 ? (
            <p className="muted">No applications yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Net</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} className={activeId === a.id ? 'row-active' : undefined} onClick={() => setSelectedId(a.id)}>
                    <td>{a.application_no}</td>
                    <td>{Number(a.net_amount).toLocaleString()}</td>
                    <td>
                      <span className="badge">{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('billing.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(appForm, { application_no: 'Number is required.' })
                if (Object.keys(errs).length > 0) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createApp.mutate()
              }}
            >
              <h3>New application</h3>
              <FormField label="Number" required error={fieldErrors.application_no}>
                <input
                  value={appForm.application_no}
                  onChange={(e) => {
                    setAppForm({ ...appForm, application_no: e.target.value })
                    setFieldErrors((prev) => {
                      const n = { ...prev }
                      delete n.application_no
                      return n
                    })
                  }}
                />
              </FormField>
              <FormField label="Contract" error={fieldErrors.contract_id}>
                <select value={appForm.contract_id} onChange={(e) => setAppForm({ ...appForm, contract_id: e.target.value })}>
                  <option value="">Auto</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contract_no}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Period start" error={fieldErrors.period_start}>
                <input type="date" value={appForm.period_start} onChange={(e) => setAppForm({ ...appForm, period_start: e.target.value })} />
              </FormField>
              <FormField label="Period end" error={fieldErrors.period_end}>
                <input type="date" value={appForm.period_end} onChange={(e) => setAppForm({ ...appForm, period_end: e.target.value })} />
              </FormField>
              <button type="submit" disabled={createApp.isPending}>
                Create
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="toolbar">
            <h2>Application detail</h2>
            {selected && can('billing.manage') && selected.status === 'draft' && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Submit payment application?',
                    message: `Submit application ${selected.application_no}?`,
                    confirmLabel: 'Submit',
                    danger: false,
                  })
                  if (ok) submitApp.mutate()
                }}
              >
                Submit
              </button>
            )}
          </div>
          {!selected ? (
            <p className="muted">Select or create an application.</p>
          ) : (
            <>
              <dl className="kv">
                <div>
                  <dt>Gross / Retention / Net</dt>
                  <dd>
                    {Number(selected.gross_amount).toLocaleString()} / {Number(selected.retention_amount).toLocaleString()} /{' '}
                    {Number(selected.net_amount).toLocaleString()}
                  </dd>
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
                    <th>Previous</th>
                    <th>This period</th>
                    <th>Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{Number(item.previous_amount).toLocaleString()}</td>
                      <td>{Number(item.this_period_amount).toLocaleString()}</td>
                      <td>{Number(item.cumulative_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {can('billing.manage') && selected.status === 'draft' && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(itemForm, {
                      description: 'Description is required.',
                      this_period_amount: 'This period amount is required.',
                    })
                    if (Object.keys(errs).length > 0) {
                      setFieldErrors(errs)
                      return
                    }
                    setFieldErrors({})
                    addItem.mutate()
                  }}
                >
                  <h3>Add line</h3>
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
                  <FormField label="This period" required error={fieldErrors.this_period_amount}>
                    <input
                      type="number"
                      value={itemForm.this_period_amount}
                      onChange={(e) => {
                        setItemForm({ ...itemForm, this_period_amount: e.target.value })
                        setFieldErrors((prev) => {
                          const n = { ...prev }
                          delete n.this_period_amount
                          return n
                        })
                      }}
                    />
                  </FormField>
                  <button type="submit">Add</button>
                </form>
              )}

              {can('billing.manage') && selected.status === 'submitted' && !selected.certificate && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(
                      { certificate_no: certNo },
                      { certificate_no: 'Certificate no is required.' },
                    )
                    if (Object.keys(errs).length > 0) {
                      setFieldErrors(errs)
                      return
                    }
                    setFieldErrors({})
                    certify.mutate()
                  }}
                >
                  <h3>Certify</h3>
                  <FormField label="Certificate no" required error={fieldErrors.certificate_no}>
                    <input
                      value={certNo}
                      onChange={(e) => {
                        setCertNo(e.target.value)
                        setFieldErrors((prev) => {
                          const n = { ...prev }
                          delete n.certificate_no
                          return n
                        })
                      }}
                    />
                  </FormField>
                  <button type="submit">Issue certificate</button>
                </form>
              )}

              {selected.certificate && (
                <div style={{ marginTop: 12 }}>
                  <p className="muted small">
                    Certificate {selected.certificate.certificate_no}: {Number(selected.certificate.certified_amount).toLocaleString()}
                  </p>
                  {can('billing.manage') && !selected.certificate.invoice && (
                    <form
                      className="form-grid"
                      onSubmit={(e: FormEvent) => {
                        e.preventDefault()
                        setError(null)
                        const errs = requireFields(
                          { invoice_no: invoiceNo },
                          { invoice_no: 'Invoice no is required.' },
                        )
                        if (Object.keys(errs).length > 0) {
                          setFieldErrors(errs)
                          return
                        }
                        setFieldErrors({})
                        createInvoice.mutate()
                      }}
                    >
                      <h3>Create invoice</h3>
                      <FormField label="Invoice no" required error={fieldErrors.invoice_no}>
                        <input
                          value={invoiceNo}
                          onChange={(e) => {
                            setInvoiceNo(e.target.value)
                            setFieldErrors((prev) => {
                              const n = { ...prev }
                              delete n.invoice_no
                              return n
                            })
                          }}
                        />
                      </FormField>
                      <button type="submit">Create invoice</button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>Invoices</h2>
          {invoices.length === 0 ? (
            <p className="muted">No invoices yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className={activeInvoiceId === inv.id ? 'row-active' : undefined} onClick={() => setSelectedInvoiceId(inv.id)}>
                    <td>{inv.invoice_no}</td>
                    <td>
                      {Number(inv.total_amount).toLocaleString()} {inv.currency}
                    </td>
                    <td>{Number(inv.amount_paid).toLocaleString()}</td>
                    <td>
                      <span className="badge">{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <h2>Invoice detail</h2>
          {!selectedInvoice ? (
            <p className="muted">Select an invoice.</p>
          ) : (
            <>
              <dl className="kv">
                <div>
                  <dt>Invoice</dt>
                  <dd>{selectedInvoice.invoice_no}</dd>
                </div>
                <div>
                  <dt>Balance</dt>
                  <dd>{(Number(selectedInvoice.total_amount) - Number(selectedInvoice.amount_paid)).toLocaleString()}</dd>
                </div>
              </dl>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.payments ?? []).map((p) => (
                    <tr key={p.id}>
                      <td>{p.payment_date}</td>
                      <td>{Number(p.amount).toLocaleString()}</td>
                      <td>{p.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {can('billing.manage') && selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'void' && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(payForm, {
                      payment_date: 'Date is required.',
                      amount: 'Amount is required.',
                    })
                    if (Object.keys(errs).length > 0) {
                      setFieldErrors(errs)
                      return
                    }
                    setFieldErrors({})
                    recordPay.mutate()
                  }}
                >
                  <h3>Record payment</h3>
                  <FormField label="Date" required error={fieldErrors.payment_date}>
                    <input
                      type="date"
                      value={payForm.payment_date}
                      onChange={(e) => {
                        setPayForm({ ...payForm, payment_date: e.target.value })
                        setFieldErrors((prev) => {
                          const n = { ...prev }
                          delete n.payment_date
                          return n
                        })
                      }}
                    />
                  </FormField>
                  <FormField label="Amount" required error={fieldErrors.amount}>
                    <input
                      type="number"
                      value={payForm.amount}
                      onChange={(e) => {
                        setPayForm({ ...payForm, amount: e.target.value })
                        setFieldErrors((prev) => {
                          const n = { ...prev }
                          delete n.amount
                          return n
                        })
                      }}
                    />
                  </FormField>
                  <FormField label="Method" error={fieldErrors.method}>
                    <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </FormField>
                  <button type="submit">Record</button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
