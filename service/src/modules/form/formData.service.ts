import { getDb } from '../../db'
import { toCamelCase, toCamelCaseList } from '../../lib/camel'
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors'
import { now } from '../../lib/date'
import { parseFormContract, validateFormData, type FormContract } from './form.contract'

interface SubmissionVersion {
  id: number
  schema: string
  field_contract: string
}

function readSubmissionContract(version: SubmissionVersion): FormContract {
  if (version.field_contract) {
    try {
      return JSON.parse(version.field_contract) as FormContract
    }
    catch {
      // 契约异常时按 Schema 宽松重建，不阻止兼容旧数据。
    }
  }
  return version.schema ? parseFormContract(version.schema).contract : {
    schemaVersion: 1,
    fieldCount: 0,
    fields: [],
    permissions: undefined,
    diagnostics: [],
  }
}

export function submitFormData(formId: number, data: Record<string, any>, submitter: string) {
  const db = getDb()
  const form = db.prepare(`
    SELECT f.id, f.status, v.id AS version_id, v.schema_version, v.schema, v.field_contract
    FROM za_form f
    LEFT JOIN za_form_version v ON v.id = f.current_version_id
    WHERE f.id = ? AND f.deleted_at IS NULL
  `).get(formId) as any
  if (!form)
    throw new NotFoundError('表单不存在')
  if (form.status !== 1 || !form.version_id)
    throw new ConflictError(form.status === 2 ? '表单已退役，不能提交数据' : '表单尚未发布，不能提交数据')

  const contract = readSubmissionContract(form)
  const issues = validateFormData(contract, data)
  if (issues.length)
    throw new BadRequestError(issues.join('；'))

  const result = db.prepare(
    'INSERT INTO za_form_data (form_id, form_version, form_version_id, submitter, status, data, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(form.id, form.schema_version, form.version_id, submitter, 1, JSON.stringify(data), now())
  return { id: Number(result.lastInsertRowid) }
}

export function getFormDataList(params: { formId: number, versionId?: number, submitter?: string, status?: string | number, pageNum: number, pageSize: number }) {
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
  if (params.versionId !== undefined) {
    where.push('form_version_id = ?')
    args.push(params.versionId)
  }
  const whereSql = where.join(' AND ')

  const total = (db.prepare(`SELECT COUNT(*) AS count FROM za_form_data WHERE ${whereSql}`).get(...args) as any).count
  const list = toCamelCaseList(db.prepare(
    `SELECT id, form_id, form_version, form_version_id, submitter, status, data, create_time
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
