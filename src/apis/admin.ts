import type { Admin, CommonPage, LoginParam, LoginResult, PageParam, Role, UserInfoResult } from '@zealous-admin/layout/index'
import { http } from '@zealous-admin/layout/index'

/**
 * 后台管理员登录以后返回token
 */
export function adminLoginAPI(data: LoginParam) {
  return http<LoginResult>({
    method: 'POST',
    url: '/admin/login',
    data,
  })
}

/**
 * 后台管理员退出登录
 */
export function adminLogoutAPI() {
  return http({
    method: 'POST',
    url: '/admin/logout',
  })
}

/**
 * 获取当前登录用户信息
 */
export function getAdminInfoAPI() {
  return http<UserInfoResult>({
    method: 'GET',
    url: '/admin/info',
  })
}

/**
 * 根据用户名或姓名分页获取用户列表
 */
export function getAdminListAPI(params: PageParam) {
  return http<CommonPage<Admin>>({
    url: '/admin/list',
    method: 'get',
    params,
  })
}

/**
 * 后台用户注册
 */
export function adminRegisterAPI(data: Admin) {
  return http({
    url: '/admin/register',
    method: 'post',
    data,
  })
}

/**
 * 根据ID修改指定用户信息
 */
export function adminUpdateByIdAPI(id: number, data: Admin) {
  return http({
    url: `/admin/update/${id}`,
    method: 'post',
    data,
  })
}

/**
 * 根据用户ID修改账号启用状态
 */
export function adminUpdateStatusByIdAPI(id: number, params: { status: number }) {
  return http({
    url: `/admin/updateStatus/${id}`,
    method: 'post',
    params,
  })
}

/**
 * 根据ID删除用户
 */
export function adminDeleteByIdAPI(id: number) {
  return http({
    url: `/admin/delete/${id}`,
    method: 'post',
  })
}

/**
 * 根据用户ID获取分配的角色
 */
export function getRoleByAdminIdAPI(id: number) {
  return http<Role[]>({
    url: `/admin/role/${id}`,
    method: 'get',
  })
}

/**
 * 给指定ID的用户分配角色
 */
export function adminRoleUpdateAPI(params: { roleIds: string, adminId: number }) {
  return http({
    url: '/admin/role/update',
    method: 'post',
    params,
  })
}
