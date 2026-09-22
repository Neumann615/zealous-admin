import type { ReactNode } from 'react'
import { useHasPermission, useHasRole } from '../hooks'

interface PermissionGuardProps {
  permission?: string
  role?: string
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({ permission, role, fallback = null, children }: PermissionGuardProps) {
  const hasPermission = useHasPermission()
  const hasRole = useHasRole()

  if (permission && !hasPermission(permission))
    return <>{fallback}</>

  if (role && !hasRole(role))
    return <>{fallback}</>

  return <>{children}</>
}
