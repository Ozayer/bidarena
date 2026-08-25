import { Navigate, Outlet } from 'react-router-dom'
import type { AuthUser } from '../store/auth'
import { useAuthStore } from '../store/auth'

export default function ProtectedRoute({ allowedRoles }: { allowedRoles?: AuthUser['role'][] }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)

  if (!token) return <Navigate to="/login" replace />
  if (status !== 'ready') return <div className="p-6 text-slate-400">Loading…</div>
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <div className="p-6 text-red-400">You don't have access to this area.</div>
  }
  return <Outlet />
}
