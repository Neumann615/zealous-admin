import { beforeAll, describe, expect, it } from 'vitest'

process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'menu-service-test-secret'

const { getDb, initDb } = await import('../../db')
const { createMenu, deleteMenu } = await import('./menu.service')

beforeAll(() => {
  initDb()
})

function getTypeById(id: number): number {
  const db = getDb()
  return (db.prepare('SELECT type FROM za_menu WHERE id = ?').get(id) as { type: number }).type
}

describe('菜单结构联动：父级目录 / 菜单类型自动重算', () => {
  it('给菜单挂上第一个路由子节点后，父级自动从菜单变目录', () => {
    const parent = createMenu({ title: '联动父级', name: 'linkage-parent', type: 1, permission: 'test:linkage:list' })
    expect(getTypeById(parent.id!)).toBe(1)

    createMenu({ parentId: parent.id!, title: '子页面', name: 'child', type: 1 })
    expect(getTypeById(parent.id!)).toBe(0)
  })

  it('删除最后一个路由子节点后，父级自动从目录回到菜单', () => {
    const parent = createMenu({ title: '删除联动', name: 'delete-linkage', type: 0 })
    const child = createMenu({ parentId: parent.id!, title: '末位子页面', name: 'last-child', type: 1 })
    expect(getTypeById(parent.id!)).toBe(0)

    deleteMenu(child.id!)
    expect(getTypeById(parent.id!)).toBe(1)
  })

  it('按钮子节点不参与目录推导：挂按钮不会把页面菜单推成目录', () => {
    const parent = createMenu({ title: '按钮宿主', name: 'button-host', type: 1, permission: 'test:button-host:list' })
    createMenu({ parentId: parent.id!, title: '新增', type: 2, permission: 'test:button-host:add' })
    expect(getTypeById(parent.id!)).toBe(1)
  })
})
