import api from '../api/client'
import { DEFAULT_PAGE_SIZE } from '../../ui/helpers'

type Paginated<T> = {
  data: T[]
  meta?: { current_page: number; last_page: number; per_page: number; total: number; from?: number | null; to?: number | null }
}

export type Supplier = { id: number; code: string; name: string; status: string; contact_name?: string | null }
export type InventoryItem = {
  id: number
  sku: string
  name: string
  unit: string
  default_rate: string | number
  category?: string | null
  is_active?: boolean
}
export type Warehouse = {
  id: number
  code: string
  name: string
  location?: string | null
  project_id?: number | null
  is_default?: boolean
  status?: string
}
export type StockBalance = {
  id: number
  warehouse_id: number
  inventory_item_id: number
  project_id?: number | null
  quantity: string | number
  avg_unit_cost?: string | number
  inventory_item?: { id: number; sku: string; name: string; unit: string } | null
  warehouse?: { id: number; code: string; name: string } | null
}
export type MaterialRequest = {
  id: number
  request_no: string
  title: string
  status: string
  items_count?: number
  items?: { id: number; description: string; quantity: string | number; unit?: string | null; inventory_item_id?: number | null }[]
}
export type PurchaseRequest = {
  id: number
  request_no: string
  title: string
  status: string
  material_request_id?: number | null
  items?: { id: number; description: string; quantity: string | number; estimated_rate: string | number; estimated_amount: string | number }[]
}
export type PurchaseOrder = {
  id: number
  po_no: string
  title: string
  status: string
  total_amount: string | number
  supplier_id: number
  warehouse_id?: number | null
  items_count?: number
}
export type GoodsReceipt = { id: number; grn_no: string; status: string; items_count?: number; purchase_order_id: number }
export type MaterialIssue = {
  id: number
  issue_no: string
  status: string
  warehouse_id: number
  issue_date?: string | null
  items_count?: number
  items?: { id: number; description: string; quantity: string | number; unit?: string | null; inventory_item_id?: number | null }[]
  warehouse?: { id: number; code: string; name: string } | null
}

export type ListOpts = {
  search?: string
  status?: string
  perPage?: number
}

export async function listSuppliers(page = 1, opts: ListOpts = {}) {
  const { data } = await api.get<Paginated<Supplier>>('/suppliers', {
    params: {
      per_page: opts.perPage ?? DEFAULT_PAGE_SIZE,
      page,
      search: opts.search || undefined,
      status: opts.status || undefined,
    },
  })
  return data
}
export async function createSupplier(payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Supplier }>('/suppliers', payload)
  return data.data ?? (data as unknown as Supplier)
}
export async function updateSupplier(id: number, payload: Record<string, unknown>) {
  const { data } = await api.put<{ data: Supplier }>(`/suppliers/${id}`, payload)
  return data.data ?? (data as unknown as Supplier)
}
export async function listInventoryItems(page = 1, opts: ListOpts & { isActive?: boolean } = {}) {
  const { data } = await api.get<Paginated<InventoryItem>>('/inventory-items', {
    params: {
      per_page: opts.perPage ?? DEFAULT_PAGE_SIZE,
      page,
      search: opts.search || undefined,
      is_active: opts.isActive === undefined ? undefined : opts.isActive ? 1 : 0,
    },
  })
  return data
}
export async function createInventoryItem(payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: InventoryItem }>('/inventory-items', payload)
  return data.data ?? (data as unknown as InventoryItem)
}
export async function updateInventoryItem(id: number, payload: Record<string, unknown>) {
  const { data } = await api.put<{ data: InventoryItem }>(`/inventory-items/${id}`, payload)
  return data.data ?? (data as unknown as InventoryItem)
}
export async function listWarehouses(projectId?: number, page = 1, opts: { perPage?: number } = {}) {
  const { data } = await api.get<Paginated<Warehouse>>('/warehouses', {
    params: { ...(projectId ? { project_id: projectId } : {}), per_page: opts.perPage ?? DEFAULT_PAGE_SIZE, page },
  })
  return data
}
export async function createWarehouse(payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Warehouse }>('/warehouses', payload)
  return data.data ?? (data as unknown as Warehouse)
}
export async function listProjectStock(projectId: number) {
  const { data } = await api.get<Paginated<StockBalance>>(`/projects/${projectId}/stock`, { params: { per_page: DEFAULT_PAGE_SIZE } })
  return data
}

