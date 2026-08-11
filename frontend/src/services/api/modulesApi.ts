import api from '../api/client'

export type Company = {
  id: number
  name: string
  legal_name?: string | null
  trade_license_no?: string | null
  tax_number?: string | null
  email?: string | null
  phone?: string | null
  address_line1?: string | null
  city?: string | null
  country_code?: string | null
  is_primary: boolean
}

export type Client = {
  id: number
  name: string
  code?: string | null
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  country_code?: string | null
}

export type Project = {
  id: number
  project_code: string
  name: string
  description?: string | null
  location?: string | null
  currency: string
  status: string
  start_date?: string | null
  end_date?: string | null
  budget_amount?: string | number
  contract_value?: string | number
  progress_percent?: string | number
  company_id?: number | null
  client_id?: number | null
  company?: { id: number; name: string } | null
  client?: { id: number; name: string; code?: string | null } | null
  members_count?: number
  wbs_count?: number
}

export type WbsNode = {
  id: number
  project_id: number
  parent_id?: number | null
  code: string
  name: string
  description?: string | null
  level: number
  sort_order: number
  progress_percent?: string | number
  children?: WbsNode[]
}

type Paginated<T> = {
  data: T[]
  meta?: { current_page: number; last_page: number; per_page: number; total: number; from?: number | null; to?: number | null }
}

const PAGE_SIZE = 10

export async function listCompanies(search = '', page = 1, perPage: number = PAGE_SIZE) {
  const { data } = await api.get<Paginated<Company>>('/companies', { params: { search, page, per_page: perPage } })
  return data
}

export async function createCompany(payload: Partial<Company>) {
  const { data } = await api.post<{ data: Company }>('/companies', payload)
  return data.data ?? (data as unknown as Company)
}

export async function updateCompany(id: number, payload: Partial<Company>) {
  const { data } = await api.put<{ data: Company }>(`/companies/${id}`, payload)
  return data.data ?? (data as unknown as Company)
}

export async function deleteCompany(id: number) {
  await api.delete(`/companies/${id}`)
}

export async function listClients(search = '', page = 1, perPage: number = PAGE_SIZE) {
  const { data } = await api.get<Paginated<Client>>('/clients', { params: { search, page, per_page: perPage } })
  return data
}

export async function createClient(payload: Partial<Client>) {
  const { data } = await api.post<{ data: Client }>('/clients', payload)
  return data.data ?? (data as unknown as Client)
}

export async function updateClient(id: number, payload: Partial<Client>) {
  const { data } = await api.put<{ data: Client }>(`/clients/${id}`, payload)
  return data.data ?? (data as unknown as Client)
}

export async function deleteClient(id: number) {
  await api.delete(`/clients/${id}`)
}

export async function listProjects(params: { search?: string; status?: string; page?: number; per_page?: number } = {}) {
  const { data } = await api.get<Paginated<Project>>('/projects', {
    params: { ...params, per_page: params.per_page ?? PAGE_SIZE, page: params.page ?? 1 },
  })
  return data
}

export async function getProject(id: number) {
  const { data } = await api.get<{ data: Project }>(`/projects/${id}`)
  return data.data ?? (data as unknown as Project)
}

export async function createProject(payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Project }>('/projects', payload)
  return data.data ?? (data as unknown as Project)
}

export async function updateProject(id: number, payload: Record<string, unknown>) {
  const { data } = await api.put<{ data: Project }>(`/projects/${id}`, payload)
  return data.data ?? (data as unknown as Project)
}

export async function deleteProject(id: number) {
  await api.delete(`/projects/${id}`)
}

export async function listWbs(projectId: number) {
  const { data } = await api.get<{ data: WbsNode[] }>(`/projects/${projectId}/wbs`)
  return data.data
}

export async function createWbs(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: WbsNode }>(`/projects/${projectId}/wbs`, payload)
  return data.data ?? (data as unknown as WbsNode)
}

