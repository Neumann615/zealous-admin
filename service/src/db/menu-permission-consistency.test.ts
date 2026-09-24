import { beforeAll, describe, expect, it } from 'vitest'

process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'permission-dictionary-test-secret'

const { getDb, initDb } = await import('./index')
const { getPermissionCodes } = await import('../middleware/permission')

beforeAll(() => {
  initDb()
})

describe('权限标识字典一致性', () => {
  it('路由表里的每个权限标识都能在菜单种子中授权（否则配了也发不出去）', () => {
    const db = getDb()
    const grantable = new Set(
      (db.prepare('SELECT DISTINCT permission FROM za_menu WHERE permission IS NOT NULL AND permission <> \'\'').all() as Array<{ permission: string }>)
        .map(row => row.permission),
    )
    expect(getPermissionCodes().filter(code => !grantable.has(code))).toEqual([])
  })

  it('菜单种子里的每个权限标识都被路由表引用（否则是配不出接口的死标识）', () => {
    const db = getDb()
    const referenced = new Set(getPermissionCodes())
    const seeded = (db.prepare('SELECT DISTINCT permission FROM za_menu WHERE permission IS NOT NULL AND permission <> \'\'').all() as Array<{ permission: string }>)
      .map(row => row.permission)
    expect(seeded.filter(code => !referenced.has(code))).toEqual([])
  })
})
