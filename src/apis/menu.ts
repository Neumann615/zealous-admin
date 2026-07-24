import type { CommonPage, Menu, MenuNode, PageParam } from '@zealous-admin/layout/index'
import { http } from '@zealous-admin/layout/index'

/**
 * 树形结构返回所有菜单列表
 */
export function getMenuTreeListAPI() {
  return http<MenuNode[]>({
    url: '/menu/tree',
    method: 'get',
  })
}

/**
 * 根据上级菜单ID分页查询菜单
 */
export function getMenuListByParentIdAPI(parentId: number, params: PageParam) {
  return http<CommonPage<Menu>>({
    url: '/menu/list',
    method: 'get',
    params: { ...params, parentId },
  })
}

/**
 * 根据ID删除后台菜单
 */
export function deleteMenuByIdAPI(id: number) {
  return http({
    url: `/menu/delete/${id}`,
    method: 'post',
  })
}

/**
 * 添加后台菜单
 */
export function menuCreateAPI(data: Menu) {
  return http({
    url: '/menu/create',
    method: 'post',
    data,
  })
}

/**
 * 修改后台菜单
 */
export function updateMenu(id: number, data: Menu) {
  return http({
    url: `/menu/update/${id}`,
    method: 'post',
    data,
  })
}

/**
 * 根据ID获取菜单详情
 */
export function getMenuByIdAPI(id: number) {
  return http<Menu>({
    url: `/menu/${id}`,
    method: 'get',
  })
}

/**
 * 获取所有菜单（扁平列表）
 */
export function getMenuAllAPI() {
  return http<Menu[]>({
    url: '/menu/all',
    method: 'get',
  })
}