export async function updateWbs(projectId: number, wbsId: number, payload: Record<string, unknown>) {
  const { data } = await api.put<{ data: WbsNode }>(`/projects/${projectId}/wbs/${wbsId}`, payload)
  return data.data ?? (data as unknown as WbsNode)
}

export async function deleteWbs(projectId: number, wbsId: number) {
  await api.delete(`/projects/${projectId}/wbs/${wbsId}`)
}

export type TaskItem = {
  id: number
  project_id: number
  wbs_id?: number | null
  task_code?: string | null
  name: string
  description?: string | null
  status: string
  priority: string
  planned_start_date?: string | null
  planned_end_date?: string | null
  baseline_start_date?: string | null
  baseline_end_date?: string | null
  duration_days?: string | number | null
  progress_percent?: string | number
  wbs?: { id: number; code: string; name: string } | null
  predecessors?: TaskDependency[]
}

export type TaskDependency = {
  id: number
  predecessor_task_id: number
  successor_task_id: number
  dependency_type: 'FS' | 'SS' | 'FF' | 'SF'
  lag_days?: string | number
}

export type GanttPayload = {
  range: { start: string | null; end: string | null }
  tasks: TaskItem[]
  dependencies: TaskDependency[]
}

export async function listTasks(projectId: number, params: { search?: string; status?: string } = {}) {
  const { data } = await api.get<Paginated<TaskItem>>(`/projects/${projectId}/tasks`, { params })
  return data
}

export async function createTask(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: TaskItem }>(`/projects/${projectId}/tasks`, payload)
  return data.data ?? (data as unknown as TaskItem)
}

export async function updateTask(projectId: number, taskId: number, payload: Record<string, unknown>) {
  const { data } = await api.put<{ data: TaskItem }>(`/projects/${projectId}/tasks/${taskId}`, payload)
  return data.data ?? (data as unknown as TaskItem)
}

export async function deleteTask(projectId: number, taskId: number) {
  await api.delete(`/projects/${projectId}/tasks/${taskId}`)
}

export async function getGantt(projectId: number) {
  const { data } = await api.get<{ data: GanttPayload }>(`/projects/${projectId}/gantt`)
  return data.data
}

export async function createDependency(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: TaskDependency }>(`/projects/${projectId}/dependencies`, payload)
  return data.data ?? (data as unknown as TaskDependency)
}

export async function deleteDependency(projectId: number, dependencyId: number) {
  await api.delete(`/projects/${projectId}/dependencies/${dependencyId}`)
}

export type Boq = {
  id: number
  project_id: number
  title: string
  version: string
  status: string
  currency: string
  total_amount: string | number
  notes?: string | null
  items_count?: number
  items?: BoqItem[]
}

export type BoqItem = {
  id: number
  boq_id: number
  item_no: string
  description: string
  unit?: string | null
  quantity: string | number
  rate: string | number
  amount: string | number
  wbs_id?: number | null
  cost_code_id?: number | null
  wbs?: { id: number; code: string; name: string } | null
  cost_code?: { id: number; code: string; name: string } | null
}

export type Contract = {
  id: number
  project_id: number
  client_id?: number | null
  contract_no: string
  title: string
  contract_type: string
  status: string
  currency: string
  contract_value: string | number
  retention_percent?: string | number
  advance_percent?: string | number
  start_date?: string | null
  end_date?: string | null
  client?: { id: number; name: string; code?: string | null } | null
  items_count?: number
  items?: ContractItem[]
}

export type ContractItem = {
  id: number
  contract_id: number
  boq_item_id?: number | null
  description: string
  unit?: string | null
  quantity: string | number
  rate: string | number
  amount: string | number
}

export type CostCode = {
  id: number
  code: string
  name: string
  category?: string | null
}

export async function listBoqs(projectId: number) {
  const { data } = await api.get<Paginated<Boq>>(`/projects/${projectId}/boqs`)
  return data
}