export async function listMaterialRequests(projectId: number) {
  const { data } = await api.get<Paginated<MaterialRequest>>(`/projects/${projectId}/material-requests`, { params: { per_page: DEFAULT_PAGE_SIZE } })
  return data
}
export async function getMaterialRequest(projectId: number, id: number) {
  const { data } = await api.get<{ data: MaterialRequest }>(`/projects/${projectId}/material-requests/${id}`)
  return data.data ?? (data as unknown as MaterialRequest)
}
export async function createMaterialRequest(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: MaterialRequest }>(`/projects/${projectId}/material-requests`, payload)
  return data.data ?? (data as unknown as MaterialRequest)
}
export async function addMaterialRequestItem(projectId: number, id: number, payload: Record<string, unknown>) {
  const { data } = await api.post(`/projects/${projectId}/material-requests/${id}/items`, payload)
  return data
}
export async function submitMaterialRequest(projectId: number, id: number) {
  const { data } = await api.post<{ data: MaterialRequest }>(`/projects/${projectId}/material-requests/${id}/submit`)
  return data.data ?? (data as unknown as MaterialRequest)
}
export async function approveMaterialRequest(projectId: number, id: number) {
  const { data } = await api.post<{ data: MaterialRequest }>(`/projects/${projectId}/material-requests/${id}/approve`)
  return data.data ?? (data as unknown as MaterialRequest)
}
export async function convertMrToPr(projectId: number, id: number) {
  const { data } = await api.post<{ data: PurchaseRequest }>(`/projects/${projectId}/material-requests/${id}/convert-to-pr`, {})
  return data.data ?? (data as unknown as PurchaseRequest)
}

export async function listPurchaseRequests(projectId: number) {
  const { data } = await api.get<Paginated<PurchaseRequest>>(`/projects/${projectId}/purchase-requests`, { params: { per_page: DEFAULT_PAGE_SIZE } })
  return data
}
export async function submitPurchaseRequest(projectId: number, id: number) {
  const { data } = await api.post<{ data: PurchaseRequest }>(`/projects/${projectId}/purchase-requests/${id}/submit`)
  return data.data ?? (data as unknown as PurchaseRequest)
}
export async function approvePurchaseRequest(projectId: number, id: number) {
  const { data } = await api.post<{ data: PurchaseRequest }>(`/projects/${projectId}/purchase-requests/${id}/approve`)
  return data.data ?? (data as unknown as PurchaseRequest)
}
export async function createPoFromPr(projectId: number, id: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: PurchaseOrder }>(`/projects/${projectId}/purchase-requests/${id}/create-po`, payload)
  return data.data ?? (data as unknown as PurchaseOrder)
}

export async function listPurchaseOrders(projectId: number) {
  const { data } = await api.get<Paginated<PurchaseOrder>>(`/projects/${projectId}/purchase-orders`, { params: { per_page: DEFAULT_PAGE_SIZE } })
  return data
}
export async function issuePurchaseOrder(projectId: number, id: number) {
  const { data } = await api.post<{ data: PurchaseOrder }>(`/projects/${projectId}/purchase-orders/${id}/issue`)
  return data.data ?? (data as unknown as PurchaseOrder)
}

export async function listGoodsReceipts(projectId: number) {
  const { data } = await api.get<Paginated<GoodsReceipt>>(`/projects/${projectId}/goods-receipts`, { params: { per_page: DEFAULT_PAGE_SIZE } })
  return data
}
export async function createGoodsReceipt(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: GoodsReceipt }>(`/projects/${projectId}/goods-receipts`, payload)
  return data.data ?? (data as unknown as GoodsReceipt)
}
export async function postGoodsReceipt(projectId: number, id: number) {
  const { data } = await api.post<{ data: GoodsReceipt }>(`/projects/${projectId}/goods-receipts/${id}/post`)
  return data.data ?? (data as unknown as GoodsReceipt)
}

export async function listMaterialIssues(projectId: number) {
  const { data } = await api.get<Paginated<MaterialIssue>>(`/projects/${projectId}/material-issues`, { params: { per_page: DEFAULT_PAGE_SIZE } })
  return data
}
export async function getMaterialIssue(projectId: number, id: number) {
  const { data } = await api.get<{ data: MaterialIssue }>(`/projects/${projectId}/material-issues/${id}`)
  return data.data ?? (data as unknown as MaterialIssue)
}
export async function createMaterialIssue(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: MaterialIssue }>(`/projects/${projectId}/material-issues`, payload)
  return data.data ?? (data as unknown as MaterialIssue)
}
export async function addMaterialIssueItem(projectId: number, id: number, payload: Record<string, unknown>) {
  const { data } = await api.post(`/projects/${projectId}/material-issues/${id}/items`, payload)
  return data
}
export async function postMaterialIssue(projectId: number, id: number) {
  const { data } = await api.post<{ data: MaterialIssue }>(`/projects/${projectId}/material-issues/${id}/post`)
  return data.data ?? (data as unknown as MaterialIssue)
}

