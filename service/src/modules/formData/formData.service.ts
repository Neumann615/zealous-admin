import { getDb } from '../../db'
import { toCamelCase, toCamelCaseList } from '../../lib/camel'
import { BadRequestError, NotFoundError } from '../../lib/errors'
import { now } from '../../lib/date'

export function submitFormData(formId: number, data: Record<string, any>, submitter: string) {
  const db = getDb()
  const form = db.prepare('SELECT id, version FROM za_form WHERE id = ?').get(formId) as any
  if (!form)
    throw new NotFoundError('表单不存在')

  const result = db.prepare(
    'INSERT INTO za_form_data (form_id, form_version, submitter, status, data, create_time) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(form.id, form.version ?? 1, submitter, 1, JSON.stringify(data), now())
  return { id: Number(result.lastInsertRowid) }
}

export function getFormDataList(params: { formId: number, submitter?: string, status?: string | number, pageNum: number, pageSize: number }) {
  const db = getDb()
  const offset = (params.pageNum - 1) * params.pageSize

  const where = ['form_id = ?']
  const args: any[] = [params.formId]
  if (params.submitter) {
    where.push('submitter LIKE ?')
    args.push(`%${params.submitter}%`)
  }
  if (params.status !== undefined && params.status !== '') {
    where.push('status = ?')
    args.push(Number(params.status))
  }
  const whereSql = where.join(' AND ')

  const total = (db.prepare(`SELECT COUNT(*) AS count FROM za_form_data WHERE ${whereSql}`).get(...args) as any).count
  const list = toCamelCaseList(db.prepare(
    `SELECT id, form_id, form_version, submitter, status, data, create_time
     FROM za_form_data WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
  ).all(...args, params.pageSize, offset) as any[])

  return { list, total, pageSize: params.pageSize, pageNum: params.pageNum }
}

export function getFormDataDetail(id: number) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM za_form_data WHERE id = ?').get(id) as any
  if (!row)
    throw new NotFoundError('数据不存在')
  return toCamelCase(row)
}

export function updateFormDataStatus(id: number, status: number) {
  const db = getDb()
  const next = status === 0 ? 0 : 1
  const result = db.prepare('UPDATE za_form_data SET status = ? WHERE id = ?').run(next, id)
  if (!result.changes)
    throw new NotFoundError('数据不存在')
  return next === 1 ? '已恢复' : '已作废'
}

export function deleteFormData(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM za_form_data WHERE id = ?').run(id)
}
