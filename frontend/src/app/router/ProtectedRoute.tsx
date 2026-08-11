import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../modules/auth/AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="center">Loading session…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
