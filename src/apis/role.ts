import type { CommonPage, PageParam } from '@/types/common'
import type { Menu } from '@/types/menu'
import type { Role } from '@/types/role'
import http from '@/utils/http'

/**
 * 获取所有角色列表（不分页）
 */
export function getRoleListAllAPI() {
  return http<Role[]>({
    url: '/role/all',
    method: 'get',
  })
}

/**
 * 根据角色名称分页获取角色列表
 */
export function getRoleListAPI(params: PageParam) {
  return http<CommonPage<Role>>({
    url: '/role/list',
    method: 'get',
    params,
  })
}

/**
 * 添加角色
 */
export function roleCreateAPI(data: Role) {
  return http({
    url: '/role/create',
    method: 'post',
    data,
  })
}

/**
 * 根据ID修改角色
 */
export function roleUpdateByIdAPI(id: number, data: Role) {
  return http({
    url: `/role/update/${id}`,
    method: 'post',
    data,
  })
}

/**
 * 根据ID删除角色
 */
export function roleDeleteByIdAPI(id: number) {
  return http({
    url: `/role/delete/${id}`,
    method: 'post',
  })
}

/**
 * 根据角色ID获取菜单列表
 */
export function roleListMenuByRoleIdAPI(roleId: number) {
  return http<Menu[]>({
    url: `/role/menu/${roleId}`,
    method: 'get',
  })
}

/**
 * 给角色分配菜单
 */
export function roleAllocMenuAPI(params: {
  roleId: number
  menuIds: string
}) {
  return http({
    url: '/role/menu/update',
    method: 'post',
    params,
  })
}
