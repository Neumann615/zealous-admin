import type { LoginReq, LoginRes, UserInfoWithAuth } from '../types/user'
import { authRequest } from '../runtime/client'

export function login(data: LoginReq) {
  return authRequest<LoginRes>({ url: '/admin/login', method: 'POST', data })
}

export function logout() {
  return authRequest<null>({ url: '/admin/logout', method: 'POST' })
}

export function getUserInfo() {
  return authRequest<UserInfoWithAuth>({ url: '/admin/info' })
}

export function refreshToken() {
  return authRequest<LoginRes>({ url: '/admin/refreshToken' })
}

export function updatePassword(data: { oldPassword: string, newPassword: string }) {
  return authRequest<null>({ url: '/admin/updatePassword', method: 'POST', data })
}