export async function getBoq(projectId: number, boqId: number) {
  const { data } = await api.get<{ data: Boq }>(`/projects/${projectId}/boqs/${boqId}`)
  return data.data ?? (data as unknown as Boq)
}

export async function createBoq(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Boq }>(`/projects/${projectId}/boqs`, payload)
  return data.data ?? (data as unknown as Boq)
}

export async function approveBoq(projectId: number, boqId: number) {
  const { data } = await api.post<{ data: Boq }>(`/projects/${projectId}/boqs/${boqId}/approve`)
  return data.data ?? (data as unknown as Boq)
}

export async function deleteBoq(projectId: number, boqId: number) {
  await api.delete(`/projects/${projectId}/boqs/${boqId}`)
}

export async function createBoqItem(projectId: number, boqId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: BoqItem }>(`/projects/${projectId}/boqs/${boqId}/items`, payload)
  return data.data ?? (data as unknown as BoqItem)
}

export async function deleteBoqItem(projectId: number, boqId: number, itemId: number) {
  await api.delete(`/projects/${projectId}/boqs/${boqId}/items/${itemId}`)
}

export async function listCostCodes(projectId: number) {
  const { data } = await api.get<Paginated<CostCode>>(`/projects/${projectId}/cost-codes`)
  return data
}

export async function createCostCode(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: CostCode }>(`/projects/${projectId}/cost-codes`, payload)
  return data.data ?? (data as unknown as CostCode)
}

export async function listContracts(projectId: number) {
  const { data } = await api.get<Paginated<Contract>>(`/projects/${projectId}/contracts`)
  return data
}

export async function getContract(projectId: number, contractId: number) {
  const { data } = await api.get<{ data: Contract }>(`/projects/${projectId}/contracts/${contractId}`)
  return data.data ?? (data as unknown as Contract)
}

export async function createContract(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Contract }>(`/projects/${projectId}/contracts`, payload)
  return data.data ?? (data as unknown as Contract)
}

export async function deleteContract(projectId: number, contractId: number) {
  await api.delete(`/projects/${projectId}/contracts/${contractId}`)
}

export async function importBoqIntoContract(projectId: number, contractId: number, importBoqId: number) {
  const { data } = await api.post(`/projects/${projectId}/contracts/${contractId}/items`, {
    import_boq_id: importBoqId,
  })
  return data
}

export type SiteDiary = {
  id: number
  project_id: number
  report_date: string
  weather?: string | null
  temperature_c?: string | number | null
  work_completed?: string | null
  work_planned?: string | null
  issues?: string | null
  delays?: string | null
  visitors?: string | null
  remarks?: string | null
  status: string
  labours_count?: number
  equipment_count?: number
  materials_count?: number
  labours?: SiteDiaryLabour[]
  equipment?: SiteDiaryEquipment[]
  materials?: SiteDiaryMaterial[]
}

export type SiteDiaryLabour = {
  id: number
  trade: string
  company_name?: string | null
  headcount: number
  hours: string | number
}

export type SiteDiaryEquipment = {
  id: number
  equipment_name: string
  quantity: number
  hours: string | number
}

export type SiteDiaryMaterial = {
  id: number
  material_name: string
  unit?: string | null
  quantity: string | number
}

export type DocumentRecord = {
  id: number
  project_id: number
  document_type: string
  title: string
  document_no?: string | null
  status: string
  current_version: number
  versions_count?: number
  versions?: DocumentVersion[]
}

export type DocumentVersion = {
  id: number
  version_no: number
  file_name: string
  mime_type?: string | null
  file_size?: number | null
  change_notes?: string | null
}

export type Rfi = {
  id: number
  project_id: number
  rfi_no: string
  subject: string
  description?: string | null
  discipline?: string | null
  status: string
  priority: string
  due_date?: string | null
  responses_count?: number
  attachments_count?: number
  responses?: RfiResponse[]
  attachments?: RfiAttachment[]
}

