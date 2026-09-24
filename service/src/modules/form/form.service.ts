import { randomUUID } from 'node:crypto'
import { getDb } from '../../db'
import { toCamelCase, toCamelCaseList } from '../../lib/camel'
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors'
import { now } from '../../lib/date'
import { createEmptyFormContract, parseFormContract, type FormContract } from './form.contract'
import { assertAssignableCategory, getCategoryBranchIds } from './formCategory.service'

interface FormRow {
  id: number
  form_key: string
  name: string
  description: string | null
  schema: string | null
  status: number
  version: number | null
  permissions: string | null
  category_id: number | null
  current_version_id: number | null
  deleted_at: string | null
  create_time: string | null
  update_time: string | null
}

interface VersionRow {
  id: number
  form_id: number
  schema_version: number
  schema: string
  field_contract: string
  status: number
  is_current: number
  lock_version: number
  create_time: string | null
  update_time: string | null
}

const VERSION_COLUMNS = 'id, form_id, schema_version, schema, field_contract, status, is_current, lock_version, create_time, update_time'

function withTransaction<T>(action: () => T): T {
  const db = getDb()
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = action()
    db.exec('COMMIT')
    return result
  }
  catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function getForm(id: number): FormRow {
  const form = getDb().prepare('SELECT * FROM za_form WHERE id = ? AND deleted_at IS NULL').get(id) as FormRow | undefined
  if (!form)
    throw new NotFoundError('表单不存在')
  return form
}

function getDraftVersion(formId: number): VersionRow | undefined {
  return getDb().prepare(`SELECT ${VERSION_COLUMNS} FROM za_form_version WHERE form_id = ? AND status = 0`).get(formId) as VersionRow | undefined
}

function getCurrentVersion(formId: number): VersionRow | undefined {
  return getDb().prepare(`SELECT ${VERSION_COLUMNS} FROM za_form_version WHERE form_id = ? AND is_current = 1`).get(formId) as VersionRow | undefined
}

function getLinkedVersion(formId: number): VersionRow | undefined {
  return getDb().prepare(`
    SELECT ${VERSION_COLUMNS}
    FROM za_form_version
    WHERE id = (SELECT current_version_id FROM za_form WHERE id = ?)
  `).get(formId) as VersionRow | undefined
}

function getVersion(formId: number, versionId?: number): VersionRow | undefined {
  if (versionId !== undefined)
    return getDb().prepare(`SELECT ${VERSION_COLUMNS} FROM za_form_version WHERE id = ? AND form_id = ?`).get(versionId, formId) as VersionRow | undefined
  return getDraftVersion(formId) ?? getCurrentVersion(formId) ?? getLinkedVersion(formId)
}

function getVersions(formId: number): VersionRow[] {
  return getDb().prepare(`SELECT ${VERSION_COLUMNS} FROM za_form_version WHERE form_id = ? ORDER BY schema_version DESC`).all(formId) as unknown as VersionRow[]
}

function generateFormKey(): string {
  return `form_${randomUUID().replaceAll('-', '').slice(0, 16)}`
}

function readContract(version: VersionRow): FormContract {
  if (version.field_contract) {
    try {
      return JSON.parse(version.field_contract) as FormContract
    }
    catch {
      // 老数据契约损坏时按 schema 重建，不改变设计内容。
    }
  }
  if (!version.schema)
    return createEmptyFormContract()
  return parseFormContract(version.schema).contract
}

function readContractFromSchema(schema: string): FormContract {
  try {
    return parseFormContract(schema).contract
  }
  catch {
    return createEmptyFormContract()
  }
}

function syncLegacyColumns(formId: number, version: VersionRow | undefined) {
  if (!version)
    return
  const contract = readContract(version)
  getDb().prepare(`
    UPDATE za_form
    SET schema = ?, version = ?, permissions = ?, update_time = ?
    WHERE id = ?
  `).run(version.schema, version.schema_version, contract.permissions ? JSON.stringify(contract.permissions) : null, now(), formId)
}

function versionSummary(row: VersionRow) {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    status: row.status,
    isCurrent: row.is_current === 1,
    lockVersion: row.lock_version,
    createTime: row.create_time,
    updateTime: row.update_time,
  }
}

