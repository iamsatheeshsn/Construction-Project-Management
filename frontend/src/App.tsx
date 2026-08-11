import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './modules/auth/AuthContext'
import { LoginPage } from './modules/auth/LoginPage'
import { RegisterPage } from './modules/auth/RegisterPage'
import { ProtectedRoute } from './app/router/ProtectedRoute'
import { OpsSectionRedirect, OpsSectionRoute } from './app/router/OpsSectionRoute'
import { AdminLayout } from './app/layouts/AdminLayout'
import { DashboardPage } from './modules/dashboard/DashboardPage'
import { CompaniesPage } from './modules/organization/CompaniesPage'
import { ClientsPage } from './modules/organization/ClientsPage'
import { ProjectsPage } from './modules/projects/ProjectsPage'
import { ProjectDetailPage } from './modules/projects/ProjectDetailPage'
import { AuditPage } from './modules/audit/AuditPage'
import {
  TenantsPage,
  TenantRegistrationPage,
  PlansPage,
  TrialsPage,
  BillingPage,
  FeaturesPage,
  BrandingPage,
  UsagePage,
  SaasAuditPage,
} from './modules/saas'
import { UsersPage, RolesPage, PermissionsPage, PoliciesPage } from './modules/rbac'
import { WorkspaceBrandingPage } from './modules/system/WorkspaceBrandingPage'
import { UiProvider } from './ui'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />

                  <Route path="organization/companies" element={<CompaniesPage />} />
                  <Route path="organization/clients" element={<ClientsPage />} />
                  <Route path="organization/projects" element={<ProjectsPage />} />
                  <Route path="organization/projects/:projectId" element={<ProjectDetailPage />} />

                  <Route path="operations" element={<OpsSectionRedirect />} />
                  <Route path="operations/:section" element={<OpsSectionRoute />} />

                  <Route path="saas/tenants" element={<TenantsPage />} />
                  <Route path="saas/registration" element={<TenantRegistrationPage />} />
                  <Route path="saas/plans" element={<PlansPage />} />
                  <Route path="saas/trials" element={<TrialsPage />} />
                  <Route path="saas/billing" element={<BillingPage />} />
                  <Route path="saas/features" element={<FeaturesPage />} />
                  <Route path="saas/branding" element={<BrandingPage />} />
                  <Route path="saas/usage" element={<UsagePage />} />
                  <Route path="saas/audit" element={<SaasAuditPage />} />

                  <Route path="rbac/roles" element={<RolesPage />} />
                  <Route path="rbac/permissions" element={<PermissionsPage />} />
                  <Route path="rbac/policies" element={<PoliciesPage />} />
                  <Route path="rbac/users" element={<UsersPage />} />

                  <Route path="system/audit" element={<AuditPage />} />
                  <Route path="system/branding" element={<WorkspaceBrandingPage />} />

                  {/* Legacy redirects — keep old bookmarks working */}
                  <Route path="companies" element={<Navigate to="/admin/organization/companies" replace />} />
                  <Route path="clients" element={<Navigate to="/admin/organization/clients" replace />} />
                  <Route path="projects" element={<Navigate to="/admin/organization/projects" replace />} />
                  <Route path="projects/:projectId" element={<LegacyProjectRedirect />} />
                  <Route path="ops" element={<Navigate to="/admin/operations" replace />} />
                  <Route path="audit" element={<Navigate to="/admin/system/audit" replace />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </UiProvider>
    </QueryClientProvider>
  )
}

function LegacyProjectRedirect() {
  const { projectId } = useParams()
  return <Navigate to={`/admin/organization/projects/${projectId}`} replace />
}
