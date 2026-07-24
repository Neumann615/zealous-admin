import { useState } from 'react'
import { useUserStore } from '../store/user'

// ==================== 命令式方法（供 http 拦截器等非组件场景调用） ====================

/** 命令式登录 — 直接调用 store，不依赖 React */
export async function loginAction(params: { username: string, password: string }) {
  await useUserStore.getState().userLogin(params)
}

/** 命令式登出 — 清 token + 清持久化 + 跳转登录页 */
export function logoutAction() {
  useUserStore.getState().fedLogout()
  const keys = Object.keys(localStorage).filter(k => k.startsWith('zealous-admin-'))
  keys.forEach(k => localStorage.removeItem(k))
  window.location.replace('/login')
}

// ==================== React Hooks ====================

/**
 * 登录 Hook — 封装完整的登录流程
 * 外部只需调用 login()，无需关心 store、loading 等细节
 */
export function useLogin() {
  const [loading, setLoading] = useState(false)
  const userLogin = useUserStore(state => state.userLogin)

  const login = async (params: { username: string, password: string }) => {
    setLoading(true)
    try {
      await userLogin(params)
      return true
    }
    catch {
      return false
    }
    finally {
      setLoading(false)
    }
  }

  return { login, loading }
}

/**
 * 登出 Hook — 封装完整的登出流程（调接口 + 清持久化 + 跳转登录页）
 */
export function useLogout() {
  const userLogout = useUserStore(state => state.userLogout)

  const logout = async () => {
    await userLogout()
    // 清除所有 zustand 持久化配置
    const keys = Object.keys(localStorage).filter(k => k.startsWith('zealous-admin-'))
    keys.forEach(k => localStorage.removeItem(k))
    // 硬刷新确保所有 store 恢复到初始状态
    window.location.replace('/login')
  }

  return { logout }
}