export function getFormList(params: { keyword?: string, status?: number, categoryId?: number, pageNum: number, pageSize: number }) {
  const db = getDb()
  const offset = (params.pageNum - 1) * params.pageSize
  const where = ['f.deleted_at IS NULL']
  const args: any[] = []
  if (params.keyword) {
    where.push('(f.name LIKE ? OR f.form_key LIKE ?)')
    args.push(`%${params.keyword}%`, `%${params.keyword}%`)
  }
  if (params.status !== undefined) {
    where.push('f.status = ?')
    args.push(params.status)
  }
  if (params.categoryId !== undefined) {
    const categoryIds = getCategoryBranchIds(params.categoryId)
    where.push(`f.category_id IN (${categoryIds.map(() => '?').join(',')})`)
    args.push(...categoryIds)
  }
  const whereSql = where.join(' AND ')
  const listSql = `
    SELECT
      f.*,
      category.name AS category_name,
      current_version.schema_version AS current_schema_version,
      draft_version.id AS draft_version_id,
      draft_version.schema_version AS draft_schema_version,
      draft_version.lock_version AS draft_lock_version,
      (SELECT COUNT(*) FROM za_form_version v WHERE v.form_id = f.id AND v.status <> 3) AS version_count,
      (SELECT COUNT(*) FROM za_form_data d WHERE d.form_id = f.id) AS data_count
    FROM za_form f
    LEFT JOIN za_form_category category ON category.id = f.category_id
    LEFT JOIN za_form_version current_version ON current_version.id = f.current_version_id
    LEFT JOIN za_form_version draft_version ON draft_version.form_id = f.id AND draft_version.status = 0
    WHERE ${whereSql}
    ORDER BY f.update_time DESC, f.id DESC
    LIMIT ? OFFSET ?
  `
  const total = (db.prepare(`SELECT COUNT(*) AS count FROM za_form f WHERE ${whereSql}`).get(...args) as { count: number }).count
  const rows = db.prepare(listSql).all(...args, params.pageSize, offset) as any[]
  const list = toCamelCaseList(rows).map((row: any) => {
    const schemaVersion = row.currentSchemaVersion ?? row.draftSchemaVersion ?? 1
    const schema = row.schema || ''
    const contract = schema ? readContractFromSchema(schema) : createEmptyFormContract()
    return {
      ...row,
      version: schemaVersion,
      hasDraft: !!row.draftVersionId,
      fieldCount: contract.fieldCount,
    }
  })
  return { list, total, pageSize: params.pageSize, pageNum: params.pageNum }
}

export function getFormDetail(id: number, versionId?: number) {
  const form = getForm(id)
  const versions = getVersions(id)
  const selected = getVersion(id, versionId)
  if (versionId !== undefined && !selected)
    throw new NotFoundError('表单版本不存在')
  const current = getCurrentVersion(id)
  const draft = getDraftVersion(id)
  const contract = selected ? readContract(selected) : createEmptyFormContract()
  return toCamelCase({
    ...form,
    schema: selected?.schema ?? '',
    permissions: contract.permissions ? JSON.stringify(contract.permissions) : null,
    version: selected?.schema_version ?? 1,
    currentVersion: current?.schema_version,
    currentVersionId: current?.id,
    versionId: selected?.id,
    lockVersion: selected?.lock_version ?? 0,
    versionStatus: selected?.status,
    hasDraft: !!draft,
    draftVersionId: draft?.id,
    draftLockVersion: draft?.lock_version,
    fieldCount: contract.fieldCount,
    diagnostics: contract.diagnostics,
    versions: versions.filter(item => item.status !== 3).map(versionSummary),
  })
}

export function createForm(data: { name: string, description?: string, schema?: string, categoryId?: number | null }) {
  const db = getDb()
  const nowStr = now()
  return withTransaction(() => {
    assertAssignableCategory(data.categoryId)
    let formKey = generateFormKey()
    while (db.prepare('SELECT 1 FROM za_form WHERE form_key = ? AND deleted_at IS NULL').get(formKey))
      formKey = generateFormKey()
    const formResult = db.prepare(`
      INSERT INTO za_form (form_key, name, description, schema, status, version, permissions, category_id, create_time, update_time)
      VALUES (?, ?, ?, '', 0, 1, NULL, ?, ?, ?)
    `).run(formKey, data.name, data.description || '', data.categoryId ?? null, nowStr, nowStr)
    const formId = Number(formResult.lastInsertRowid)
    const schema = data.schema || ''
    const contract = schema ? parseFormContract(schema).contract : createEmptyFormContract()
    const versionResult = db.prepare(`
      INSERT INTO za_form_version (
        form_id, schema_version, schema, field_contract, status, is_current, lock_version, create_time, update_time
      )
      VALUES (?, 1, ?, ?, 0, 0, 0, ?, ?)
    `).run(formId, schema, JSON.stringify(contract), nowStr, nowStr)
    const versionId = Number(versionResult.lastInsertRowid)
    db.prepare('UPDATE za_form SET schema = ?, permissions = ? WHERE id = ?')
      .run(schema, contract.permissions ? JSON.stringify(contract.permissions) : null, formId)
    return { id: formId, formKey, versionId, schemaVersion: 1, lockVersion: 0 }
  })
}

