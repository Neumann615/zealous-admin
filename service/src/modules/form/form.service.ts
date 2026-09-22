import { getDb } from '../../db'
import { toCamelCase, toCamelCaseList } from '../../lib/camel'
import { BadRequestError, NotFoundError } from '../../lib/errors'
import { now } from '../../lib/date'

const LIST_COLUMNS = 'id, name, description, status, version, create_time, update_time'
const DATA_COUNT = '(SELECT COUNT(*) FROM za_form_data d WHERE d.form_id = za_form.id) AS data_count'

export function getFormList(params: { keyword?: string, pageNum: number, pageSize: number }) {
  const db = getDb()
  const offset = (params.pageNum - 1) * params.pageSize

  let total: number
  let list: any[]
  if (params.keyword) {
    const like = `%${params.keyword}%`
    total = (db.prepare('SELECT COUNT(*) AS count FROM za_form WHERE name LIKE ?').get(like) as any).count
    list = toCamelCaseList(db.prepare(
      `SELECT ${LIST_COLUMNS}, ${DATA_COUNT} FROM za_form WHERE name LIKE ? ORDER BY update_time DESC LIMIT ? OFFSET ?`,
    ).all(like, params.pageSize, offset) as any[])
  }
  else {
    total = (db.prepare('SELECT COUNT(*) AS count FROM za_form').get() as any).count
    list = toCamelCaseList(db.prepare(
      `SELECT ${LIST_COLUMNS}, ${DATA_COUNT} FROM za_form ORDER BY update_time DESC LIMIT ? OFFSET ?`,
    ).all(params.pageSize, offset) as any[])
  }
  return { list, total, pageSize: params.pageSize, pageNum: params.pageNum }
}

export function getFormDetail(id: number) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM za_form WHERE id = ?').get(id) as any
  if (!row)
    throw new NotFoundError('表单不存在')
  return toCamelCase(row)
}

export function createForm(data: { name: string, description?: string }) {
  const db = getDb()
  const nowStr = now()
  const result = db.prepare(
    'INSERT INTO za_form (name, description, schema, status, version, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(data.name, data.description || '', '', 0, 1, nowStr, nowStr)
  return { id: Number(result.lastInsertRowid) }
}

export function updateForm(data: { id: number, name?: string, description?: string, schema?: string, status?: number }) {
  const db = getDb()
  const existing = db.prepare('SELECT id, version FROM za_form WHERE id = ?').get(data.id) as any
  if (!existing)
    throw new NotFoundError('表单不存在')

  let permissionsText: string | null = null
  if (data.schema !== undefined) {
    try {
      const parsedSchema = JSON.parse(data.schema)
      permissionsText = JSON.stringify(parsedSchema.permissions ?? {})
    }
    catch {
      throw new NotFoundError('表单 Schema 不是合法 JSON')
    }
  }

  const versionBump = data.schema !== undefined ? 1 : 0
  db.prepare(
    `UPDATE za_form SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      schema = COALESCE(?, schema),
      status = COALESCE(?, status),
      permissions = COALESCE(?, permissions),
      version = version + ?,
      update_time = ?
    WHERE id = ?`,
  ).run(data.name ?? null, data.description ?? null, data.schema ?? null, data.status ?? null, permissionsText, versionBump, now(), data.id)
}

export function deleteForm(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM za_form_data WHERE form_id = ?').run(id)
  db.prepare('DELETE FROM za_form WHERE id = ?').run(id)
}

export function renderForm(formId: number, data?: Record<string, any>, dataId?: number) {
  const db = getDb()
  const form = db.prepare('SELECT id, name, schema, status, version, permissions FROM za_form WHERE id = ?').get(formId) as any
  if (!form)
    throw new NotFoundError('表单不存在')
  if (!form.schema)
    throw new NotFoundError('表单尚未保存设计')

  let savedData: Record<string, any> | undefined
  if (dataId !== undefined) {
    const row = db.prepare('SELECT data FROM za_form_data WHERE id = ? AND form_id = ?').get(dataId, formId) as any
    if (!row)
      throw new NotFoundError('回显数据不存在或不属于该表单')
    try {
      savedData = JSON.parse(row.data)
    }
    catch {
      throw new BadRequestError('回显数据不是合法 JSON')
    }
  }

  const merged = { ...savedData, ...data }
  let permissions: Record<string, any> | undefined
  if (form.permissions) {
    try {
      permissions = typeof form.permissions === 'string' ? JSON.parse(form.permissions) : form.permissions
    }
    catch { permissions = undefined }
  }

  const contract = {
    schema: form.schema,
    data: merged,
    permissions,
    formVersion: form.version,
  }
  return { name: form.name, renderContract: contract }
}
