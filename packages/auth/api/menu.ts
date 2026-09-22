import type { MenuRecord } from '../types/menu'
import { authRequest } from '../runtime/client'

export function getMenuTree() {
  return authRequest<any[]>({ url: '/menu/tree' })
}

export function getMenuAll() {
  return authRequest<MenuRecord[]>({ url: '/menu/all' })
}

export function getMenuList(parentId?: number) {
  return authRequest<MenuRecord[]>({ url: '/menu/list', params: parentId !== undefined ? { parentId } : undefined })
}

export function getMenuDetail(id: number) {
  return authRequest<MenuRecord>({ url: `/menu/${id}` })
}

export function createMenu(data: Partial<MenuRecord>) {
  return authRequest<MenuRecord>({ url: '/menu/create', method: 'POST', data })
}

export function updateMenu(id: number, data: Partial<MenuRecord>) {
  return authRequest<MenuRecord>({ url: `/menu/update/${id}`, method: 'POST', data })
}

export function updateMenuStatus(id: number, hidden: number) {
  return authRequest<MenuRecord>({ url: `/menu/update/${id}`, method: 'POST', data: { hidden } })
}

export function deleteMenu(id: number) {
  return authRequest<null>({ url: `/menu/delete/${id}`, method: 'POST' })
}