export function updateForm(data: {
  id: number
  name?: string
  description?: string
  categoryId?: number | null
  schema?: string
  lockVersion?: number
}) {
  const db = getDb()
  return withTransaction(() => {
    const form = getForm(data.id)
    if (data.categoryId !== undefined)
      assertAssignableCategory(data.categoryId)
    if (data.schema !== undefined) {
      const draft = getDraftVersion(form.id)
      if (!draft)
        throw new ConflictError('已发布表单不能直接修改 Schema，请先派生新草稿')
      if (data.lockVersion === undefined)
        throw new BadRequestError('保存设计必须携带 lockVersion')
      if (draft.lock_version !== data.lockVersion)
        throw new ConflictError('表单已被其他人修改，请刷新后重试')
      const contract = parseFormContract(data.schema)
      db.prepare(`
        UPDATE za_form_version
        SET schema = ?, field_contract = ?, lock_version = lock_version + 1, update_time = ?
        WHERE id = ?
      `).run(data.schema, JSON.stringify(contract.contract), now(), draft.id)
    }
    if (data.name !== undefined || data.description !== undefined || data.categoryId !== undefined) {
      const updates = ['update_time = ?']
      const metadataArgs: any[] = [now()]
      if (data.name !== undefined) {
        updates.push('name = ?')
        metadataArgs.push(data.name)
      }
      if (data.description !== undefined) {
        updates.push('description = ?')
        metadataArgs.push(data.description)
      }
      if (data.categoryId !== undefined) {
        updates.push('category_id = ?')
        metadataArgs.push(data.categoryId)
      }
      metadataArgs.push(form.id)
      db.prepare(`
        UPDATE za_form
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...metadataArgs)
    }
    const next = getDraftVersion(form.id) ?? getCurrentVersion(form.id)
    syncLegacyColumns(form.id, next)
    return { id: form.id, versionId: next?.id, lockVersion: next?.lock_version ?? 0 }
  })
}

export function createDraft(id: number) {
  const db = getDb()
  return withTransaction(() => {
    const form = getForm(id)
    if (getDraftVersion(form.id))
      throw new ConflictError('该表单已存在草稿')
    const source = getCurrentVersion(form.id) ?? getLinkedVersion(form.id)
      ?? db.prepare(`SELECT ${VERSION_COLUMNS} FROM za_form_version WHERE form_id = ? AND status = 1 ORDER BY schema_version DESC LIMIT 1`).get(form.id) as VersionRow | undefined
    if (!source)
      throw new ConflictError('表单还没有可派生草稿的版本')
    const nextVersion = Number((db.prepare('SELECT COALESCE(MAX(schema_version), 0) + 1 AS next FROM za_form_version WHERE form_id = ?').get(form.id) as { next: number }).next)
    const nowStr = now()
    const result = db.prepare(`
      INSERT INTO za_form_version (
        form_id, schema_version, schema, field_contract, status, is_current, lock_version, create_time, update_time
      )
      VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)
    `).run(form.id, nextVersion, source.schema, source.field_contract, nowStr, nowStr)
    const draftId = Number(result.lastInsertRowid)
    syncLegacyColumns(form.id, getDraftVersion(form.id))
    return { id: form.id, versionId: draftId, schemaVersion: nextVersion, lockVersion: 0 }
  })
}

export function publishForm(id: number) {
  const db = getDb()
  return withTransaction(() => {
    const form = getForm(id)
    const draft = getDraftVersion(form.id)
    if (!draft)
      throw new ConflictError('表单没有可发布草稿')
    const { contract } = parseFormContract(draft.schema)
    if (contract.fieldCount === 0)
      throw new BadRequestError('表单还没有可提交字段，不能发布')
    const current = getCurrentVersion(form.id)
    if (current)
      db.prepare('UPDATE za_form_version SET is_current = 0, update_time = ? WHERE id = ?').run(now(), current.id)
    db.prepare('UPDATE za_form_version SET status = 1, is_current = 1, update_time = ? WHERE id = ?').run(now(), draft.id)
    db.prepare('UPDATE za_form SET status = 1, current_version_id = ?, update_time = ? WHERE id = ?')
      .run(draft.id, now(), form.id)
    syncLegacyColumns(form.id, getCurrentVersion(form.id))
    return { id: form.id, versionId: draft.id, schemaVersion: draft.schema_version }
  })
}

export function retireForm(id: number) {
  const db = getDb()
  return withTransaction(() => {
    const form = getForm(id)
    const current = getCurrentVersion(form.id)
    if (!current)
      throw new ConflictError('表单没有生效版本，不能退役')
    db.prepare('UPDATE za_form_version SET status = 2, is_current = 0, update_time = ? WHERE id = ?').run(now(), current.id)
    db.prepare('UPDATE za_form SET status = 2, update_time = ? WHERE id = ?').run(now(), form.id)
    return { id: form.id, retiredVersionId: current.id }
  })
}

export function reviveForm(id: number) {
  const db = getDb()
  return withTransaction(() => {
    const form = getForm(id)
    const version = getLinkedVersion(form.id)
    if (!version)
      throw new ConflictError('表单没有可恢复版本')
    db.prepare('UPDATE za_form_version SET status = 1, is_current = 1, update_time = ? WHERE id = ?').run(now(), version.id)
    db.prepare('UPDATE za_form SET status = 1, current_version_id = ?, update_time = ? WHERE id = ?')
      .run(version.id, now(), form.id)
    syncLegacyColumns(form.id, getCurrentVersion(form.id))
    return { id: form.id, versionId: version.id, schemaVersion: version.schema_version }
  })
}

export function deleteForm(id: number) {
  const db = getDb()
  return withTransaction(() => {
    const form = getForm(id)
    const draft = getDraftVersion(id)
    const current = getCurrentVersion(id)
    if ((form.status === 1 || form.status === 2) && !draft)
      throw new ConflictError(form.status === 2 ? '已退役表单保留历史数据，不能删除' : '已发布表单不能删除，请改用退役')
    if (current) {
      if (!draft)
        throw new ConflictError('草稿不存在')
      db.prepare('UPDATE za_form_version SET status = 3, is_current = 0, update_time = ? WHERE id = ?').run(now(), draft.id)
      syncLegacyColumns(id, current)
      return { discardedDraft: true, versionId: draft.id }
    }
    if (draft)
      db.prepare('UPDATE za_form_version SET status = 3, is_current = 0, update_time = ? WHERE id = ?').run(now(), draft.id)
    db.prepare('UPDATE za_form SET status = 3, deleted_at = ?, update_time = ? WHERE id = ?').run(now(), now(), id)
    return { discardedDraft: false, formId: id }
  })
}

export function getFormVersions(id: number) {
  getForm(id)
  return getVersions(id).filter(version => version.status !== 3).map(versionSummary)
}

export function renderForm(
  formId: number,
  data?: Record<string, any>,
  dataId?: number,
  versionId?: number,
  allowDraft = false,
) {
  const db = getDb()
  const form = getForm(formId)
  let version: VersionRow | undefined
  let savedData: Record<string, any> | undefined

  if (dataId !== undefined) {
    const row = db.prepare(`
      SELECT d.data, v.id AS version_id
      FROM za_form_data d
      LEFT JOIN za_form_version v ON v.id = d.form_version_id
      WHERE d.id = ? AND d.form_id = ?
    `).get(dataId, formId) as { data: string, version_id: number | null } | undefined
    if (!row)
      throw new NotFoundError('回显数据不存在或不属于该表单')
    version = row.version_id
      ? db.prepare(`SELECT ${VERSION_COLUMNS} FROM za_form_version WHERE id = ?`).get(row.version_id) as VersionRow | undefined
      : getCurrentVersion(formId)
    try {
      savedData = JSON.parse(row.data)
    }
    catch {
      throw new BadRequestError('回显数据不是合法 JSON')
    }
  }
  else {
    version = versionId ? getVersion(formId, versionId) : getCurrentVersion(formId)
    if (!version && allowDraft)
      version = getDraftVersion(formId)
  }
  if (!version)
    throw new ConflictError(form.status === 2 ? '表单已退役，不能渲染' : '表单尚未发布')
  if (versionId !== undefined && !version)
    throw new NotFoundError('表单版本不存在')
  if (version.status === 0 && !allowDraft && dataId === undefined)
    throw new ConflictError('草稿不能用于填写渲染')

  const contract = readContract(version)
  const merged = { ...savedData, ...data }
  return {
    name: form.name,
    renderContract: {
      schema: version.schema,
      fieldContract: contract,
      data: merged,
      permissions: contract.permissions,
      formVersion: version.schema_version,
      versionId: version.id,
    },
  }
}
