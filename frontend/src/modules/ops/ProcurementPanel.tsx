import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import * as api from '../../services/api/opsApi'
import { useAuth } from '../auth/AuthContext'
import { FormField, getErrorMessage, getFieldErrors, requireFields, useConfirm, type FieldErrors } from '../../ui'

export function ProcurementPanel({ projectId }: { projectId: number }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [selectedMrId, setSelectedMrId] = useState<number | null>(null)
  const [selectedPrId, setSelectedPrId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [mrForm, setMrForm] = useState({ request_no: '', title: '' })
  const [mrItemForm, setMrItemForm] = useState({ inventory_item_id: '', quantity: '' })
  const [poForm, setPoForm] = useState({ supplier_id: '', warehouse_id: '' })
  const [grnForm, setGrnForm] = useState({ grn_no: '', purchase_order_id: '' })
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null)
  const [rfqForm, setRfqForm] = useState({ purchase_request_id: '', title: '' })
  const [rfqInviteIds, setRfqInviteIds] = useState<string[]>([])
  const [quoteForm, setQuoteForm] = useState({ supplier_id: '', rate: '' })
  const [awardForm, setAwardForm] = useState({ quotation_id: '', warehouse_id: '', create_po: true })

  const { data: mrPage, isLoading: mrLoading } = useQuery({
    queryKey: ['material-requests', projectId],
    queryFn: () => api.listMaterialRequests(projectId),
    enabled: can('procurement.view'),
  })

  const activeMrId = selectedMrId ?? mrPage?.data?.[0]?.id ?? null

  const { data: selectedMr } = useQuery({
    queryKey: ['material-request', projectId, activeMrId],
    queryFn: () => api.getMaterialRequest(projectId, activeMrId!),
    enabled: !!activeMrId && can('procurement.view'),
  })

  const { data: prPage } = useQuery({
    queryKey: ['purchase-requests', projectId],
    queryFn: () => api.listPurchaseRequests(projectId),
    enabled: can('procurement.view'),
  })

  const { data: poPage } = useQuery({
    queryKey: ['purchase-orders', projectId],
    queryFn: () => api.listPurchaseOrders(projectId),
    enabled: can('procurement.view'),
  })

  const { data: grnPage } = useQuery({
    queryKey: ['goods-receipts', projectId],
    queryFn: () => api.listGoodsReceipts(projectId),
    enabled: can('procurement.view'),
  })

  const { data: itemsPage } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => api.listInventoryItems(),
    enabled: can('procurement.view') || can('procurement.manage'),
  })

  const { data: suppliersPage } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.listSuppliers(),
    enabled: can('procurement.view') || can('procurement.manage'),
  })

  const { data: warehousesPage } = useQuery({
    queryKey: ['warehouses', projectId],
    queryFn: () => api.listWarehouses(projectId),
    enabled: can('procurement.view') || can('procurement.manage'),
  })

  const { data: rfqPage } = useQuery({
    queryKey: ['rfqs', projectId],
    queryFn: () => api.listRfqs(projectId),
    enabled: can('procurement.view'),
  })

  const activeRfqId = selectedRfqId ?? rfqPage?.data?.[0]?.id ?? null

  const { data: selectedRfq } = useQuery({
    queryKey: ['rfq', projectId, activeRfqId],
    queryFn: () => api.getRfq(projectId, activeRfqId!),
    enabled: !!activeRfqId && can('procurement.view'),
  })

  const { data: quotesPage } = useQuery({
    queryKey: ['rfq-quotations', projectId, activeRfqId],
    queryFn: () => api.listRfqQuotations(projectId, activeRfqId!),
    enabled: !!activeRfqId && can('procurement.view'),
  })

  const invalidateMr = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['material-requests', projectId] }),
      qc.invalidateQueries({ queryKey: ['material-request', projectId] }),
    ])
  }

  const invalidateProcurement = async () => {
    await Promise.all([
      invalidateMr(),
      qc.invalidateQueries({ queryKey: ['purchase-requests', projectId] }),
      qc.invalidateQueries({ queryKey: ['purchase-orders', projectId] }),
      qc.invalidateQueries({ queryKey: ['goods-receipts', projectId] }),
      qc.invalidateQueries({ queryKey: ['rfqs', projectId] }),
      qc.invalidateQueries({ queryKey: ['rfq', projectId] }),
      qc.invalidateQueries({ queryKey: ['rfq-quotations', projectId] }),
    ])
  }

  const onErr = (err: unknown, fallback: string) => {
    setFieldErrors(getFieldErrors(err))
    setError(getErrorMessage(err, fallback))
  }

  const createMr = useMutation({
    mutationFn: () => api.createMaterialRequest(projectId, mrForm),
    onSuccess: async (row) => {
      setMrForm({ request_no: '', title: '' })
      setSelectedMrId(row.id)
      setError(null)
      setFieldErrors({})
      await invalidateMr()
    },
    onError: (err) => onErr(err, 'Failed to create material request'),
  })

  const addMrItem = useMutation({
    mutationFn: () => {
      const item = inventoryItems.find((i) => i.id === Number(mrItemForm.inventory_item_id))
      return api.addMaterialRequestItem(projectId, activeMrId!, {
        inventory_item_id: mrItemForm.inventory_item_id ? Number(mrItemForm.inventory_item_id) : null,
        description: item?.name ?? 'Item',
        unit: item?.unit ?? null,
        quantity: Number(mrItemForm.quantity),
      })
    },
    onSuccess: async () => {
      setMrItemForm({ inventory_item_id: '', quantity: '' })
      setFieldErrors({})
      await invalidateMr()
    },
    onError: (err) => onErr(err, 'Failed to add item'),
  })

  const submitMr = useMutation({
    mutationFn: () => api.submitMaterialRequest(projectId, activeMrId!),
    onSuccess: invalidateMr,
    onError: (err) => onErr(err, 'Submit failed'),
  })

  const approveMr = useMutation({
    mutationFn: () => api.approveMaterialRequest(projectId, activeMrId!),
    onSuccess: invalidateMr,
    onError: (err) => onErr(err, 'Approve failed'),
  })

  const convertMr = useMutation({
    mutationFn: () => api.convertMrToPr(projectId, activeMrId!),
    onSuccess: async (pr) => {
      setSelectedPrId(pr.id)
      await invalidateProcurement()
    },
    onError: (err) => onErr(err, 'Convert failed'),
  })

  const submitPr = useMutation({
    mutationFn: (id: number) => api.submitPurchaseRequest(projectId, id),
    onSuccess: invalidateProcurement,
    onError: (err) => onErr(err, 'Submit failed'),
  })

  const approvePr = useMutation({
    mutationFn: (id: number) => api.approvePurchaseRequest(projectId, id),
    onSuccess: invalidateProcurement,
    onError: (err) => onErr(err, 'Approve failed'),
  })

  const createPo = useMutation({
    mutationFn: (prId: number) =>
      api.createPoFromPr(projectId, prId, {
        supplier_id: Number(poForm.supplier_id),
        warehouse_id: Number(poForm.warehouse_id),
      }),
    onSuccess: async () => {
      setPoForm({ supplier_id: '', warehouse_id: '' })
      setFieldErrors({})
      await invalidateProcurement()
    },
    onError: (err) => onErr(err, 'Create PO failed'),
  })

  const issuePo = useMutation({
    mutationFn: (id: number) => api.issuePurchaseOrder(projectId, id),
    onSuccess: invalidateProcurement,
    onError: (err) => onErr(err, 'Issue failed'),
  })

  const createGrn = useMutation({
    mutationFn: () =>
      api.createGoodsReceipt(projectId, {
        grn_no: grnForm.grn_no,
        purchase_order_id: Number(grnForm.purchase_order_id),
      }),
    onSuccess: async () => {
      setGrnForm({ grn_no: '', purchase_order_id: '' })
      setFieldErrors({})
      await invalidateProcurement()
    },
    onError: (err) => onErr(err, 'Create GRN failed'),
  })

  const postGrn = useMutation({
    mutationFn: (id: number) => api.postGoodsReceipt(projectId, id),
    onSuccess: invalidateProcurement,
    onError: (err) => onErr(err, 'Post failed'),
  })

  const createRfq = useMutation({
    mutationFn: () =>
      api.createRfqFromPr(projectId, {
        purchase_request_id: Number(rfqForm.purchase_request_id),
        title: rfqForm.title || undefined,
      }),
    onSuccess: async (row) => {
      setRfqForm({ purchase_request_id: '', title: '' })
      setSelectedRfqId(row.id)
      setError(null)
      setFieldErrors({})
      await invalidateProcurement()
    },
    onError: (err) => onErr(err, 'Create RFQ failed'),
  })

  const inviteRfq = useMutation({
    mutationFn: () => api.inviteRfqSuppliers(projectId, activeRfqId!, rfqInviteIds.map(Number)),
    onSuccess: async () => {
      setRfqInviteIds([])
      setFieldErrors({})
      await invalidateProcurement()
    },
    onError: (err) => onErr(err, 'Invite failed'),
  })

  const sendRfq = useMutation({
    mutationFn: () => api.sendRfq(projectId, activeRfqId!),
    onSuccess: invalidateProcurement,
    onError: (err) => onErr(err, 'Send failed'),
  })

  const createQuote = useMutation({
    mutationFn: () => {
      const firstItem = selectedRfq?.items?.[0]
      return api.createSupplierQuotation(projectId, activeRfqId!, {
        supplier_id: Number(quoteForm.supplier_id),
        items: firstItem
          ? [{ rfq_item_id: firstItem.id, rate: Number(quoteForm.rate) }]
          : [{ rate: Number(quoteForm.rate) }],
      })
    },
    onSuccess: async () => {
      setQuoteForm({ supplier_id: '', rate: '' })
      setFieldErrors({})
      await invalidateProcurement()
    },
    onError: (err) => onErr(err, 'Create quotation failed'),
  })

  const submitQuote = useMutation({
    mutationFn: (id: number) => api.submitSupplierQuotation(projectId, id),
    onSuccess: invalidateProcurement,
    onError: (err) => onErr(err, 'Submit quotation failed'),
  })

  const awardRfq = useMutation({
    mutationFn: () =>
      api.awardRfq(projectId, activeRfqId!, {
        quotation_id: Number(awardForm.quotation_id),
        warehouse_id: awardForm.warehouse_id ? Number(awardForm.warehouse_id) : undefined,
        create_po: awardForm.create_po,
      }),
    onSuccess: async () => {
      setAwardForm({ quotation_id: '', warehouse_id: '', create_po: true })
      setFieldErrors({})
      await invalidateProcurement()
    },
    onError: (err) => onErr(err, 'Award failed'),
  })

  const materialRequests = mrPage?.data ?? []
  const purchaseRequests = prPage?.data ?? []
  const purchaseOrders = poPage?.data ?? []
  const goodsReceipts = grnPage?.data ?? []
  const inventoryItems = itemsPage?.data ?? []
  const suppliers = suppliersPage?.data ?? []
  const warehouses = warehousesPage?.data ?? []
  const receivablePos = purchaseOrders.filter((po) => ['issued', 'partially_received'].includes(po.status))
  const rfqs = rfqPage?.data ?? []
  const quotations = quotesPage?.data ?? []
  const approvedPrs = purchaseRequests.filter((pr) => pr.status === 'approved')
  const invitedSupplierIds = new Set((selectedRfq?.suppliers ?? []).map((s) => s.supplier_id))

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}

      <div className="grid-2">
        <section className="panel">
          <h2>Material requests</h2>
          {mrLoading ? (
            <p className="muted">Loading…</p>
          ) : materialRequests.length === 0 ? (
            <p className="muted">No material requests yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {materialRequests.map((mr) => (
                  <tr key={mr.id} className={activeMrId === mr.id ? 'row-active' : undefined} onClick={() => setSelectedMrId(mr.id)}>
                    <td>{mr.request_no}</td>
                    <td>
                      <strong>{mr.title}</strong>
                      <div className="muted small">{mr.items_count ?? 0} items</div>
                    </td>
                    <td>
                      <span className="badge">{mr.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('procurement.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(mrForm, {
                  request_no: 'Enter a request number.',
                  title: 'Enter a title.',
                })
                if (Object.keys(errs).length) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createMr.mutate()
              }}
            >
              <h3>New material request</h3>
              <FormField label="Request no" required error={fieldErrors.request_no}>
                <input value={mrForm.request_no} onChange={(e) => setMrForm({ ...mrForm, request_no: e.target.value })} />
              </FormField>
              <FormField label="Title" required error={fieldErrors.title}>
                <input value={mrForm.title} onChange={(e) => setMrForm({ ...mrForm, title: e.target.value })} />
              </FormField>
              <button type="submit" disabled={createMr.isPending}>
                Create
              </button>
            </form>
          )}

          {selectedMr && (
            <div style={{ marginTop: 16 }}>
              <div className="toolbar">
                <h3>Request detail</h3>
                {can('procurement.manage') && selectedMr.status === 'draft' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Submit material request?',
                        message: 'Submit this material request for approval?',
                        confirmLabel: 'Submit',
                        danger: false,
                      })
                      if (ok) submitMr.mutate()
                    }}
                  >
                    Submit
                  </button>
                )}
                {can('procurement.manage') && selectedMr.status === 'submitted' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Approve material request?',
                        message: 'Approve this material request?',
                        confirmLabel: 'Approve',
                        danger: false,
                      })
                      if (ok) approveMr.mutate()
                    }}
                  >
                    Approve
                  </button>
                )}
                {can('procurement.manage') && selectedMr.status === 'approved' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Convert to purchase request?',
                        message: 'Convert this material request into a purchase request?',
                        confirmLabel: 'Convert',
                        danger: false,
                      })
                      if (ok) convertMr.mutate()
                    }}
                  >
                    Convert to PR
                  </button>
                )}
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedMr.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{Number(item.quantity)}</td>
                      <td>{item.unit ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {can('procurement.manage') && selectedMr.status === 'draft' && (
                <form
                  className="form-grid"
                  style={{ marginTop: 12 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(mrItemForm, {
                      inventory_item_id: 'Select an inventory item.',
                      quantity: 'Enter a quantity.',
                    })
                    if (Object.keys(errs).length) {
                      setFieldErrors(errs)
                      return
                    }
                    setFieldErrors({})
                    addMrItem.mutate()
                  }}
                >
                  <h3>Add item</h3>
                  <FormField label="Inventory item" required error={fieldErrors.inventory_item_id}>
                    <select value={mrItemForm.inventory_item_id} onChange={(e) => setMrItemForm({ ...mrItemForm, inventory_item_id: e.target.value })}>
                      <option value="">Select…</option>
                      {inventoryItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.sku} — {i.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Quantity" required error={fieldErrors.quantity}>
                    <input type="number" min="0.001" step="any" value={mrItemForm.quantity} onChange={(e) => setMrItemForm({ ...mrItemForm, quantity: e.target.value })} />
                  </FormField>
                  <button type="submit" disabled={addMrItem.isPending}>
                    Add
                  </button>
                </form>
              )}
            </div>
          )}
        </section>

        <div className="stack">
          <section className="panel">
            <h2>Purchase requests</h2>
            {purchaseRequests.length === 0 ? (
              <p className="muted">No purchase requests yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {purchaseRequests.map((pr) => (
                    <tr key={pr.id} className={selectedPrId === pr.id ? 'row-active' : undefined} onClick={() => setSelectedPrId(pr.id)}>
                      <td>{pr.request_no}</td>
                      <td>{pr.title}</td>
                      <td>
                        <span className="badge">{pr.status}</span>
                      </td>
                      <td>
                        {can('procurement.manage') && pr.status === 'draft' && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={async (e) => {
                              e.stopPropagation()
                              const ok = await confirm({
                                title: 'Submit purchase request?',
                                message: `Submit purchase request ${pr.request_no}?`,
                                confirmLabel: 'Submit',
                                danger: false,
                              })
                              if (ok) submitPr.mutate(pr.id)
                            }}
                          >
                            Submit
                          </button>
                        )}
                        {can('procurement.manage') && pr.status === 'submitted' && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={async (e) => {
                              e.stopPropagation()
                              const ok = await confirm({
                                title: 'Approve purchase request?',
                                message: `Approve purchase request ${pr.request_no}?`,
                                confirmLabel: 'Approve',
                                danger: false,
                              })
                              if (ok) approvePr.mutate(pr.id)
                            }}
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {can('procurement.manage') && selectedPrId && purchaseRequests.find((p) => p.id === selectedPrId)?.status === 'approved' && (
              <form
                className="form-grid"
                style={{ marginTop: 12 }}
                onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  setError(null)
                  const errs = requireFields(poForm, {
                    supplier_id: 'Select a supplier.',
                    warehouse_id: 'Select a warehouse.',
                  })
                  if (Object.keys(errs).length) {
                    setFieldErrors(errs)
                    return
                  }
                  setFieldErrors({})
                  createPo.mutate(selectedPrId)
                }}
              >
                <h3>Create PO from PR</h3>
                <FormField label="Supplier" required error={fieldErrors.supplier_id}>
                  <select value={poForm.supplier_id} onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })}>
                    <option value="">Select…</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Warehouse" required error={fieldErrors.warehouse_id}>
                  <select value={poForm.warehouse_id} onChange={(e) => setPoForm({ ...poForm, warehouse_id: e.target.value })}>
                    <option value="">Select…</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} — {w.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <button type="submit" disabled={createPo.isPending}>
                  Create PO
                </button>
              </form>
            )}
          </section>

          <section className="panel">
            <h2>Purchase orders</h2>
            {purchaseOrders.length === 0 ? (
              <p className="muted">No purchase orders yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO no</th>
                    <th>Title</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td>{po.po_no}</td>
                      <td>{po.title}</td>
                      <td>{Number(po.total_amount).toLocaleString()}</td>
                      <td>
                        <span className="badge">{po.status}</span>
                      </td>
                      <td>
                        {can('procurement.manage') && po.status === 'draft' && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Issue purchase order?',
                                message: `Issue PO ${po.po_no}?`,
                                confirmLabel: 'Issue',
                                danger: false,
                              })
                              if (ok) issuePo.mutate(po.id)
                            }}
                          >
                            Issue
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel">
            <h2>Goods receipts</h2>
            {goodsReceipts.length === 0 ? (
              <p className="muted">No goods receipts yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>GRN no</th>
                    <th>PO</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {goodsReceipts.map((grn) => (
                    <tr key={grn.id}>
                      <td>{grn.grn_no}</td>
                      <td>PO #{grn.purchase_order_id}</td>
                      <td>
                        <span className="badge">{grn.status}</span>
                      </td>
                      <td>
                        {can('procurement.manage') && grn.status === 'draft' && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Post goods receipt?',
                                message: `Post GRN ${grn.grn_no}? This updates stock.`,
                                confirmLabel: 'Post',
                                danger: false,
                              })
                              if (ok) postGrn.mutate(grn.id)
                            }}
                          >
                            Post
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {can('procurement.manage') && receivablePos.length > 0 && (
              <form
                className="form-grid"
                style={{ marginTop: 12 }}
                onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  setError(null)
                  const errs = requireFields(grnForm, {
                    grn_no: 'Enter a GRN number.',
                    purchase_order_id: 'Select a purchase order.',
                  })
                  if (Object.keys(errs).length) {
                    setFieldErrors(errs)
                    return
                  }
                  setFieldErrors({})
                  createGrn.mutate()
                }}
              >
                <h3>Create GRN</h3>
                <FormField label="GRN no" required error={fieldErrors.grn_no}>
                  <input value={grnForm.grn_no} onChange={(e) => setGrnForm({ ...grnForm, grn_no: e.target.value })} />
                </FormField>
                <FormField label="Purchase order" required error={fieldErrors.purchase_order_id}>
                  <select value={grnForm.purchase_order_id} onChange={(e) => setGrnForm({ ...grnForm, purchase_order_id: e.target.value })}>
                    <option value="">Select issued PO…</option>
                    {receivablePos.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.po_no} — {po.title}
                      </option>
                    ))}
                  </select>
                </FormField>
                <button type="submit" disabled={createGrn.isPending}>
                  Create GRN
                </button>
              </form>
            )}
          </section>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>RFQs</h2>
          {rfqs.length === 0 ? (
            <p className="muted">No RFQs yet. Create one from an approved PR.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Title</th>
                  <th>Quotes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => (
                  <tr key={rfq.id} className={activeRfqId === rfq.id ? 'row-active' : undefined} onClick={() => setSelectedRfqId(rfq.id)}>
                    <td>{rfq.rfq_no}</td>
                    <td>
                      <strong>{rfq.title}</strong>
                      <div className="muted small">{rfq.suppliers_count ?? 0} suppliers</div>
                    </td>
                    <td>{rfq.quotations_count ?? 0}</td>
                    <td>
                      <span className="badge">{rfq.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('procurement.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(rfqForm, {
                  purchase_request_id: 'Select an approved PR.',
                })
                if (Object.keys(errs).length) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createRfq.mutate()
              }}
            >
              <h3>Create RFQ from PR</h3>
              <FormField label="Approved PR" required error={fieldErrors.purchase_request_id}>
                <select value={rfqForm.purchase_request_id} onChange={(e) => setRfqForm({ ...rfqForm, purchase_request_id: e.target.value })}>
                  <option value="">Select…</option>
                  {approvedPrs.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.request_no} — {pr.title}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Title (optional)" error={fieldErrors.title}>
                <input value={rfqForm.title} onChange={(e) => setRfqForm({ ...rfqForm, title: e.target.value })} />
              </FormField>
              <button type="submit" disabled={createRfq.isPending || approvedPrs.length === 0}>
                Create RFQ
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          {!selectedRfq ? (
            <p className="muted">Select an RFQ to manage invitations, quotations, and award.</p>
          ) : (
            <>
              <div className="toolbar">
                <div>
                  <h2>{selectedRfq.rfq_no}</h2>
                  <p className="muted">
                    {selectedRfq.title} · <span className="badge">{selectedRfq.status}</span>
                  </p>
                </div>
                {can('procurement.manage') && ['draft', 'invited'].includes(selectedRfq.status) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Send RFQ?',
                        message: `Send RFQ ${selectedRfq.rfq_no} to invited suppliers?`,
                        confirmLabel: 'Send',
                        danger: false,
                      })
                      if (ok) sendRfq.mutate()
                    }}
                    disabled={sendRfq.isPending}
                  >
                    Send RFQ
                  </button>
                )}
              </div>

              <h3>Line items</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedRfq.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{Number(item.quantity)}</td>
                      <td>{item.unit ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {can('procurement.manage') && !['awarded', 'cancelled'].includes(selectedRfq.status) && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    if (rfqInviteIds.length === 0) {
                      setFieldErrors({ suppliers: 'Select at least one supplier.' })
                      return
                    }
                    setFieldErrors({})
                    inviteRfq.mutate()
                  }}
                >
                  <h3>Invite suppliers</h3>
                  <FormField label="Suppliers" required error={fieldErrors.suppliers}>
                    <select
                      multiple
                      value={rfqInviteIds}
                      onChange={(e) => setRfqInviteIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
                      style={{ minHeight: 88 }}
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id} disabled={invitedSupplierIds.has(s.id)}>
                          {s.code} — {s.name}
                          {invitedSupplierIds.has(s.id) ? ' (invited)' : ''}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <button type="submit" disabled={inviteRfq.isPending || rfqInviteIds.length === 0}>
                    Invite
                  </button>
                </form>
              )}

              <h3 style={{ marginTop: 16 }}>Quotations</h3>
              {quotations.length === 0 ? (
                <p className="muted">No quotations yet.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Quote</th>
                      <th>Supplier</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map((q) => (
                      <tr key={q.id}>
                        <td>{q.quote_no}</td>
                        <td>{q.supplier?.name ?? `#${q.supplier_id}`}</td>
                        <td>{Number(q.total_amount).toLocaleString()}</td>
                        <td>
                          <span className="badge">{q.status}</span>
                        </td>
                        <td>
                          {can('procurement.manage') && q.status === 'draft' && (
                            <button
                              type="button"
                              className="ghost"
                              onClick={async () => {
                                const ok = await confirm({
                                  title: 'Submit quotation?',
                                  message: `Submit quotation ${q.quote_no}?`,
                                  confirmLabel: 'Submit',
                                  danger: false,
                                })
                                if (ok) submitQuote.mutate(q.id)
                              }}
                            >
                              Submit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {can('procurement.manage') && ['sent', 'quoted', 'draft', 'invited'].includes(selectedRfq.status) && (
                <form
                  className="form-grid"
                  style={{ marginTop: 12 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(quoteForm, {
                      supplier_id: 'Select a supplier.',
                      rate: 'Enter a rate.',
                    })
                    if (Object.keys(errs).length) {
                      setFieldErrors(errs)
                      return
                    }
                    setFieldErrors({})
                    createQuote.mutate()
                  }}
                >
                  <h3>Enter quotation</h3>
                  <FormField label="Supplier" required error={fieldErrors.supplier_id}>
                    <select value={quoteForm.supplier_id} onChange={(e) => setQuoteForm({ ...quoteForm, supplier_id: e.target.value })}>
                      <option value="">Select…</option>
                      {(selectedRfq.suppliers ?? []).map((row) => (
                        <option key={row.supplier_id} value={row.supplier_id}>
                          {row.supplier?.name ?? `Supplier #${row.supplier_id}`}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Rate (first line)" required error={fieldErrors.rate}>
                    <input type="number" min="0" step="any" value={quoteForm.rate} onChange={(e) => setQuoteForm({ ...quoteForm, rate: e.target.value })} />
                  </FormField>
                  <button type="submit" disabled={createQuote.isPending}>
                    Save quotation
                  </button>
                </form>
              )}

              {can('procurement.manage') && selectedRfq.status !== 'awarded' && quotations.some((q) => q.status === 'submitted') && (
                <form
                  className="form-grid"
                  style={{ marginTop: 12 }}
                  onSubmit={async (e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(awardForm, {
                      quotation_id: 'Select a submitted quotation.',
                    })
                    if (Object.keys(errs).length) {
                      setFieldErrors(errs)
                      return
                    }
                    setFieldErrors({})
                    const ok = await confirm({
                      title: 'Award RFQ?',
                      message: 'Award this RFQ to the selected quotation?',
                      confirmLabel: 'Award',
                      danger: false,
                    })
                    if (ok) awardRfq.mutate()
                  }}
                >
                  <h3>Award RFQ</h3>
                  <FormField label="Quotation" required error={fieldErrors.quotation_id}>
                    <select value={awardForm.quotation_id} onChange={(e) => setAwardForm({ ...awardForm, quotation_id: e.target.value })}>
                      <option value="">Select submitted quote…</option>
                      {quotations
                        .filter((q) => q.status === 'submitted')
                        .map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.quote_no} — {Number(q.total_amount).toLocaleString()}
                          </option>
                        ))}
                    </select>
                  </FormField>
                  <FormField label="Warehouse (for PO)" error={fieldErrors.warehouse_id}>
                    <select value={awardForm.warehouse_id} onChange={(e) => setAwardForm({ ...awardForm, warehouse_id: e.target.value })}>
                      <option value="">Optional…</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.code} — {w.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <label>
                    <input
                      type="checkbox"
                      checked={awardForm.create_po}
                      onChange={(e) => setAwardForm({ ...awardForm, create_po: e.target.checked })}
                    />{' '}
                    Create purchase order
                  </label>
                  <button type="submit" disabled={awardRfq.isPending}>
                    Award
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
