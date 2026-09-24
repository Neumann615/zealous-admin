import { beforeAll, describe, expect, it } from 'vitest'

process.env.DB_PATH = ':memory:'

const { getDb, initDb } = await import('../../db')
const { ROUTE_PERMISSIONS } = await import('../../middleware/permission')
const { getArchitecture } = await import('./architecture.service')

beforeAll(() => {
  initDb()
})

describe('system architecture', () => {
  it('从 SQLite 实时读取字段、索引与外键', () => {
    const result = getArchitecture()
    const formVersion = result.databaseDomains
      .flatMap(domain => domain.tables)
      .find(table => table.name === 'za_form_version')

    expect(formVersion).toBeDefined()
    expect(formVersion?.columns.map(column => column.name)).toContain('form_id')
    expect(formVersion?.indexes.some(index => index.name === 'idx_form_version_draft' && index.unique)).toBe(true)
    expect(formVersion?.foreignKeys.some(key => key.column === 'form_id' && key.referenceTable === 'za_form')).toBe(true)
  })

  it('数据库域覆盖全部真实表且核心域有设计说明', () => {
    const result = getArchitecture()
    const actualTables = (getDb().prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).all() as Array<{ name: string }>).map(row => row.name)
    const renderedTables = result.databaseDomains.flatMap(domain => domain.tables.map(table => table.name))

    expect(renderedTables).toEqual(expect.arrayContaining(actualTables))
    expect(new Set(renderedTables).size).toBe(renderedTables.length)
    expect(result.databaseDomains.find(domain => domain.code === 'form')?.designPoints.length).toBeGreaterThan(0)
  })

  it('接口权限矩阵复用真实路由权限映射', () => {
    const result = getArchitecture()
    const endpointCount = result.apiMatrix.reduce((count, module) => count + module.endpoints.length, 0)

    expect(endpointCount).toBe(ROUTE_PERMISSIONS.length)
    expect(result.overview.apiCount).toBeGreaterThan(endpointCount)
    expect(result.apiMatrix.some(module => module.endpoints.some(endpoint => endpoint.path === '/system/architecture'))).toBe(true)
    expect(result.apiMatrix.some(module => module.endpoints.some(endpoint => endpoint.path.includes('/file')))).toBe(false)
  })

  it('菜单迁移补系统架构入口并绑定权限', () => {
    const menu = getDb().prepare('SELECT id, component, permission FROM za_menu WHERE path = ?').get('/system/architecture') as {
      id: number
      component: string | null
      permission: string | null
    }

    expect(menu?.component).toBe('system/architecture')
    expect(menu?.permission).toBe('system:architecture:list')
    const relation = getDb().prepare('SELECT COUNT(*) AS count FROM za_role_menu_relation WHERE menu_id = ?').get(menu.id) as { count: number }
    expect(relation.count).toBeGreaterThan(0)
  })
})
