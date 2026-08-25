import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <Link to="/admin" className="text-lg font-semibold">
          BidArena Admin
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          {user && (
            <span>
              {user.username} <span className="text-slate-600">·</span> {user.role}
            </span>
          )}
          <button onClick={handleLogout} className="rounded border border-slate-700 px-3 py-1 hover:bg-slate-800">
            Log out
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
