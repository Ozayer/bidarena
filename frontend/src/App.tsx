import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/LoginPage'
import TournamentFormPage from './pages/admin/TournamentFormPage'
import TournamentWorkspace from './pages/admin/TournamentWorkspace'
import TournamentsListPage from './pages/admin/TournamentsListPage'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import RoomDisplay from './pages/viewer/RoomDisplay'
import ViewerRoom from './pages/viewer/ViewerRoom'
import { useAuthStore } from './store/auth'

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser)

  useEffect(() => {
    loadUser()
  }, [loadUser])

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/viewer" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute allowedRoles={['super_admin', 'tournament_admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<TournamentsListPage />} />
          <Route path="tournaments/new" element={<TournamentFormPage />} />
          <Route path="tournaments/:id/edit" element={<TournamentFormPage />} />
          <Route path="tournaments/:id" element={<TournamentWorkspace />} />
        </Route>
      </Route>

      <Route path="/owner/*" element={<OwnerDashboard />} />
      <Route path="/viewer" element={<ViewerRoom />} />
      <Route path="/room-display" element={<RoomDisplay />} />
    </Routes>
  )
}
