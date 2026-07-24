import type { LoginParam, LoginResult, UserInfo, UserInfoResult } from '../types/admin'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import http from '../utils/http'

// ==================== Auth API（内置在 layout 包中，保证完整性） ====================

function adminLoginAPI(data: LoginParam) {
  return http<LoginResult>({
    method: 'POST',
    url: '/admin/login',
    data,
  })
}

function adminLogoutAPI() {
  return http({
    method: 'POST',
    url: '/admin/logout',
  })
}

function getAdminInfoAPI() {
  return http<UserInfoResult>({
    method: 'GET',
    url: '/admin/info',
  })
}

// ==================== User Store ====================

interface UserState {
  userInfo: UserInfo
  userLogin: (loginParam: { username: string, password: string }) => Promise<void>
  getUserInfo: () => Promise<void>
  userLogout: () => Promise<void>
  fedLogout: () => void
}

export const useUserStore = create<UserState>()(
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
        set(state => ({
          userInfo: {
            ...state.userInfo,
            roles: res.data.roles || [],
            menus: res.data.menus || [],
            avatar: res.data.icon,
            email: res.data.email,
            status: res.data.status,
            loginTime: res.data.loginTime,
            nickName: (res.data as any).nickName || '',
          },
        }))
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
