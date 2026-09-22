import { useCallback } from 'react'
import { useUserStore } from '../store/user'

export function useUserInfo() {
  const userInfo = useUserStore(state => state.userInfo)
  const fetchUserInfo = useUserStore(state => state.fetchUserInfo)
  return { userInfo, fetchUserInfo }
}

export function useIsAuthenticated() {
  const token = useUserStore(state => state.token)
  return Boolean(token)
}

export function useRoles() {
  const roles = useUserStore(state => state.userInfo?.roles ?? [])
  return roles
}

export function useHasRole() {
  const roles = useRoles()
  return useCallback(
    (role: string) => roles.includes(role),
    [roles],
  )
}
