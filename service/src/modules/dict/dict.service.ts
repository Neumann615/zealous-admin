import { getDb } from '../../db'
import { toCamelCase, toCamelCaseList } from '../../lib/camel'
import { ConflictError, NotFoundError } from '../../lib/errors'
import { now } from '../../lib/date'

// ===== Dict Type =====

export function getDictTypeList(params: { keyword?: string, pageNum: number, pageSize: number }) {
  const db = getDb()
  const offset = (params.pageNum - 1) * params.pageSize

  let total: number
  let types: any[]

  if (params.keyword) {
    const like = `%${params.keyword}%`
    total = (db.prepare(
      'SELECT COUNT(*) AS count FROM za_dict_type WHERE name LIKE ? OR dict_type LIKE ?',
    ).get(like, like) as any).count
    types = toCamelCaseList(db.prepare(
      'SELECT * FROM za_dict_type WHERE name LIKE ? OR dict_type LIKE ? LIMIT ? OFFSET ?',
    ).all(like, like, params.pageSize, offset) as any[])
  }
  else {
    total = (db.prepare('SELECT COUNT(*) AS count FROM za_dict_type').get() as any).count
    types = toCamelCaseList(db.prepare('SELECT * FROM za_dict_type LIMIT ? OFFSET ?').all(params.pageSize, offset) as any[])
  }

  return { list: types, total, pageSize: params.pageSize, pageNum: params.pageNum }
}

export function createDictType(data: { name: string, dictType: string, status?: number, remark?: string }) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM za_dict_type WHERE dict_type = ?').get(data.dictType)
  if (existing)
    throw new ConflictError('字典类型已存在')

  const result = db.prepare(
    'INSERT INTO za_dict_type (name, dict_type, status, remark, create_time) VALUES (?, ?, ?, ?, ?)',
  ).run(data.name, data.dictType, data.status || 1, data.remark || null, now())

  return toCamelCase(db.prepare('SELECT * FROM za_dict_type WHERE id = ?').get(result.lastInsertRowid) as any)
}

export function getAllDictTypes() {
  const db = getDb()
  return toCamelCaseList(db.prepare('SELECT * FROM za_dict_type ORDER BY id').all() as any[])
}

export function getDictTypeById(id: number) {
  const db = getDb()
  const type = toCamelCase(db.prepare('SELECT * FROM za_dict_type WHERE id = ?').get(id) as any)
  if (!type)
    throw new NotFoundError('字典类型不存在')
  return type
}

