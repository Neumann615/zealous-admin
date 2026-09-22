import type { CreateRoleReq, RoleRecord, UpdateRoleReq } from '../types/role'
import type { CommonPage, PageParam } from '../types/common'
import { authRequest } from '../runtime/client'

export function getRolePage(params: PageParam) {
  return authRequest<CommonPage<RoleRecord>>({ url: '/role/list', params })
}

export function getRoleAll() {
  return authRequest<RoleRecord[]>({ url: '/role/all' })
}

export function getRoleDetail(id: number) {
  return authRequest<RoleRecord>({ url: `/role/${id}` })
}

export function createRole(data: CreateRoleReq) {
  return authRequest<RoleRecord>({ url: '/role/create', method: 'POST', data })
}

export function updateRole(id: number, data: UpdateRoleReq) {
  return authRequest<RoleRecord>({ url: `/role/update/${id}`, method: 'POST', data })
}

export function deleteRole(id: number) {
  return authRequest<null>({ url: `/role/delete/${id}`, method: 'POST' })
}

export function getRoleMenus(roleId: number) {
  return authRequest<any[]>({ url: `/role/menu/${roleId}` })
}

export function assignRoleMenus(params: { roleId: number, menuIds: string }) {
  return authRequest<null>({ url: '/role/menu/update', method: 'POST', params })
}
