import type { NextFunction, Request, Response } from 'express'
import { forbidden } from '../lib/response'
import { recordPermissionDenied } from '../modules/monitor/audit'

/**
 * 接口 → 权限标识映射。
 *
 * 权限标识本身是否存在、授予了谁，完全由 za_menu（type/permission 列）与 za_role_menu_relation 决定；
 * 这里只声明「哪个接口需要哪个标识」，未列入表中的接口一律 403（见 service 单测的路由覆盖校验）。
 * permission 为数组时表示任一命中即放行，用于跨页面复用的只读接口。
 */
export interface RoutePermissionRule {
  method: string
  path: string
  permission: string[]
}

/** 不做权限校验的接口：会话自身、公开采集入口、公共字典、被其它模块复用的只读查询 */
export const UNPROTECTED_ROUTES: Array<{ method: string, path: string, reason: string }> = [
  { method: 'POST', path: '/admin/login', reason: '登录前还没有身份' },
  { method: 'GET', path: '/admin/login/state', reason: '登录前获取是否需要验证码' },
  { method: 'GET', path: '/admin/captcha', reason: '登录前获取滑块验证码' },
  { method: 'POST', path: '/admin/captcha/verify', reason: '登录前校验滑块验证码' },
  { method: 'GET', path: '/admin/refreshToken', reason: '会话续期，所有登录用户都需要' },
  { method: 'GET', path: '/admin/info', reason: '会话信息本身就是权限的来源' },
  { method: 'POST', path: '/admin/logout', reason: '登出自己' },
  { method: 'POST', path: '/admin/updatePassword', reason: '修改自己的密码' },
  { method: 'POST', path: '/mcp', reason: 'MCP 机器接口，仅走令牌鉴权' },
  { method: 'GET', path: '/mcp', reason: 'MCP 机器接口，仅走令牌鉴权' },
  { method: 'DELETE', path: '/mcp', reason: 'MCP 机器接口，仅走令牌鉴权' },
  { method: 'GET', path: '/mcp/health', reason: '健康检查' },
  { method: 'POST', path: '/monitor/collect', reason: 'SDK 采集入口，公开访问' },
  { method: 'GET', path: '/monitor/meta', reason: '筛选项字典，所有监控页共用' },
  { method: 'GET', path: '/metadata/sets/code/:setCode/items', reason: '表单渲染器的数据源查询，跨模块复用' },
]

