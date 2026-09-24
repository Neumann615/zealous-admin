import { useCallback, useState } from 'react'
import { useUserStore } from '../store/user'

export function useLogin() {
  const [loading, setLoading] = useState(false)
  const userLogin = useUserStore(state => state.userLogin)

  const login = useCallback(async (params: { username: string, password: string, captchaToken?: string }) => {
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
  }, [userLogin])

  return { login, loading }
}

export function useLogout() {
  const userLogout = useUserStore(state => state.userLogout)

  const logout = useCallback(async () => {
    await userLogout()
    window.location.replace('/login')
  }, [userLogout])

  return { logout }
}