export type RfiResponse = {
  id: number
  response_text: string
  responded_by?: number | null
  responder?: { id: number; name: string; email: string } | null
  created_at?: string
}

export type RfiAttachment = {
  id: number
  document_id: number
  document?: { id: number; title: string; document_no?: string | null; document_type: string; status: string } | null
}

export async function listSiteDiaries(projectId: number) {
  const { data } = await api.get<Paginated<SiteDiary>>(`/projects/${projectId}/site-diaries`)
  return data
}

export async function getSiteDiary(projectId: number, diaryId: number) {
  const { data } = await api.get<{ data: SiteDiary }>(`/projects/${projectId}/site-diaries/${diaryId}`)
  return data.data ?? (data as unknown as SiteDiary)
}

export async function createSiteDiary(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: SiteDiary }>(`/projects/${projectId}/site-diaries`, payload)
  return data.data ?? (data as unknown as SiteDiary)
}

export async function updateSiteDiary(projectId: number, diaryId: number, payload: Record<string, unknown>) {
  const { data } = await api.put<{ data: SiteDiary }>(`/projects/${projectId}/site-diaries/${diaryId}`, payload)
  return data.data ?? (data as unknown as SiteDiary)
}

export async function submitSiteDiary(projectId: number, diaryId: number) {
  const { data } = await api.post<{ data: SiteDiary }>(`/projects/${projectId}/site-diaries/${diaryId}/submit`)
  return data.data ?? (data as unknown as SiteDiary)
}

export async function approveSiteDiary(projectId: number, diaryId: number) {
  const { data } = await api.post<{ data: SiteDiary }>(`/projects/${projectId}/site-diaries/${diaryId}/approve`)
  return data.data ?? (data as unknown as SiteDiary)
}

export async function addSiteDiaryLabour(projectId: number, diaryId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: SiteDiaryLabour }>(`/projects/${projectId}/site-diaries/${diaryId}/labours`, payload)
  return data.data ?? (data as unknown as SiteDiaryLabour)
}

export async function addSiteDiaryEquipment(projectId: number, diaryId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: SiteDiaryEquipment }>(`/projects/${projectId}/site-diaries/${diaryId}/equipment`, payload)
  return data.data ?? (data as unknown as SiteDiaryEquipment)
}

export async function addSiteDiaryMaterial(projectId: number, diaryId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: SiteDiaryMaterial }>(`/projects/${projectId}/site-diaries/${diaryId}/materials`, payload)
  return data.data ?? (data as unknown as SiteDiaryMaterial)
}

export async function listDocuments(projectId: number) {
  const { data } = await api.get<Paginated<DocumentRecord>>(`/projects/${projectId}/documents`)
  return data
}

export async function getDocument(projectId: number, documentId: number) {
  const { data } = await api.get<{ data: DocumentRecord }>(`/projects/${projectId}/documents/${documentId}`)
  return data.data ?? (data as unknown as DocumentRecord)
}

