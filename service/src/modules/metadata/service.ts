import type { MetadataItem, MetadataSet } from './schema'
import { getDb } from '../../db'
import { toCamelCase, toCamelCaseList } from '../../lib/camel'
import { now } from '../../lib/date'
import { ConflictError, NotFoundError } from '../../lib/errors'

interface MetadataSetInput {
  code?: string
  name?: string
  description?: string
  status?: number
}

interface MetadataItemInput {
  parentId?: number | null
  code?: string
  name?: string
  shortName?: string
  description?: string
  sortOrder?: number
  status?: number
}

function assertSetCodeAvailable(code: string, excludeId?: number): void {
  const row = getDb().prepare('SELECT id FROM za_metadata_set WHERE code = ?').get(code) as any
  if (row && row.id !== excludeId)
    throw new ConflictError('编码集代码已存在')
}

function getSetRow(id: number): MetadataSet {
  const row = getDb().prepare('SELECT * FROM za_metadata_set WHERE id = ?').get(id) as any
  if (!row)
    throw new NotFoundError('编码集不存在')
  return toCamelCase<MetadataSet>(row)
}

function buildItemTree(items: MetadataItem[]): MetadataItem[] {
  const itemMap = new Map(items.map(item => [item.id, { ...item, children: [] as MetadataItem[] }]))
  const roots: MetadataItem[] = []

  itemMap.forEach((item) => {
    const parent = item.parentId ? itemMap.get(item.parentId) : undefined
    if (parent)
      parent.children.push(item)
    else
      roots.push(item)
  })

  return roots
}

export function getMetadataSetPage(params: {
  keyword?: string
  status?: number
  pageNum: number
  pageSize: number
}) {
  const db = getDb()
  const conditions: string[] = []
  const args: string[] = []

  if (params.keyword) {
    conditions.push('(code LIKE ? OR name LIKE ?)')
    const keyword = `%${params.keyword}%`
    args.push(keyword, keyword)
  }
  if (params.status !== undefined) {
    conditions.push('status = ?')
    args.push(String(params.status))
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const total = (db.prepare(`SELECT COUNT(*) AS count FROM za_metadata_set ${where}`).get(...args) as any).count
  const list = toCamelCaseList<MetadataSet>(db.prepare(
    `SELECT * FROM za_metadata_set ${where} ORDER BY id LIMIT ? OFFSET ?`,
  ).all(...args, params.pageSize, (params.pageNum - 1) * params.pageSize) as any[])

  return { list, total, pageNum: params.pageNum, pageSize: params.pageSize }
}

export function getMetadataSet(id: number): MetadataSet {
  return getSetRow(id)
}

export function createMetadataSet(data: MetadataSetInput & { code: string, name: string }) {
  assertSetCodeAvailable(data.code)
  const timestamp = now()
  const result = getDb().prepare(`
    INSERT INTO za_metadata_set (code, name, description, status, create_time, update_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.code, data.name, data.description ?? null, data.status ?? 1, timestamp, timestamp)
  return { id: Number(result.lastInsertRowid) }
}

export function updateMetadataSet(id: number, data: MetadataSetInput) {
  getSetRow(id)
  if (data.code)
    assertSetCodeAvailable(data.code, id)

  getDb().prepare(`
    UPDATE za_metadata_set SET
      code = COALESCE(?, code),
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      update_time = ?
    WHERE id = ?
  `).run(data.code ?? null, data.name ?? null, data.description ?? null, data.status ?? null, now(), id)
}

export function changeMetadataSetStatus(id: number, status: 0 | 1) {
  getSetRow(id)
  getDb().prepare('UPDATE za_metadata_set SET status = ?, update_time = ? WHERE id = ?').run(status, now(), id)
}

export function deleteMetadataSet(id: number) {
  getSetRow(id)
  const db = getDb()
  db.prepare('DELETE FROM za_metadata_item WHERE set_id = ?').run(id)
  db.prepare('DELETE FROM za_metadata_set WHERE id = ?').run(id)
}

export function getOptionSet(setCode: string, onlyValid: boolean) {
  const db = getDb()
  const setRow = db.prepare('SELECT * FROM za_metadata_set WHERE code = ?').get(setCode) as any
  if (!setRow)
    throw new NotFoundError('编码集不存在')

  const itemRows = db.prepare(`
    SELECT * FROM za_metadata_item
    WHERE set_id = ? ${onlyValid ? 'AND status = 1' : ''}
    ORDER BY sort_order, id
  `).all(setRow.id) as any[]

  return {
    set: toCamelCase<MetadataSet>(setRow),
    items: buildItemTree(toCamelCaseList<MetadataItem>(itemRows)),
  }
}

function getItemRow(id: number): MetadataItem {
  const row = getDb().prepare('SELECT * FROM za_metadata_item WHERE id = ?').get(id) as any
  if (!row)
    throw new NotFoundError('编码项不存在')
  return toCamelCase<MetadataItem>(row)
}

export function createMetadataItem(data: MetadataItemInput & { setCode: string, code: string, name: string }) {
  const db = getDb()
  const set = db.prepare('SELECT id FROM za_metadata_set WHERE code = ?').get(data.setCode) as any
  if (!set)
    throw new NotFoundError('编码集不存在')

  const parent = data.parentId ? getItemRow(data.parentId) : undefined
  if (parent && parent.setId !== set.id)
    throw new ConflictError('父级编码项不属于当前编码集')

  const exists = db.prepare('SELECT id FROM za_metadata_item WHERE set_id = ? AND code = ?').get(set.id, data.code)
  if (exists)
    throw new ConflictError('编码项代码已存在')

  const result = db.prepare(`
    INSERT INTO za_metadata_item
      (set_id, parent_id, code, name, short_name, description, sort_order, status, create_time, update_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    set.id,
    parent?.id ?? null,
    data.code,
    data.name,
    data.shortName ?? null,
    data.description ?? null,
    data.sortOrder ?? 0,
    data.status ?? 1,
    now(),
    now(),
  )
  return { id: Number(result.lastInsertRowid) }
}

export function updateMetadataItem(id: number, data: MetadataItemInput) {
  getItemRow(id)
  if (data.parentId) {
    const parent = getItemRow(data.parentId)
    if (parent.id === id)
      throw new ConflictError('父级编码项不能是自身')
  }

  getDb().prepare(`
    UPDATE za_metadata_item SET
      parent_id = COALESCE(?, parent_id),
      code = COALESCE(?, code),
      name = COALESCE(?, name),
      short_name = COALESCE(?, short_name),
      description = COALESCE(?, description),
      sort_order = COALESCE(?, sort_order),
      status = COALESCE(?, status),
      update_time = ?
    WHERE id = ?
  `).run(
    data.parentId === undefined ? null : data.parentId,
    data.code ?? null,
    data.name ?? null,
    data.shortName ?? null,
    data.description ?? null,
    data.sortOrder ?? null,
    data.status ?? null,
    now(),
    id,
  )
}

export function changeMetadataItemStatus(id: number, status: 0 | 1) {
  getItemRow(id)
  getDb().prepare('UPDATE za_metadata_item SET status = ?, update_time = ? WHERE id = ?').run(status, now(), id)
}

export function deleteMetadataItem(id: number) {
  getItemRow(id)
  const db = getDb()
  db.prepare('DELETE FROM za_metadata_item WHERE parent_id = ?').run(id)
  db.prepare('DELETE FROM za_metadata_item WHERE id = ?').run(id)
}