export type Rfq = {
  id: number
  purchase_request_id?: number | null
  rfq_no: string
  title: string
  status: string
  due_date?: string | null
  notes?: string | null
  awarded_quotation_id?: number | null
  items_count?: number
  suppliers_count?: number
  quotations_count?: number
  items?: { id: number; description: string; quantity: string | number; unit?: string | null; inventory_item_id?: number | null }[]
  suppliers?: { id: number; supplier_id: number; supplier?: Supplier | null }[]
  awarded_quotation?: SupplierQuotation | null
}
export type SupplierQuotation = {
  id: number
  rfq_id: number
  supplier_id: number
  quote_no: string
  status: string
  currency: string
  subtotal: string | number
  tax_amount: string | number
  total_amount: string | number
  lead_time_days?: number | null
  supplier?: Supplier | null
  items?: { id: number; rfq_item_id: number; description: string; quantity: string | number; rate: string | number; amount: string | number }[]
}

export type Equipment = {
  id: number
  code: string
  name: string
  category?: string | null
  ownership?: string | null
  status: string
  manufacturer?: string | null
  model?: string | null
  serial_no?: string | null
  daily_rate?: string | number | null
}
export type EquipmentAssignment = {
  id: number
  equipment_id: number
  assignment_no: string
  operator_name?: string | null
  start_date: string
  end_date?: string | null
  daily_rate?: string | number | null
  status: string
  equipment?: Equipment | null
}
export type EquipmentUsageLog = {
  id: number
  equipment_id: number
  equipment_assignment_id?: number | null
  usage_date: string
  hours?: string | number | null
  fuel_liters?: string | number | null
  remarks?: string | null
}

export type Subcontractor = {
  id: number
  code: string
  name: string
  trade?: string | null
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  status: string
}
export type SubcontractPackage = {
  id: number
  subcontractor_id: number
  package_no: string
  title: string
  status: string
  currency: string
  contract_value?: string | number | null
  retention_percent?: string | number | null
  items_count?: number
  subcontractor?: Subcontractor | null
  items?: { id: number; description: string; unit?: string | null; quantity: string | number; rate: string | number; amount: string | number }[]
}

export async function listRfqs(projectId: number) {
  const { data } = await api.get<Paginated<Rfq>>(`/projects/${projectId}/rfqs`, { params: { per_page: DEFAULT_PAGE_SIZE } })
  return data
}
export async function getRfq(projectId: number, id: number) {
  const { data } = await api.get<{ data: Rfq }>(`/projects/${projectId}/rfqs/${id}`)
  return data.data ?? (data as unknown as Rfq)
}
export async function createRfqFromPr(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Rfq }>(`/projects/${projectId}/rfqs`, payload)
  return data.data ?? (data as unknown as Rfq)
}
export async function inviteRfqSuppliers(projectId: number, id: number, supplierIds: number[]) {
  const { data } = await api.post<{ data: Rfq }>(`/projects/${projectId}/rfqs/${id}/invite`, { supplier_ids: supplierIds })
  return data.data ?? (data as unknown as Rfq)
}
export async function sendRfq(projectId: number, id: number) {
  const { data } = await api.post<{ data: Rfq }>(`/projects/${projectId}/rfqs/${id}/send`)
  return data.data ?? (data as unknown as Rfq)
}
export async function listRfqQuotations(projectId: number, rfqId: number) {
  const { data } = await api.get<Paginated<SupplierQuotation>>(`/projects/${projectId}/rfqs/${rfqId}/quotations`)
  return data
}
export async function createSupplierQuotation(projectId: number, rfqId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: SupplierQuotation }>(`/projects/${projectId}/rfqs/${rfqId}/quotations`, payload)
  return data.data ?? (data as unknown as SupplierQuotation)
}
export async function submitSupplierQuotation(projectId: number, quotationId: number) {
  const { data } = await api.post<{ data: SupplierQuotation }>(`/projects/${projectId}/quotations/${quotationId}/submit`)
  return data.data ?? (data as unknown as SupplierQuotation)
}
export async function awardRfq(projectId: number, rfqId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ rfq: Rfq; quotation: SupplierQuotation; purchase_order: PurchaseOrder | null }>(
    `/projects/${projectId}/rfqs/${rfqId}/award`,
    payload,
  )
  return data
}