export async function createDocument(projectId: number, payload: FormData) {
  const { data } = await api.post<{ data: DocumentRecord }>(`/projects/${projectId}/documents`, payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data ?? (data as unknown as DocumentRecord)
}

export async function uploadDocumentVersion(projectId: number, documentId: number, payload: FormData) {
  const { data } = await api.post<{ data: DocumentVersion }>(
    `/projects/${projectId}/documents/${documentId}/versions`,
    payload,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data.data ?? (data as unknown as DocumentVersion)
}

export async function approveDocument(projectId: number, documentId: number) {
  const { data } = await api.post<{ data: DocumentRecord }>(`/projects/${projectId}/documents/${documentId}/approve`)
  return data.data ?? (data as unknown as DocumentRecord)
}

export async function listRfis(projectId: number) {
  const { data } = await api.get<Paginated<Rfi>>(`/projects/${projectId}/rfis`)
  return data
}

export async function getRfi(projectId: number, rfiId: number) {
  const { data } = await api.get<{ data: Rfi }>(`/projects/${projectId}/rfis/${rfiId}`)
  return data.data ?? (data as unknown as Rfi)
}

export async function createRfi(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Rfi }>(`/projects/${projectId}/rfis`, payload)
  return data.data ?? (data as unknown as Rfi)
}

export async function submitRfi(projectId: number, rfiId: number) {
  const { data } = await api.post<{ data: Rfi }>(`/projects/${projectId}/rfis/${rfiId}/submit`)
  return data.data ?? (data as unknown as Rfi)
}

export async function respondRfi(projectId: number, rfiId: number, responseText: string) {
  const { data } = await api.post<{ data: RfiResponse }>(`/projects/${projectId}/rfis/${rfiId}/responses`, {
    response_text: responseText,
  })
  return data.data ?? (data as unknown as RfiResponse)
}

export async function attachRfiDocument(projectId: number, rfiId: number, documentId: number) {
  const { data } = await api.post<{ data: RfiAttachment }>(`/projects/${projectId}/rfis/${rfiId}/attachments`, {
    document_id: documentId,
  })
  return data.data ?? (data as unknown as RfiAttachment)
}

export async function closeRfi(projectId: number, rfiId: number) {
  const { data } = await api.post<{ data: Rfi }>(`/projects/${projectId}/rfis/${rfiId}/close`)
  return data.data ?? (data as unknown as Rfi)
}

export type Submittal = {
  id: number
  project_id: number
  submittal_no: string
  title: string
  description?: string | null
  submittal_type: string
  status: string
  due_date?: string | null
  review_comments?: string | null
  attachments_count?: number
  attachments?: { id: number; document_id: number; document?: { id: number; title: string } | null }[]
}

export type Variation = {
  id: number
  project_id: number
  contract_id?: number | null
  variation_no: string
  title: string
  description?: string | null
  reason?: string | null
  status: string
  cost_impact: string | number
  time_impact_days: number
  items_count?: number
  items?: VariationItem[]
  contract?: { id: number; contract_no: string; title: string } | null
}

export type VariationItem = {
  id: number
  description: string
  unit?: string | null
  quantity: string | number
  rate: string | number
  amount: string | number
}

export type PaymentApplication = {
  id: number
  project_id: number
  contract_id?: number | null
  application_no: string
  period_start?: string | null
  period_end?: string | null
  status: string
  gross_amount: string | number
  retention_amount: string | number
  advance_recovery: string | number
  net_amount: string | number
  items_count?: number
  items?: PaymentApplicationItem[]
  certificate?: PaymentCertificate | null
  contract?: { id: number; contract_no: string; title: string } | null
}

export type PaymentApplicationItem = {
  id: number
  description: string
  previous_amount: string | number
  this_period_amount: string | number
  cumulative_amount: string | number
}

export type PaymentCertificate = {
  id: number
  certificate_no: string
  certified_amount: string | number
  retention_held: string | number
  certified_at?: string | null
  invoice?: Invoice | null
}

export type Invoice = {
  id: number
  invoice_no: string
  invoice_date: string
  due_date?: string | null
  currency: string
  subtotal: string | number
  tax_amount: string | number
  total_amount: string | number
  amount_paid: string | number
  status: string
  payment_certificate_id?: number | null
  payments?: PaymentRecord[]
}

export type PaymentRecord = {
  id: number
  payment_no?: string | null
  payment_date: string
  amount: string | number
  method: string
  reference?: string | null
}

export async function listSubmittals(projectId: number) {
  const { data } = await api.get<Paginated<Submittal>>(`/projects/${projectId}/submittals`)
  return data
}

export async function getSubmittal(projectId: number, id: number) {
  const { data } = await api.get<{ data: Submittal }>(`/projects/${projectId}/submittals/${id}`)
  return data.data ?? (data as unknown as Submittal)
}

export async function createSubmittal(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Submittal }>(`/projects/${projectId}/submittals`, payload)
  return data.data ?? (data as unknown as Submittal)
}

