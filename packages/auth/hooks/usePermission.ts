import { useMemo } from 'react'
import { useUserStore } from '../store/user'

export function useMenus() {
  const userInfo = useUserStore(state => state.userInfo)
  return useMemo(() => userInfo?.menus ?? [], [userInfo])
}

export function usePermissions() {
  const userInfo = useUserStore(state => state.userInfo)
  return useMemo(() => {
    const perms = (userInfo as any)?.permissions as string[] | undefined
    return perms ?? []
  }, [userInfo])
}

export function useHasPermission() {
  const permissions = usePermissions()
  return (permission: string) => {
    if (permissions.includes('*'))
      return true
    return permissions.includes(permission)
  }
}
