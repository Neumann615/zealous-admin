import bcrypt from 'bcryptjs'
import { getDb } from '../../db'
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../lib/errors'
import { now } from '../../lib/date'
import { signToken } from '../../lib/jwt'
import { getActiveRoles, getPermissions } from './permission.service'
import { revokeAllTokensBefore } from './session'

interface AdminRow {
  id: number
  username: string
  password: string
  icon: string | null
  email: string | null
  nick_name: string | null
  note: string | null
  create_time: string | null
  login_time: string | null
  status: number
}

export async function login(username: string, password: string) {
  const db = getDb()
  const admin = db.prepare('SELECT * FROM za_admin WHERE username = ?').get(username) as AdminRow | undefined
  if (!admin)
    throw new UnauthorizedError('用户名或密码错误')

  const valid = await bcrypt.compare(password, admin.password)
  if (!valid)
    throw new UnauthorizedError('用户名或密码错误')

  if (admin.status !== 1)
    throw new UnauthorizedError('账号已被禁用')

  db.prepare('UPDATE za_admin SET login_time = ? WHERE id = ?').run(now(), admin.id)
  const token = await signToken({ sub: String(admin.id) })
  return { tokenHead: 'Bearer ', token }
}

export async function refreshToken(adminId: number) {
  const token = await signToken({ sub: String(adminId) })
  return { tokenHead: 'Bearer ', token }
}

export function getUserInfo(username: string) {
  const db = getDb()
  const admin = db.prepare(
    'SELECT id, username, icon, email, nick_name AS nickName, note, create_time AS createTime, login_time AS loginTime, status FROM za_admin WHERE username = ?',
  ).get(username) as any

  if (!admin)
    throw new NotFoundError('用户不存在')

  // 停用角色不下发菜单，也不参与权限聚合
  const activeRoles = getActiveRoles(admin.id)
  const roles = activeRoles.map(role => role.name)
  const roleIds = activeRoles.map(role => role.id)

  let menus: any[] = []

  if (roleIds.length > 0) {
    const placeholders = roleIds.map(() => '?').join(',')
    const menuRelations = db.prepare(`SELECT menu_id FROM za_role_menu_relation WHERE role_id IN (${placeholders})`).all(...roleIds) as any[]
    const menuIds = [...new Set(menuRelations.map(m => m.menu_id))] as number[]

    if (menuIds.length > 0) {
      const mPlaceholders = menuIds.map(() => '?').join(',')
      // 按钮节点（type = 2）只贡献权限标识，不参与导航与路由，因此不下发
      menus = (db.prepare(`SELECT * FROM za_menu WHERE id IN (${mPlaceholders}) AND (type IS NULL OR type <> 2) ORDER BY sort`).all(...menuIds) as any[]).map(m => ({
        id: m.id,
        parentId: m.parent_id,
        title: m.title,
        level: m.level,
        sort: m.sort,
        name: m.name,
        icon: m.icon,
        hidden: m.hidden,
        path: m.path,
        component: m.component,
        type: m.type ?? 1,
        createTime: m.create_time,
        activeIcon: m.active_icon || null,
      }))
    }
  }

  // 权限标识下发给前端做按钮级隐藏；服务端由 permissionMiddleware 独立校验，前端只是体验优化
  return { ...admin, menus, roles, permissions: getPermissions(admin.id) }
}

export async function updatePassword(username: string, oldPassword: string, newPassword: string) {
  const db = getDb()
  const admin = db.prepare('SELECT * FROM za_admin WHERE username = ?').get(username) as AdminRow | undefined
  if (!admin)
    throw new NotFoundError('用户不存在')

  const valid = await bcrypt.compare(oldPassword, admin.password)
  if (!valid)
    throw new BadRequestError('旧密码错误')

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  db.prepare('UPDATE za_admin SET password = ? WHERE id = ?').run(hashedPassword, admin.id)
  revokeAllTokensBefore(admin.id)
}
