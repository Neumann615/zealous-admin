import type { FrontendMenu, LoginReq, MenuRecord, UserInfoWithAuth } from '../types'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getUserInfo as fetchUserInfo, login as loginApi, logout as logoutApi, refreshToken as refreshTokenApi } from '../api/auth'

interface UserState {
  token: string
  userInfo: UserInfoWithAuth | null
  userLogin: (params: LoginReq) => Promise<void>
  fetchUserInfo: () => Promise<void>
  refreshSession: () => Promise<void>
  userLogout: () => Promise<void>
  fedLogout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      token: '',
      userInfo: null,

      userLogin: async (params) => {
        const res = await loginApi(params)
        set({ token: res.tokenHead + res.token })
        await get().fetchUserInfo()
      },

      fetchUserInfo: async () => {
        const info = await fetchUserInfo()
        set({ userInfo: info })
      },

      refreshSession: async () => {
        const res = await refreshTokenApi()
        set({ token: res.tokenHead + res.token })
        await get().fetchUserInfo()
      },

      userLogout: async () => {
        try { await logoutApi() }
        catch { /* ignore */ }
        set({ token: '', userInfo: null })
      },

      fedLogout: () => {
        set({ token: '', userInfo: null })
      },
    }),
    {
      name: 'zealous-admin-auth-user',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ token: state.token, userInfo: state.userInfo }),
    },
  ),
)

export function getToken(): string {
  return useUserStore.getState().token
}

export function getMenus(): MenuRecord[] {
  return (useUserStore.getState().userInfo?.menus ?? []) as MenuRecord[]
}

export function getFrontendMenus(): FrontendMenu[] {
  return convertMenus(getMenus())
}

export function convertMenus(menus: MenuRecord[]): FrontendMenu[] {
  if (!menus?.length)
    return []

  const menuMap = new Map<number, MenuRecord[]>()
  for (const menu of menus) {
    const pid = menu.parentId || 0
    if (!menuMap.has(pid))
      menuMap.set(pid, [])
    menuMap.get(pid)!.push(menu)
  }

  function buildTree(parentId: number, parentKey: string = ''): FrontendMenu[] {
    const children = menuMap.get(parentId) || []
    return children
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .map((menu) => {
        const currentKey = menu.path || (parentKey ? `${parentKey}/${menu.name}` : `/${menu.name}`)
        const childTree = buildTree(menu.id || 0, currentKey)

        if (menu.hidden === 1)
          return null as any

        const node: FrontendMenu = {
          id: String(menu.id || menu.name),
          label: menu.title || menu.name,
          icon: menu.icon || '',
          key: currentKey,
          selectIcon: menu.activeIcon || '',
        }
        if (childTree.length > 0)
          node.children = childTree

        return node
      })
      .filter(Boolean)
  }

  return buildTree(0)
}
