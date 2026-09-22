import type { AdminRecord } from '../types/user'
import type { CommonPage, PageParam } from '../types/common'
import { authRequest } from '../runtime/client'

export function getUserPage(params: PageParam) {
  return authRequest<CommonPage<AdminRecord>>({ url: '/admin/list', params })
}

export function getUserDetail(id: number) {
  return authRequest<AdminRecord>({ url: `/admin/${id}` })
}

export function createUser(data: AdminRecord) {
  return authRequest<AdminRecord>({ url: '/admin/register', method: 'POST', data })
}

export function updateUser(id: number, data: Partial<AdminRecord>) {
  return authRequest<AdminRecord>({ url: `/admin/update/${id}`, method: 'POST', data })
}

export function deleteUser(id: number) {
  return authRequest<null>({ url: `/admin/delete/${id}`, method: 'POST' })
}

export function updateUserStatus(id: number, status: number) {
  return authRequest<null>({ url: `/admin/updateStatus/${id}`, method: 'POST', params: { status } })
}

export function getUserRoles(adminId: number) {
  return authRequest<any[]>({ url: `/admin/role/${adminId}` })
}

export function assignUserRoles(params: { adminId: number, roleIds: string }) {
  return authRequest<null>({ url: '/admin/role/update', method: 'POST', params })
}
