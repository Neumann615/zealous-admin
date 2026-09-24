import type { LoginReq, LoginRes, UserInfoWithAuth } from '../types/user'
import { authRequest } from '../runtime/client'

export function login(data: LoginReq) {
  return authRequest<LoginRes>({ url: '/admin/login', method: 'POST', data })
}

export function getLoginState(username: string) {
  return authRequest<{ captchaRequired: boolean }>({ url: '/admin/login/state', params: { username } })
}

export function createSliderCaptcha() {
  return authRequest<{ captchaId: string, bgUrl: string, puzzleUrl: string }>({ url: '/admin/captcha' })
}

export function verifySliderCaptcha(data: { captchaId: string, username: string, x: number, y: number, duration: number, trail: Array<[number, number]> }) {
  return authRequest<{ captchaToken: string }>({ url: '/admin/captcha/verify', method: 'POST', data })
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
