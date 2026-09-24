import type { NextFunction } from 'express'
import { beforeAll, describe, expect, it } from 'vitest'

process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'permission-test-secret'

const { getDb, initDb } = await import('../../db')
const { permissionMiddleware } = await import('../../middleware/permission')
const authService = await import('./auth.service')
const { getActiveRoles, getPermissions } = await import('./permission.service')
const userService = await import('./user.service')

beforeAll(() => {
  initDb()
})

/** 按权限标识挑菜单建角色：菜单行给查询权限，按钮行给操作权限 */
function createRoleByPermissions(name: string, permissions: string[]): number {
  const db = getDb()
  const placeholders = permissions.map(() => '?').join(',')
  const menus = db.prepare(`SELECT id FROM za_menu WHERE permission IN (${placeholders})`).all(...permissions) as Array<{ id: number }>
  expect(menus.length).toBe(permissions.length)

  const result = db.prepare(
    'INSERT INTO za_role (name, description, admin_count, create_time, status, sort, is_super) VALUES (?, ?, 0, ?, 1, 0, 0)',
  ).run(name, '权限单测角色', new Date().toISOString())
  const roleId = Number(result.lastInsertRowid)

  const relation = db.prepare('INSERT INTO za_role_menu_relation (role_id, menu_id) VALUES (?, ?)')
  for (const menu of menus)
    relation.run(roleId, menu.id)

  return roleId
}

function fakeRes() {
  const res: any = { statusCode: 0, body: null }
  res.status = (code: number) => {
    res.statusCode = code
    return res
  }
  res.json = (payload: unknown) => {
    res.body = payload
    return res
  }
  return res
}

function runMiddleware(method: string, fullPath: string, permissions: string[]) {
  const [baseUrl, path] = fullPath.startsWith('/monitor') || fullPath.startsWith('/metadata')
    ? [fullPath.slice(0, fullPath.indexOf('/', 1)), fullPath.slice(fullPath.indexOf('/', 1))]
    : ['', fullPath]
  const req: any = { method, baseUrl, path, permissions, ip: '127.0.0.1', headers: {} }
  const res = fakeRes()
  let passed = false
  const next: NextFunction = () => {
    passed = true
  }
  permissionMiddleware(req, res, next)
  return { passed, statusCode: res.statusCode as number }
}

describe('权限聚合', () => {
  it('超管拿到通配权限，不依赖菜单配置', () => {
    const admin = getDb().prepare(`SELECT id FROM za_admin WHERE username = 'admin'`).get() as { id: number }
    expect(getPermissions(admin.id)).toEqual(['*'])
  })

  it('无角色账号没有任何权限', async () => {
    const created = await userService.register({ username: 'perm_norole', password: 'pass1234' }) as { id: number }
    expect(getActiveRoles(created.id)).toEqual([])
    expect(getPermissions(created.id)).toEqual([])
  })

  it('普通角色按「角色 → 菜单（含按钮）→ permission」聚合', async () => {
    const roleId = createRoleByPermissions('perm_limited_role', ['system:user:list', 'system:user:add'])
    const created = await userService.register({ username: 'perm_limited', password: 'pass1234' }) as { id: number }
    userService.assignRoles(created.id, String(roleId))

    expect(getPermissions(created.id).sort()).toEqual(['system:user:add', 'system:user:list'])
  })

  it('停用角色不再贡献权限与菜单', async () => {
    const created = await userService.register({ username: 'perm_disabled_role', password: 'pass1234' }) as { id: number }
    const roleId = createRoleByPermissions('perm_disabled', ['system:role:list'])
    userService.assignRoles(created.id, String(roleId))
    expect(getPermissions(created.id)).toEqual(['system:role:list'])

    getDb().prepare('UPDATE za_role SET status = 0 WHERE id = ?').run(roleId)
    expect(getActiveRoles(created.id)).toEqual([])
    expect(getPermissions(created.id)).toEqual([])
    expect((authService.getUserInfo('perm_disabled_role') as any).menus).toEqual([])
  })

  it('getUserInfo 下发 permissions，按钮节点不进菜单', () => {
    const info = authService.getUserInfo('perm_limited') as any
    expect(info.permissions.sort()).toEqual(['system:user:add', 'system:user:list'])
    expect(info.menus.length).toBeGreaterThan(0)
    expect(info.menus.every((menu: any) => menu.type !== 2)).toBe(true)
    expect(info.menus.some((menu: any) => menu.path === '/system/admin')).toBe(true)
  })
})

describe('接口权限中间件', () => {
  it('超管通配直接放行', () => {
    expect(runMiddleware('POST', '/admin/delete/9', ['*']).passed).toBe(true)
  })

  it('缺少权限返回 403', () => {
    const db = getDb()
    const before = (db.prepare('SELECT COUNT(*) AS count FROM za_monitor_log WHERE title = ?').get('权限拒绝') as { count: number }).count
    const result = runMiddleware('POST', '/admin/delete/9', ['system:user:list'])
    const after = (db.prepare('SELECT COUNT(*) AS count FROM za_monitor_log WHERE title = ?').get('权限拒绝') as { count: number }).count
    expect(result.passed).toBe(false)
    expect(result.statusCode).toBe(403)
    expect(after - before).toBe(1)
  })

  it('任一权限命中即放行', () => {
    expect(runMiddleware('GET', '/role/all', ['system:user:assignRole']).passed).toBe(true)
    expect(runMiddleware('GET', '/role/all', ['system:menu:list']).passed).toBe(false)
  })

  it('带挂载前缀的接口同样受控', () => {
    expect(runMiddleware('GET', '/monitor/logs', ['monitor:log:list']).passed).toBe(true)
    expect(runMiddleware('GET', '/monitor/logs', ['monitor:app:list']).passed).toBe(false)
    expect(runMiddleware('POST', '/metadata/sets/3/delete', ['metadata:set:delete']).passed).toBe(true)
  })

  it('白名单接口只做登录校验', () => {
    expect(runMiddleware('GET', '/admin/info', []).passed).toBe(true)
    expect(runMiddleware('GET', '/admin/captcha', []).passed).toBe(true)
    expect(runMiddleware('POST', '/admin/captcha/verify', []).passed).toBe(true)
    // 会话接口不能被 /admin/:id 的通配规则误伤，否则非超管登录后拿不到用户信息
    expect(runMiddleware('GET', '/admin/refreshToken', []).passed).toBe(true)
    expect(runMiddleware('POST', '/monitor/collect', []).passed).toBe(true)
  })
})
