import { beforeAll, describe, expect, it } from 'vitest'

process.env.DB_PATH = ':memory:'

const { initDb, getDb } = await import('../../db')
const { ConflictError } = await import('../../lib/errors')
const metadataService = await import('./service')

beforeAll(() => {
  initDb()
})

describe('metadata local service', () => {
  it('查询编码集分页时附带条目数量', () => {
    const page = metadataService.getMetadataSetPage({ pageNum: 1, pageSize: 10 })
    expect(page.total).toBeGreaterThanOrEqual(5)
    expect(page.list.find(item => item.code === 'GENDER')?.itemCount).toBe(4)
  })

  it('停用编码集后默认取不到编码项，管理端仍可显式读取', async () => {
    const created = metadataService.createMetadataSet({
      code: 'TEST_DISABLED',
      name: '停用测试',
      status: 1,
    })
    metadataService.createMetadataItem({
      setCode: 'TEST_DISABLED',
      code: 'A',
      name: '选项 A',
    })
    metadataService.changeMetadataSetStatus(created.id, 0)

    const publicResult = metadataService.getOptionSet('TEST_DISABLED', false)
    const adminResult = metadataService.getOptionSet('TEST_DISABLED', false, true)

    expect(publicResult.items).toHaveLength(0)
    expect(adminResult.items).toHaveLength(1)
  })

  it('编码项更新不允许形成循环引用', () => {
    const rootId = metadataService.createMetadataItem({
      setCode: 'ORGANIZATION',
      code: 'CYCLE_ROOT',
      name: '循环根',
    }).id
    const childId = metadataService.createMetadataItem({
      setCode: 'ORGANIZATION',
      parentId: rootId,
      code: 'CYCLE_CHILD',
      name: '循环子项',
    }).id

    expect(() => metadataService.updateMetadataItem(rootId, { parentId: childId }))
      .toThrow(ConflictError)
  })

  it('删除编码项时递归删除所有后代', () => {
    const rootId = metadataService.createMetadataItem({
      setCode: 'ORGANIZATION',
      code: 'DELETE_ROOT',
      name: '删除根',
    }).id
    const childId = metadataService.createMetadataItem({
      setCode: 'ORGANIZATION',
      parentId: rootId,
      code: 'DELETE_CHILD',
      name: '删除子项',
    }).id
    metadataService.createMetadataItem({
      setCode: 'ORGANIZATION',
      parentId: childId,
      code: 'DELETE_GRANDCHILD',
      name: '删除孙项',
    })

    metadataService.deleteMetadataItem(rootId)
    const remains = getDb().prepare(
      'SELECT COUNT(*) AS count FROM za_metadata_item WHERE code LIKE ?',
    ).get('DELETE_%') as { count: number }

    expect(remains.count).toBe(0)
  })

  it('批量创建在遇到冲突时整体回滚', () => {
    expect(() => metadataService.createMetadataItems('GENDER', [
      { code: 'BATCH_OK', name: '批量成功' },
      { code: 'BATCH_OK', name: '批量重复' },
    ])).toThrow(ConflictError)

    const remains = getDb().prepare(
      'SELECT COUNT(*) AS count FROM za_metadata_item WHERE code = ?',
    ).get('BATCH_OK') as { count: number }

    expect(remains.count).toBe(0)
  })

  it('编码项可通过显式 null 移回根级', () => {
    const rootId = metadataService.createMetadataItem({
      setCode: 'ORGANIZATION',
      code: 'MOVE_ROOT',
      name: '移动根',
    }).id
    const childId = metadataService.createMetadataItem({
      setCode: 'ORGANIZATION',
      parentId: rootId,
      code: 'MOVE_CHILD',
      name: '移动子',
    }).id

    metadataService.updateMetadataItem(childId, { parentId: null })

    const rootIds = metadataService.getOptionSet('ORGANIZATION', false, true).items.map(item => item.id)
    expect(rootIds).toContain(childId)
  })

  it('更新编码集时显式 null 可清空描述', () => {
    const id = metadataService.createMetadataSet({
      code: 'CLEAR_DESC',
      name: '清空描述',
      description: '原始描述',
    }).id

    metadataService.updateMetadataSet(id, { description: null })

    expect(metadataService.getMetadataSet(id).description).toBeNull()
  })

  it('被表单引用的编码集不允许删除', () => {
    getDb().prepare(
      'INSERT INTO za_form (name, schema, status, version, create_time, update_time) VALUES (?, ?, 1, 1, ?, ?)',
    ).run(
      '引用测试表单',
      JSON.stringify({ fields: [{ type: 'select', props: { setCode: 'GENDER' } }] }),
      '2026-01-01 00:00:00',
      '2026-01-01 00:00:00',
    )
    const gender = metadataService.getMetadataSetPage({ pageNum: 1, pageSize: 100 }).list.find(item => item.code === 'GENDER')!

    expect(() => metadataService.deleteMetadataSet(gender.id)).toThrow(ConflictError)
  })
})
