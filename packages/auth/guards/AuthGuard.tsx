import { Navigate } from 'react-router'
import type { ReactNode } from 'react'
import { useUserStore } from '../store/user'

export function AuthGuard({ children }: { children: ReactNode }) {
  const token = useUserStore(state => state.token)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