export function updateDictType(id: number, data: { name?: string, dictType?: string, status?: number, remark?: string }) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM za_dict_type WHERE id = ?').get(id)
  if (!existing)
    throw new NotFoundError('字典类型不存在')

  if (data.dictType) {
    const conflict = db.prepare('SELECT id FROM za_dict_type WHERE dict_type = ? AND id != ?').get(data.dictType, id)
    if (conflict)
      throw new ConflictError('字典类型已存在')
  }

  const sets: string[] = []
  const values: any[] = []
  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name) }
  if (data.dictType !== undefined) { sets.push('dict_type = ?'); values.push(data.dictType) }
  if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status) }
  if (data.remark !== undefined) { sets.push('remark = ?'); values.push(data.remark) }

  if (sets.length === 0)
    throw new NotFoundError('没有需要更新的字段')

  values.push(id)
  db.prepare(`UPDATE za_dict_type SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return toCamelCase(db.prepare('SELECT * FROM za_dict_type WHERE id = ?').get(id) as any)
}

export function deleteDictType(id: number) {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM za_dict_type WHERE id = ?').get(id) as any
  if (!existing)
    throw new NotFoundError('字典类型不存在')

  const dataCount = (db.prepare('SELECT COUNT(*) AS count FROM za_dict_data WHERE dict_type = ?').get(existing.dict_type) as any).count
  if (dataCount > 0)
    throw new ConflictError('存在字典数据，无法删除')

  db.prepare('DELETE FROM za_dict_type WHERE id = ?').run(id)
}

// ===== Dict Data =====

export function getDictDataList(params: { dictType?: string, pageNum: number, pageSize: number }) {
  const db = getDb()
  const offset = (params.pageNum - 1) * params.pageSize

  let total: number
  let datas: any[]

  if (params.dictType) {
    total = (db.prepare('SELECT COUNT(*) AS count FROM za_dict_data WHERE dict_type = ?').get(params.dictType) as any).count
    datas = toCamelCaseList(db.prepare(
      'SELECT * FROM za_dict_data WHERE dict_type = ? ORDER BY dict_sort LIMIT ? OFFSET ?',
    ).all(params.dictType, params.pageSize, offset) as any[])
  }
  else {
    total = (db.prepare('SELECT COUNT(*) AS count FROM za_dict_data').get() as any).count
    datas = toCamelCaseList(db.prepare(
      'SELECT * FROM za_dict_data ORDER BY dict_sort LIMIT ? OFFSET ?',
    ).all(params.pageSize, offset) as any[])
  }

  return { list: datas, total, pageSize: params.pageSize, pageNum: params.pageNum }
}

export function createDictData(data: { dictType: string, dictLabel: string, dictValue: string, dictSort?: number, status?: number, remark?: string, cssClass?: string, listClass?: string }) {
  const db = getDb()
  const result = db.prepare(
    'INSERT INTO za_dict_data (dict_type, dict_label, dict_value, dict_sort, status, remark, css_class, list_class, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(data.dictType, data.dictLabel, data.dictValue, data.dictSort || 0, data.status || 1, data.remark || null, data.cssClass || null, data.listClass || null, now())

  return toCamelCase(db.prepare('SELECT * FROM za_dict_data WHERE id = ?').get(result.lastInsertRowid) as any)
}

export function getDictDataById(id: number) {
  const db = getDb()
  const data = toCamelCase(db.prepare('SELECT * FROM za_dict_data WHERE id = ?').get(id) as any)
  if (!data)
    throw new NotFoundError('字典数据不存在')
  return data
}

export function updateDictData(id: number, data: { dictType?: string, dictLabel?: string, dictValue?: string, dictSort?: number, status?: number, remark?: string, cssClass?: string, listClass?: string }) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM za_dict_data WHERE id = ?').get(id)
  if (!existing)
    throw new NotFoundError('字典数据不存在')

  const sets: string[] = []
  const values: any[] = []
  if (data.dictType !== undefined) { sets.push('dict_type = ?'); values.push(data.dictType) }
  if (data.dictLabel !== undefined) { sets.push('dict_label = ?'); values.push(data.dictLabel) }
  if (data.dictValue !== undefined) { sets.push('dict_value = ?'); values.push(data.dictValue) }
  if (data.dictSort !== undefined) { sets.push('dict_sort = ?'); values.push(data.dictSort) }
  if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status) }
  if (data.remark !== undefined) { sets.push('remark = ?'); values.push(data.remark) }
  if (data.cssClass !== undefined) { sets.push('css_class = ?'); values.push(data.cssClass) }
  if (data.listClass !== undefined) { sets.push('list_class = ?'); values.push(data.listClass) }

  if (sets.length === 0)
    throw new NotFoundError('没有需要更新的字段')

  values.push(id)
  db.prepare(`UPDATE za_dict_data SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return toCamelCase(db.prepare('SELECT * FROM za_dict_data WHERE id = ?').get(id) as any)
}

export function deleteDictData(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM za_dict_data WHERE id = ?').run(id)
}

export function getDictDataByType(dictType: string) {
  const db = getDb()
  return toCamelCaseList(db.prepare(
    'SELECT * FROM za_dict_data WHERE dict_type = ? ORDER BY dict_sort',
  ).all(dictType) as any[])
}
