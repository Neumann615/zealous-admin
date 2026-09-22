export { useLogin, useLogout } from '@zealous-admin/auth'

import { useUserStore } from '../store/user'

export async function loginAction(params: { username: string, password: string }) {
  await useUserStore.getState().userLogin(params)
}

export function logoutAction() {
  useUserStore.getState().fedLogout()
  const keys = Object.keys(localStorage).filter(k => k.startsWith('zealous-admin-'))
  keys.forEach(k => localStorage.removeItem(k))
  window.location.replace('/login')
}
