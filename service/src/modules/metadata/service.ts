import type { MetadataItem, MetadataSet } from './schema'
import { getDb } from '../../db'
import { toCamelCase, toCamelCaseList } from '../../lib/camel'
import { now } from '../../lib/date'
import { ConflictError, NotFoundError } from '../../lib/errors'

interface MetadataSetInput {
  code?: string
  name?: string
  description?: string | null
  status?: number
}

interface MetadataItemInput {
  parentId?: number | null
  code?: string
  name?: string
  shortName?: string | null
  description?: string | null
  sortOrder?: number
  status?: number
}

type SqlValue = string | number | null

function runInTransaction<T>(operation: () => T): T {
  const db = getDb()
  db.exec('BEGIN')
  try {
    const result = operation()
    db.exec('COMMIT')
    return result
  }
  catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
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
    conditions.push('(set_table.code LIKE ? OR set_table.name LIKE ?)')
    const keyword = `%${params.keyword}%`
    args.push(keyword, keyword)
  }
  if (params.status !== undefined) {
    conditions.push('set_table.status = ?')
    args.push(String(params.status))
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const total = (db.prepare(`SELECT COUNT(*) AS count FROM za_metadata_set ${where}`).get(...args) as any).count
  const list = toCamelCaseList<MetadataSet>(db.prepare(
    `SELECT set_table.*, COUNT(item.id) AS item_count
     FROM za_metadata_set set_table
     LEFT JOIN za_metadata_item item ON item.set_id = set_table.id
     GROUP BY set_table.id
     ORDER BY set_table.id LIMIT ? OFFSET ?`,
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

  const sets: string[] = []
  const values: SqlValue[] = []
  if (data.code !== undefined) {
    sets.push('code = ?')
    values.push(data.code)
  }
  if (data.name !== undefined) {
    sets.push('name = ?')
    values.push(data.name)
  }
  if (data.description !== undefined) {
    sets.push('description = ?')
    values.push(data.description)
  }
  if (data.status !== undefined) {
    sets.push('status = ?')
    values.push(data.status)
  }
  if (sets.length === 0)
    return

  sets.push('update_time = ?')
  values.push(now(), id)
  getDb().prepare(`UPDATE za_metadata_set SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

export function changeMetadataSetStatus(id: number, status: 0 | 1) {
  getSetRow(id)
  getDb().prepare('UPDATE za_metadata_set SET status = ?, update_time = ? WHERE id = ?').run(status, now(), id)
}

function collectSetCodes(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value)
      collectSetCodes(item, out)
    return out
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'setCode' && typeof item === 'string')
        out.add(item)
      else
        collectSetCodes(item, out)
    }
  }
  return out
}

/** 表单契约以 setCode 引用元数据；删除前拦截，避免表单渲染期才报错 */
export function findFormReferences(setCode: string): Array<{ id: number, name: string }> {
  const rows = getDb().prepare('SELECT id, name, schema FROM za_form WHERE schema LIKE ?').all('%setCode%') as Array<{ id: number, name: string, schema: string | null }>
  const references: Array<{ id: number, name: string }> = []
  for (const row of rows) {
    if (!row.schema)
      continue
    try {
      if (collectSetCodes(JSON.parse(row.schema)).has(setCode))
        references.push({ id: row.id, name: row.name })
    }
    catch { /* 契约损坏的表单不参与引用检查 */ }
  }
  return references
}

export function deleteMetadataSet(id: number) {
  const set = getSetRow(id)
  const references = findFormReferences(set.code)
  if (references.length > 0)
    throw new ConflictError(`表单「${references.map(item => item.name).join('、')}」仍引用该编码集，请先解除引用`)

  runInTransaction(() => {
    const db = getDb()
    db.prepare('DELETE FROM za_metadata_item WHERE set_id = ?').run(id)
    db.prepare('DELETE FROM za_metadata_set WHERE id = ?').run(id)
  })
}

export function getOptionSet(setCode: string, onlyValid: boolean, includeDisabledSet = false) {
  const db = getDb()
  const setRow = db.prepare('SELECT * FROM za_metadata_set WHERE code = ?').get(setCode) as any
  if (!setRow)
    throw new NotFoundError('编码集不存在')

  if (setRow.status !== 1 && !includeDisabledSet) {
    return {
      set: toCamelCase<MetadataSet>(setRow),
      items: [],
    }
  }

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

export function createMetadataItems(setCode: string, items: Array<MetadataItemInput & { code: string, name: string }>) {
  return runInTransaction(() => items.map(item => createMetadataItem({ ...item, setCode }).id))
}

export function updateMetadataItem(id: number, data: MetadataItemInput) {
  const current = getItemRow(id)
  const db = getDb()

  if (data.code && data.code !== current.code) {
    const exists = db.prepare('SELECT id FROM za_metadata_item WHERE set_id = ? AND code = ?').get(current.setId, data.code)
    if (exists)
      throw new ConflictError('编码项代码已存在')
  }

  if (data.parentId) {
    const parent = getItemRow(data.parentId)
    if (parent.setId !== current.setId)
      throw new ConflictError('父级编码项不属于当前编码集')

    let ancestor: MetadataItem | undefined = parent
    while (ancestor) {
      if (ancestor.id === current.id)
        throw new ConflictError('父级编码项不能是自身或后代')
      ancestor = ancestor.parentId ? getItemRow(ancestor.parentId) : undefined
    }
  }

  const sets: string[] = []
  const values: SqlValue[] = []
  // 显式 null = 移回根级；undefined = 不改动该字段
  if (data.parentId !== undefined) {
    sets.push('parent_id = ?')
    values.push(data.parentId)
  }
  if (data.code !== undefined) {
    sets.push('code = ?')
    values.push(data.code)
  }
  if (data.name !== undefined) {
    sets.push('name = ?')
    values.push(data.name)
  }
  if (data.shortName !== undefined) {
    sets.push('short_name = ?')
    values.push(data.shortName)
  }
  if (data.description !== undefined) {
    sets.push('description = ?')
    values.push(data.description)
  }
  if (data.sortOrder !== undefined) {
    sets.push('sort_order = ?')
    values.push(data.sortOrder)
  }
  if (data.status !== undefined) {
    sets.push('status = ?')
    values.push(data.status)
  }
  if (sets.length === 0)
    return

  sets.push('update_time = ?')
  values.push(now(), id)
  getDb().prepare(`UPDATE za_metadata_item SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

export function changeMetadataItemStatus(id: number, status: 0 | 1) {
  getItemRow(id)
  getDb().prepare('UPDATE za_metadata_item SET status = ?, update_time = ? WHERE id = ?').run(status, now(), id)
}

export function deleteMetadataItem(id: number) {
  getItemRow(id)
  const db = getDb()
  db.prepare(`
    WITH RECURSIVE descendants(id) AS (
      SELECT id FROM za_metadata_item WHERE id = ?
      UNION ALL
      SELECT item.id FROM za_metadata_item item
      JOIN descendants ON item.parent_id = descendants.id
    )
    DELETE FROM za_metadata_item WHERE id IN (SELECT id FROM descendants)
  `).run(id)
}