export async function listEquipment(page = 1, opts: ListOpts & { category?: string } = {}) {
  const { data } = await api.get<Paginated<Equipment>>('/equipment', {
    params: {
      per_page: opts.perPage ?? DEFAULT_PAGE_SIZE,
      page,
      search: opts.search || undefined,
      status: opts.status || undefined,
      category: opts.category || undefined,
    },
  })
  return data
}
export async function createEquipment(payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Equipment }>('/equipment', payload)
  return data.data ?? (data as unknown as Equipment)
}
export async function updateEquipment(id: number, payload: Record<string, unknown>) {
  const { data } = await api.put<{ data: Equipment }>(`/equipment/${id}`, payload)
  return data.data ?? (data as unknown as Equipment)
}
export async function listEquipmentAssignments(projectId: number) {
  const { data } = await api.get<Paginated<EquipmentAssignment>>(`/projects/${projectId}/equipment-assignments`, { params: { per_page: DEFAULT_PAGE_SIZE } })
  return data
}
export async function createEquipmentAssignment(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: EquipmentAssignment }>(`/projects/${projectId}/equipment-assignments`, payload)
  return data.data ?? (data as unknown as EquipmentAssignment)
}
export async function activateEquipmentAssignment(projectId: number, id: number) {
  const { data } = await api.post<{ data: EquipmentAssignment }>(`/projects/${projectId}/equipment-assignments/${id}/activate`)
  return data.data ?? (data as unknown as EquipmentAssignment)
}
export async function completeEquipmentAssignment(projectId: number, id: number) {
  const { data } = await api.post<{ data: EquipmentAssignment }>(`/projects/${projectId}/equipment-assignments/${id}/complete`)
  return data.data ?? (data as unknown as EquipmentAssignment)
}
export async function listEquipmentUsage(projectId: number) {
  const { data } = await api.get<Paginated<EquipmentUsageLog>>(`/projects/${projectId}/equipment-usage`, { params: { per_page: DEFAULT_PAGE_SIZE } })
  return data
}
export async function createEquipmentUsage(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: EquipmentUsageLog }>(`/projects/${projectId}/equipment-usage`, payload)
  return data.data ?? (data as unknown as EquipmentUsageLog)
}

export async function listSubcontractors(page = 1, opts: ListOpts & { trade?: string } = {}) {
  const { data } = await api.get<Paginated<Subcontractor>>('/subcontractors', {
    params: {
      per_page: opts.perPage ?? DEFAULT_PAGE_SIZE,
      page,
      search: opts.search || undefined,
      status: opts.status || undefined,
      trade: opts.trade || undefined,
    },
  })
  return data
}
export async function createSubcontractor(payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Subcontractor }>('/subcontractors', payload)
  return data.data ?? (data as unknown as Subcontractor)
}
export async function updateSubcontractor(id: number, payload: Record<string, unknown>) {
  const { data } = await api.put<{ data: Subcontractor }>(`/subcontractors/${id}`, payload)
  return data.data ?? (data as unknown as Subcontractor)
}
export async function listSubcontractPackages(projectId: number) {
  const { data } = await api.get<Paginated<SubcontractPackage>>(`/projects/${projectId}/subcontract-packages`, { params: { per_page: DEFAULT_PAGE_SIZE } })
  return data
}
export async function getSubcontractPackage(projectId: number, id: number) {
  const { data } = await api.get<{ data: SubcontractPackage }>(`/projects/${projectId}/subcontract-packages/${id}`)
  return data.data ?? (data as unknown as SubcontractPackage)
}
export async function createSubcontractPackage(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: SubcontractPackage }>(`/projects/${projectId}/subcontract-packages`, payload)
  return data.data ?? (data as unknown as SubcontractPackage)
}
export async function addSubcontractPackageItem(projectId: number, id: number, payload: Record<string, unknown>) {
  const { data } = await api.post(`/projects/${projectId}/subcontract-packages/${id}/items`, payload)
  return data
}
export async function awardSubcontractPackage(projectId: number, id: number) {
  const { data } = await api.post<{ data: SubcontractPackage }>(`/projects/${projectId}/subcontract-packages/${id}/award`)
  return data.data ?? (data as unknown as SubcontractPackage)
}
export async function activateSubcontractPackage(projectId: number, id: number) {
  const { data } = await api.post<{ data: SubcontractPackage }>(`/projects/${projectId}/subcontract-packages/${id}/activate`)
  return data.data ?? (data as unknown as SubcontractPackage)
}
export async function completeSubcontractPackage(projectId: number, id: number) {
  const { data } = await api.post<{ data: SubcontractPackage }>(`/projects/${projectId}/subcontract-packages/${id}/complete`)
  return data.data ?? (data as unknown as SubcontractPackage)
}
