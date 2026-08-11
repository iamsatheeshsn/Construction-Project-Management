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

export function InventoryPanel({ projectId }: { projectId: number }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [issueForm, setIssueForm] = useState({
    warehouse_id: '',
    issue_no: '',
    issue_date: new Date().toISOString().slice(0, 10),
  })
  const [itemForm, setItemForm] = useState({ inventory_item_id: '', quantity: '' })
  const [warehouseForm, setWarehouseForm] = useState({ code: '', name: '' })
  const [inventoryForm, setInventoryForm] = useState({ sku: '', name: '', unit: 'ea', default_rate: '0' })

  const { data: stockPage, isLoading: stockLoading } = useQuery({
    queryKey: ['stock', projectId],
    queryFn: () => api.listProjectStock(projectId),
    enabled: can('inventory.view'),
  })

  const { data: issuesPage, isLoading: issuesLoading } = useQuery({
    queryKey: ['material-issues', projectId],
    queryFn: () => api.listMaterialIssues(projectId),
    enabled: can('inventory.view'),
  })

  const { data: warehousesPage } = useQuery({
    queryKey: ['warehouses', projectId],
    queryFn: () => api.listWarehouses(projectId),
    enabled: can('inventory.view') || can('inventory.manage'),
  })

  const { data: itemsPage } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => api.listInventoryItems(),
    enabled: can('inventory.view') || can('inventory.manage'),
  })

  const activeId = selectedId ?? issuesPage?.data?.[0]?.id ?? null

  const { data: selected } = useQuery({
    queryKey: ['material-issue', projectId, activeId],
    queryFn: () => api.getMaterialIssue(projectId, activeId!),
    enabled: !!activeId && can('inventory.view'),
  })

  const invalidateIssues = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['material-issues', projectId] }),
      qc.invalidateQueries({ queryKey: ['material-issue', projectId] }),
      qc.invalidateQueries({ queryKey: ['stock', projectId] }),
    ])
  }

  const invalidateCatalog = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['warehouses', projectId] }),
      qc.invalidateQueries({ queryKey: ['inventory-items'] }),
    ])
  }

  const onErr = (err: unknown, fallback: string) => {
    setFieldErrors(getFieldErrors(err))
    setError(getErrorMessage(err, fallback))
  }

  const createIssue = useMutation({
    mutationFn: () =>
      api.createMaterialIssue(projectId, {
        warehouse_id: Number(issueForm.warehouse_id),
        issue_no: issueForm.issue_no,
        issue_date: issueForm.issue_date || null,
      }),
    onSuccess: async (row) => {
      setIssueForm({ warehouse_id: '', issue_no: '', issue_date: new Date().toISOString().slice(0, 10) })
      setSelectedId(row.id)
      setError(null)
      setFieldErrors({})
      await invalidateIssues()
      success({ title: 'Material issue created', message: 'The material issue draft was created.' })
    },
    onError: (err) => onErr(err, 'Failed to create material issue'),
  })

  const addItem = useMutation({
    mutationFn: () => {
      const item = inventoryItems.find((i) => i.id === Number(itemForm.inventory_item_id))
      return api.addMaterialIssueItem(projectId, activeId!, {
        inventory_item_id: itemForm.inventory_item_id ? Number(itemForm.inventory_item_id) : null,
        description: item?.name ?? 'Item',
        unit: item?.unit ?? null,
        quantity: Number(itemForm.quantity),
      })
    },
    onSuccess: async () => {
      setItemForm({ inventory_item_id: '', quantity: '' })
      setFieldErrors({})
      await invalidateIssues()
    },
    onError: (err) => onErr(err, 'Failed to add item'),
  })

  const postIssue = useMutation({
    mutationFn: () => api.postMaterialIssue(projectId, activeId!),
    onSuccess: invalidateIssues,
    onError: (err) => onErr(err, 'Post failed'),
  })

  const createWarehouse = useMutation({
    mutationFn: () =>
      api.createWarehouse({
        project_id: projectId,
        code: warehouseForm.code,
        name: warehouseForm.name,
      }),
    onSuccess: async () => {
      setWarehouseForm({ code: '', name: '' })
      setError(null)
      setFieldErrors({})
      await invalidateCatalog()
      success({ title: 'Warehouse created', message: 'The warehouse is ready for stock movements.' })
    },
    onError: (err) => onErr(err, 'Failed to create warehouse'),
  })

  const createInventoryItem = useMutation({
    mutationFn: () =>
      api.createInventoryItem({
        sku: inventoryForm.sku,
        name: inventoryForm.name,
        unit: inventoryForm.unit,
        default_rate: Number(inventoryForm.default_rate || 0),
      }),
    onSuccess: async () => {
      setInventoryForm({ sku: '', name: '', unit: 'ea', default_rate: '0' })
      setError(null)
      setFieldErrors({})
      await invalidateCatalog()
      success({ title: 'Inventory item created', message: 'The inventory item was added to the catalog.' })
    },
    onError: (err) => onErr(err, 'Failed to create inventory item'),
  })

  const stock = stockPage?.data ?? []
  const issues = issuesPage?.data ?? []
  const warehouses = warehousesPage?.data ?? []
  const inventoryItems = itemsPage?.data ?? []

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}

      <section className="panel">
        <h2>Stock balances</h2>
        {stockLoading ? (
          <p className="muted">Loading…</p>
        ) : stock.length === 0 ? (
          <p className="muted">No stock on hand for this project.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Avg cost</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((row) => (
                <tr key={row.id}>
                  <td>{row.warehouse ? `${row.warehouse.code} — ${row.warehouse.name}` : `#${row.warehouse_id}`}</td>
                  <td>
                    {row.inventory_item ? `${row.inventory_item.sku} — ${row.inventory_item.name}` : `#${row.inventory_item_id}`}
                  </td>
                  <td>
                    {Number(row.quantity)} {row.inventory_item?.unit ?? ''}
                  </td>
                  <td>{row.avg_unit_cost != null ? Number(row.avg_unit_cost).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>Material issues</h2>
          {issuesLoading ? (
            <p className="muted">Loading…</p>
          ) : issues.length === 0 ? (
            <p className="muted">No material issues yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Warehouse</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id} className={activeId === issue.id ? 'row-active' : undefined} onClick={() => setSelectedId(issue.id)}>
                    <td>{issue.issue_no}</td>
                    <td>#{issue.warehouse_id}</td>
                    <td>
                      <span className="badge">{issue.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('inventory.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(issueForm, {
                  warehouse_id: 'Select a warehouse.',
                  issue_no: 'Enter an issue number.',
                })
                if (Object.keys(errs).length) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createIssue.mutate()
              }}
            >
              <h3>New material issue</h3>
              <FormField label="Warehouse" required error={fieldErrors.warehouse_id}>
                <select value={issueForm.warehouse_id} onChange={(e) => setIssueForm({ ...issueForm, warehouse_id: e.target.value })}>
                  <option value="">Select…</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Issue no" required error={fieldErrors.issue_no}>
                <input value={issueForm.issue_no} onChange={(e) => setIssueForm({ ...issueForm, issue_no: e.target.value })} />
              </FormField>
              <FormField label="Date" error={fieldErrors.issue_date}>
                <input type="date" value={issueForm.issue_date} onChange={(e) => setIssueForm({ ...issueForm, issue_date: e.target.value })} />
              </FormField>
              <button type="submit" disabled={createIssue.isPending}>
                Create
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="toolbar">
            <h2>Issue detail</h2>
            {selected && can('inventory.manage') && selected.status === 'draft' && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Post material issue?',
                    message: `Post issue ${selected.issue_no}? This updates stock balances.`,
                    confirmLabel: 'Post',
                    danger: false,
                  })
                  if (ok) postIssue.mutate()
                }}
              >
                Post
              </button>
            )}
          </div>
          {!selected ? (
            <p className="muted">Select or create a material issue.</p>
          ) : (
            <>
              <dl className="kv">
                <div>
                  <dt>Number</dt>
                  <dd>{selected.issue_no}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className="badge">{selected.status}</span>
                  </dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{selected.issue_date ?? '—'}</dd>
                </div>
              </dl>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{Number(item.quantity)}</td>
                      <td>{item.unit ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {can('inventory.manage') && selected.status === 'draft' && (
                <form
                  className="form-grid"
                  style={{ marginTop: 16 }}
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault()
                    setError(null)
                    const errs = requireFields(itemForm, {
                      inventory_item_id: 'Select an inventory item.',
                      quantity: 'Enter a quantity.',
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
                  <FormField label="Inventory item" required error={fieldErrors.inventory_item_id}>
                    <select value={itemForm.inventory_item_id} onChange={(e) => setItemForm({ ...itemForm, inventory_item_id: e.target.value })}>
                      <option value="">Select…</option>
                      {inventoryItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.sku} — {i.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Quantity" required error={fieldErrors.quantity}>
                    <input type="number" min="0.001" step="any" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                  </FormField>
                  <button type="submit" disabled={addItem.isPending}>
                    Add
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>

      {can('inventory.manage') && (
        <div className="grid-2">
          <section className="panel">
            <h2>Quick create warehouse</h2>
            <form
              className="form-grid"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(warehouseForm, {
                  code: 'Enter a warehouse code.',
                  name: 'Enter a warehouse name.',
                })
                if (Object.keys(errs).length) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createWarehouse.mutate()
              }}
            >
              <FormField label="Code" required error={fieldErrors.code}>
                <input value={warehouseForm.code} onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })} />
              </FormField>
              <FormField label="Name" required error={fieldErrors.name}>
                <input value={warehouseForm.name} onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })} />
              </FormField>
              <button type="submit" disabled={createWarehouse.isPending}>
                Create warehouse
              </button>
            </form>
          </section>

          <section className="panel">
            <h2>Quick create inventory item</h2>
            <form
              className="form-grid"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(inventoryForm, {
                  sku: 'Enter a SKU.',
                  name: 'Enter an item name.',
                })
                if (Object.keys(errs).length) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createInventoryItem.mutate()
              }}
            >
              <FormField label="SKU" required error={fieldErrors.sku}>
                <input value={inventoryForm.sku} onChange={(e) => setInventoryForm({ ...inventoryForm, sku: e.target.value })} />
              </FormField>
              <FormField label="Name" required error={fieldErrors.name}>
                <input value={inventoryForm.name} onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })} />
              </FormField>
              <FormField label="Unit" error={fieldErrors.unit}>
                <input value={inventoryForm.unit} onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })} />
              </FormField>
              <FormField label="Default rate" error={fieldErrors.default_rate}>
                <input type="number" min="0" value={inventoryForm.default_rate} onChange={(e) => setInventoryForm({ ...inventoryForm, default_rate: e.target.value })} />
              </FormField>
              <button type="submit" disabled={createInventoryItem.isPending}>
                Create item
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
