import bcrypt from 'bcryptjs'
import { getDb } from '../../db'
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../lib/errors'
import { now } from '../../lib/date'
import { signToken } from '../../lib/jwt'
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

  const roleRelations = db.prepare('SELECT role_id FROM za_admin_role_relation WHERE admin_id = ?').all(admin.id) as any[]
  const roleIds = roleRelations.map(r => r.role_id)

  let roles: string[] = []
  let menus: any[] = []

  if (roleIds.length > 0) {
    const placeholders = roleIds.map(() => '?').join(',')
    const roleRows = db.prepare(`SELECT name FROM za_role WHERE id IN (${placeholders})`).all(...roleIds) as any[]
    roles = roleRows.map(r => r.name)

    const menuRelations = db.prepare(`SELECT menu_id FROM za_role_menu_relation WHERE role_id IN (${placeholders})`).all(...roleIds) as any[]
    const menuIds = [...new Set(menuRelations.map(m => m.menu_id))] as number[]

    if (menuIds.length > 0) {
      const mPlaceholders = menuIds.map(() => '?').join(',')
      menus = (db.prepare(`SELECT * FROM za_menu WHERE id IN (${mPlaceholders}) ORDER BY sort`).all(...menuIds) as any[]).map(m => ({
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
        createTime: m.create_time,
        activeIcon: m.active_icon || null,
      }))
    }
  }

  return { ...admin, menus, roles }
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
