import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}