export const ROUTE_PERMISSIONS: RoutePermissionRule[] = [
  // 系统管理 · 用户
  { method: 'GET', path: '/admin/list', permission: ['system:user:list'] },
  { method: 'GET', path: '/admin/:id', permission: ['system:user:list'] },
  { method: 'GET', path: '/admin/role/:adminId', permission: ['system:user:list', 'system:user:assignRole'] },
  { method: 'POST', path: '/admin/register', permission: ['system:user:add'] },
  { method: 'POST', path: '/admin/update/:id', permission: ['system:user:edit'] },
  { method: 'POST', path: '/admin/updateStatus/:id', permission: ['system:user:edit'] },
  { method: 'POST', path: '/admin/delete/:id', permission: ['system:user:delete'] },
  { method: 'POST', path: '/admin/role/update', permission: ['system:user:assignRole'] },

  // 系统管理 · 角色
  { method: 'GET', path: '/role/list', permission: ['system:role:list'] },
  { method: 'GET', path: '/role/all', permission: ['system:role:list', 'system:user:assignRole'] },
  { method: 'GET', path: '/role/menu/:roleId', permission: ['system:role:list', 'system:role:assignMenu'] },
  { method: 'GET', path: '/role/:id', permission: ['system:role:list'] },
  { method: 'POST', path: '/role/create', permission: ['system:role:add'] },
  { method: 'POST', path: '/role/update/:id', permission: ['system:role:edit'] },
  { method: 'POST', path: '/role/delete/:id', permission: ['system:role:delete'] },
  { method: 'POST', path: '/role/menu/update', permission: ['system:role:assignMenu'] },

  // 系统管理 · 菜单（路由表由菜单驱动，改菜单等于改路由，权限单独收口）
  { method: 'GET', path: '/menu/list', permission: ['system:menu:list'] },
  { method: 'GET', path: '/menu/tree', permission: ['system:menu:list', 'system:role:assignMenu'] },
  { method: 'GET', path: '/menu/all', permission: ['system:menu:list', 'system:role:assignMenu'] },
  { method: 'GET', path: '/menu/permissions', permission: ['system:menu:list'] },
  { method: 'GET', path: '/menu/:id', permission: ['system:menu:list'] },
  { method: 'POST', path: '/menu/create', permission: ['system:menu:add'] },
  { method: 'POST', path: '/menu/update/:id', permission: ['system:menu:edit'] },
  { method: 'POST', path: '/menu/delete/:id', permission: ['system:menu:delete'] },

  // 表单设计
  { method: 'GET', path: '/form/list', permission: ['form:form:list'] },
  { method: 'GET', path: '/form/detail', permission: ['form:form:list', 'form:data:list'] },
  { method: 'POST', path: '/form/create', permission: ['form:form:add'] },
  { method: 'POST', path: '/form/update', permission: ['form:form:edit'] },
  { method: 'POST', path: '/form/draft', permission: ['form:form:edit'] },
  { method: 'POST', path: '/form/publish', permission: ['form:form:edit'] },
  { method: 'POST', path: '/form/retire', permission: ['form:form:edit'] },
  { method: 'POST', path: '/form/revive', permission: ['form:form:edit'] },
  { method: 'POST', path: '/form/delete', permission: ['form:form:delete'] },
  { method: 'GET', path: '/form/versions', permission: ['form:form:list'] },
  { method: 'POST', path: '/form/render', permission: ['form:form:list', 'form:data:list', 'form:data:submit'] },
  { method: 'POST', path: '/form/data/submit', permission: ['form:data:submit'] },
  { method: 'GET', path: '/form/data/list', permission: ['form:data:list'] },
  { method: 'GET', path: '/form/data/detail', permission: ['form:data:list'] },
  { method: 'POST', path: '/form/data/updateStatus', permission: ['form:data:edit'] },
  { method: 'POST', path: '/form/data/delete', permission: ['form:data:delete'] },

  // 元数据
  { method: 'GET', path: '/metadata/sets/page', permission: ['metadata:set:list'] },
  { method: 'GET', path: '/metadata/sets/:id', permission: ['metadata:set:list'] },
  { method: 'POST', path: '/metadata/sets/add', permission: ['metadata:set:add'] },
  { method: 'POST', path: '/metadata/sets/:id/update', permission: ['metadata:set:edit'] },
  { method: 'POST', path: '/metadata/sets/:id/status', permission: ['metadata:set:edit'] },
  { method: 'POST', path: '/metadata/sets/:id/delete', permission: ['metadata:set:delete'] },
  { method: 'POST', path: '/metadata/items/add', permission: ['metadata:item:add'] },
  { method: 'POST', path: '/metadata/items/batch', permission: ['metadata:item:add'] },
  { method: 'POST', path: '/metadata/items/:id/update', permission: ['metadata:item:edit'] },
  { method: 'POST', path: '/metadata/items/:id/status', permission: ['metadata:item:edit'] },
  { method: 'POST', path: '/metadata/items/:id/delete', permission: ['metadata:item:delete'] },

  // 监控中心
  { method: 'GET', path: '/monitor/logs', permission: ['monitor:log:list'] },
  { method: 'GET', path: '/monitor/stats/workbench', permission: ['monitor:stats:list'] },
  { method: 'GET', path: '/monitor/stats/perf', permission: ['monitor:stats:list'] },
  { method: 'GET', path: '/monitor/stats/api', permission: ['monitor:stats:list'] },
  { method: 'GET', path: '/monitor/stats/behavior', permission: ['monitor:stats:list'] },
  { method: 'GET', path: '/monitor/stats/error', permission: ['monitor:stats:list'] },
  { method: 'GET', path: '/monitor/stats/biz-error', permission: ['monitor:stats:list'] },
  { method: 'GET', path: '/monitor/apps', permission: ['monitor:app:list'] },
  { method: 'GET', path: '/monitor/apps/:appId', permission: ['monitor:app:list'] },
  { method: 'GET', path: '/monitor/apps/:appId/queue-stats', permission: ['monitor:app:list'] },
  { method: 'POST', path: '/monitor/apps/create', permission: ['monitor:app:add'] },
  { method: 'POST', path: '/monitor/apps/update', permission: ['monitor:app:edit'] },
  { method: 'POST', path: '/monitor/apps/:appId/queue/start', permission: ['monitor:app:edit'] },
  { method: 'POST', path: '/monitor/apps/:appId/queue/stop', permission: ['monitor:app:edit'] },
  { method: 'GET', path: '/monitor/alerts/history', permission: ['monitor:alert:list'] },
  { method: 'POST', path: '/monitor/alerts/retry', permission: ['monitor:alert:retry'] },
  { method: 'POST', path: '/monitor/maintenance/prune', permission: ['monitor:maintenance:prune'] },
]

function toRegExp(path: string): RegExp {
  const escaped = path.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/:[^/]+/g, '[^/]+')
  return new RegExp(`^${escaped}$`)
}

const compiledRules = ROUTE_PERMISSIONS.map(rule => ({ ...rule, regexp: toRegExp(rule.path) }))
const compiledUnprotected = UNPROTECTED_ROUTES.map(route => ({ ...route, regexp: toRegExp(route.path) }))

/** 权限标识字典：路由表里登记过的全部标识，供菜单配置下拉选择，杜绝手写打错 */
export function getPermissionCodes(): string[] {
  return [...new Set(ROUTE_PERMISSIONS.flatMap(rule => rule.permission))].sort()
}

/** 白名单优先：否则 /admin/info 这类会话接口会被 /admin/:id 的通配规则误伤 */
export function isUnprotectedRoute(method: string, path: string): boolean {
  const upper = method.toUpperCase()
  return compiledUnprotected.some(route => route.method === upper && route.regexp.test(path))
}

/** 查接口需要的权限标识；undefined 表示白名单接口或未登记路径，都不做权限判定 */
export function findRoutePermissions(method: string, path: string): string[] | undefined {
  if (isUnprotectedRoute(method, path))
    return undefined

  const upper = method.toUpperCase()
  // 具体路径必须排在 :param 通配之前，按声明顺序命中第一条
  for (const rule of compiledRules) {
    if (rule.method === upper && rule.regexp.test(path))
      return rule.permission
  }
  return undefined
}

/** 挂在 authMiddleware 之后：req.permissions 由 authMiddleware 从会话解析出来 */
export function permissionMiddleware(req: Request, res: Response, next: NextFunction) {
  const fullPath = `${req.baseUrl}${req.path}`
  const required = findRoutePermissions(req.method, fullPath)
  if (!required || required.length === 0) {
    next()
    return
  }

  const owned = req.permissions ?? []
  if (owned.includes('*') || required.some(code => owned.includes(code))) {
    next()
    return
  }

  recordPermissionDenied(req, required)
  res.status(403).json(forbidden(`没有相关权限：${required.join(' 或 ')}`))
}