export async function submitSubmittal(projectId: number, id: number) {
  const { data } = await api.post<{ data: Submittal }>(`/projects/${projectId}/submittals/${id}/submit`)
  return data.data ?? (data as unknown as Submittal)
}

export async function reviewSubmittal(projectId: number, id: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Submittal }>(`/projects/${projectId}/submittals/${id}/review`, payload)
  return data.data ?? (data as unknown as Submittal)
}

export async function attachSubmittalDocument(projectId: number, id: number, documentId: number) {
  const { data } = await api.post(`/projects/${projectId}/submittals/${id}/attachments`, { document_id: documentId })
  return data
}

export async function listVariations(projectId: number) {
  const { data } = await api.get<Paginated<Variation>>(`/projects/${projectId}/variations`)
  return data
}

export async function getVariation(projectId: number, id: number) {
  const { data } = await api.get<{ data: Variation }>(`/projects/${projectId}/variations/${id}`)
  return data.data ?? (data as unknown as Variation)
}

export async function createVariation(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Variation }>(`/projects/${projectId}/variations`, payload)
  return data.data ?? (data as unknown as Variation)
}

export async function createVariationItem(projectId: number, id: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: VariationItem }>(`/projects/${projectId}/variations/${id}/items`, payload)
  return data.data ?? (data as unknown as VariationItem)
}

export async function submitVariation(projectId: number, id: number) {
  const { data } = await api.post<{ data: Variation }>(`/projects/${projectId}/variations/${id}/submit`)
  return data.data ?? (data as unknown as Variation)
}

export async function decideVariation(projectId: number, id: number, status: string) {
  const { data } = await api.post<{ data: Variation }>(`/projects/${projectId}/variations/${id}/decide`, { status })
  return data.data ?? (data as unknown as Variation)
}

export async function listPaymentApplications(projectId: number) {
  const { data } = await api.get<Paginated<PaymentApplication>>(`/projects/${projectId}/payment-applications`)
  return data
}

export async function getPaymentApplication(projectId: number, id: number) {
  const { data } = await api.get<{ data: PaymentApplication }>(`/projects/${projectId}/payment-applications/${id}`)
  return data.data ?? (data as unknown as PaymentApplication)
}

export async function createPaymentApplication(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: PaymentApplication }>(`/projects/${projectId}/payment-applications`, payload)
  return data.data ?? (data as unknown as PaymentApplication)
}

export async function createPaymentApplicationItem(projectId: number, id: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: PaymentApplicationItem }>(`/projects/${projectId}/payment-applications/${id}/items`, payload)
  return data.data ?? (data as unknown as PaymentApplicationItem)
}

export async function submitPaymentApplication(projectId: number, id: number) {
  const { data } = await api.post<{ data: PaymentApplication }>(`/projects/${projectId}/payment-applications/${id}/submit`)
  return data.data ?? (data as unknown as PaymentApplication)
}

export async function certifyPaymentApplication(projectId: number, id: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: PaymentCertificate }>(`/projects/${projectId}/payment-applications/${id}/certify`, payload)
  return data.data ?? (data as unknown as PaymentCertificate)
}

export async function listInvoices(projectId: number) {
  const { data } = await api.get<Paginated<Invoice>>(`/projects/${projectId}/invoices`)
  return data
}

export async function getInvoice(projectId: number, id: number) {
  const { data } = await api.get<{ data: Invoice }>(`/projects/${projectId}/invoices/${id}`)
  return data.data ?? (data as unknown as Invoice)
}

export async function createInvoice(projectId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: Invoice }>(`/projects/${projectId}/invoices`, payload)
  return data.data ?? (data as unknown as Invoice)
}

export async function recordInvoicePayment(projectId: number, invoiceId: number, payload: Record<string, unknown>) {
  const { data } = await api.post<{ data: PaymentRecord }>(`/projects/${projectId}/invoices/${invoiceId}/payments`, payload)
  return data.data ?? (data as unknown as PaymentRecord)
}
