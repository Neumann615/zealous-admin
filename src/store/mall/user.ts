import type { LoginParam, UserInfo } from '@/types/admin'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { adminLoginAPI, adminLogoutAPI, getAdminInfoAPI } from '@/apis/admin'

interface UserState {
  userInfo: UserInfo
  userLogin: (loginParam: { username: string, password: string }) => Promise<void>
  getUserInfo: () => Promise<void>
  userLogout: () => Promise<void>
  fedLogout: () => void
}

export const useMallUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      userInfo: {
        username: '',
        password: '',
        avatar: '',
        roles: [],
        token: '',
        menus: [],
        email: '',
        status: 1,
        loginTime: '',
        nickName: '',
      },

      userLogin: async (loginParam: LoginParam) => {
        const res = await adminLoginAPI(loginParam)
        const tokenStr = res.data.tokenHead + res.data.token
        set(state => ({
          userInfo: {
            ...state.userInfo,
            token: tokenStr,
            username: loginParam.username,
            password: loginParam.password,
          },
        }))
        await get().getUserInfo()
      },

      getUserInfo: async () => {
        const res = await getAdminInfoAPI()
        if (res.data.roles && res.data.roles.length > 0) {
          set(state => ({
            userInfo: {
              ...state.userInfo,
              roles: res.data.roles,
              menus: res.data.menus,
              avatar: res.data.icon,
              email: res.data.email,
              status: res.data.status,
              loginTime: res.data.loginTime,
              nickName: (res.data as any).nickName || '',
            },
          }))
        }
        else {
          throw new Error('该用户暂未分配角色，请先分配角色！')
        }
      },

      userLogout: async () => {
        await adminLogoutAPI()
        set(state => ({
          userInfo: {
            ...state.userInfo,
            token: '',
            roles: [],
          },
        }))
      },

      fedLogout: () => {
        set(state => ({
          userInfo: {
            ...state.userInfo,
            token: '',
          },
        }))
      },
    }),
    {
      name: 'zealous-admin-' + 'mall-user',
      storage: true
        ? createJSONStorage(() =>
            true ? localStorage : sessionStorage,
          )
        : undefined,
    },
  ),
)
