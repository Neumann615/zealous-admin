import { getDb } from '../../db'

/** 超管标识：命中即拥有全部权限，避免菜单漏配把自己锁在系统外 */
export const SUPER_PERMISSION = '*'

export interface ActiveRole {
  id: number
  name: string
  isSuper: boolean
}

interface RoleRow {
  id: number
  name: string
  is_super: number | null
}

/** 取账号当前生效的角色（停用角色不参与授权，也不参与菜单下发） */
export function getActiveRoles(adminId: number): ActiveRole[] {
  const rows = getDb().prepare(
    `SELECT r.id, r.name, r.is_super
       FROM za_role r
       JOIN za_admin_role_relation ar ON ar.role_id = r.id
      WHERE ar.admin_id = ? AND r.status = 1`,
  ).all(adminId) as unknown as RoleRow[]

  return rows.map(row => ({ id: row.id, name: row.name, isSuper: row.is_super === 1 }))
}

/**
 * 权限标识集合：超管返回 ['*']，其余按「角色 → 菜单（含按钮节点）→ permission 列」聚合。
 * 菜单是权限的唯一来源，因此新增接口权限只需在菜单管理里加一条按钮节点并授权给角色。
 */
export function getPermissions(adminId: number): string[] {
  const roles = getActiveRoles(adminId)
  if (roles.length === 0)
    return []
  if (roles.some(role => role.isSuper))
    return [SUPER_PERMISSION]

  const placeholders = roles.map(() => '?').join(',')
  const rows = getDb().prepare(
    `SELECT DISTINCT m.permission AS permission
       FROM za_menu m
       JOIN za_role_menu_relation rm ON rm.menu_id = m.id
      WHERE rm.role_id IN (${placeholders})
        AND m.permission IS NOT NULL
        AND m.permission <> ''`,
  ).all(...roles.map(role => role.id)) as Array<{ permission: string }>

  return rows.map(row => row.permission)
}
