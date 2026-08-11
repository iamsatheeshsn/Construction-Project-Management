import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../modules/auth/AuthContext'
import { OpsCatalogPage, type OpsSection } from '../../modules/ops/OpsCatalogPage'

const SECTIONS: OpsSection[] = ['suppliers', 'inventory', 'warehouses', 'equipment', 'subcontractors']

const SECTION_PERMISSION: Record<OpsSection, string> = {
  suppliers: 'procurement.view',
  inventory: 'inventory.view',
  warehouses: 'inventory.view',
  equipment: 'equipment.view',
  subcontractors: 'subcontractors.view',
}

export function OpsSectionRedirect() {
  const { can } = useAuth()
  const first = SECTIONS.find((s) => can(SECTION_PERMISSION[s]))
  if (!first) return <Navigate to="/admin/dashboard" replace />
  return <Navigate to={`/admin/operations/${first}`} replace />
}

export function OpsSectionRoute() {
  const { section } = useParams<{ section: string }>()
  const { can } = useAuth()

  if (!section || !SECTIONS.includes(section as OpsSection)) {
    return <OpsSectionRedirect />
  }

  const typed = section as OpsSection
  if (!can(SECTION_PERMISSION[typed])) {
    return <OpsSectionRedirect />
  }

  return <OpsCatalogPage section={typed} />
}
