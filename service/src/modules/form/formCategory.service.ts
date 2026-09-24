import { getDb } from '../../db'
import { toCamelCase, toCamelCaseList } from '../../lib/camel'
import { now } from '../../lib/date'
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors'

interface CategoryRow {
  id: number
  parent_id: number | null
  name: string
  sort_order: number
  status: number
  create_time: string | null
  update_time: string | null
}

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

function getCategoryRows(): CategoryRow[] {
  return getDb().prepare(`
    SELECT *
    FROM za_form_category
    ORDER BY sort_order, id
  `).all() as unknown as CategoryRow[]
}

function getCategory(id: number): CategoryRow {
  const row = getDb().prepare('SELECT * FROM za_form_category WHERE id = ?').get(id) as CategoryRow | undefined
  if (!row)
    throw new NotFoundError('表单分类不存在')
  return row
}

function assertParentCategory(parentId: number | null | undefined) {
  if (parentId === null || parentId === undefined)
    return
  const parent = getCategory(parentId)
  if (parent.status !== 1)
    throw new ConflictError('父级分类已停用')
  if (parent.parent_id !== null)
    throw new BadRequestError('表单分类最多支持两级')
}

function assertSiblingNameUnique(parentId: number | null, name: string, excludeId?: number) {
  const row = getDb().prepare(`
    SELECT id
    FROM za_form_category
    WHERE parent_id IS ? AND name = ?
  `).get(parentId, name) as { id: number } | undefined
  if (row && row.id !== excludeId)
    throw new ConflictError('同级分类名称已存在')
}

function toTree(rows: CategoryRow[], parentId: number | null = null): any[] {
  return rows
    .filter(row => row.parent_id === parentId)
    .map(row => ({
      ...toCamelCase(row as any),
      children: toTree(rows, row.id),
    }))
}

function collectBranchIds(rows: CategoryRow[], id: number): number[] {
  const result = [id]
  rows.filter(row => row.parent_id === id).forEach((child) => {
    result.push(...collectBranchIds(rows, child.id))
  })
  return result
}

export function getCategoryTree() {
  return toTree(getCategoryRows())
}

export function getCategoryBranchIds(id: number): number[] {
  getCategory(id)
  return collectBranchIds(getCategoryRows(), id)
}

export function assertAssignableCategory(categoryId: number | null | undefined) {
  if (categoryId === null || categoryId === undefined)
    return
  const category = getCategory(categoryId)
  if (category.status !== 1)
    throw new ConflictError('表单分类已停用')
}

export function createCategory(data: { parentId?: number | null, name: string, sortOrder?: number }) {
  const name = data.name.trim()
  if (!name)
    throw new BadRequestError('分类名称不能为空')
  const parentId = data.parentId ?? null
  assertParentCategory(parentId)
  assertSiblingNameUnique(parentId, name)

  const result = getDb().prepare(`
    INSERT INTO za_form_category (parent_id, name, sort_order, status, create_time, update_time)
    VALUES (?, ?, ?, 1, ?, ?)
  `).run(parentId, name, data.sortOrder ?? 0, now(), now())
  return toCamelCase(getCategory(Number(result.lastInsertRowid)) as any)
}

export function updateCategory(id: number, data: {
  parentId?: number | null
  name?: string
  sortOrder?: number
}) {
  return withTransaction(() => {
    const category = getCategory(id)
    const name = data.name === undefined ? category.name : data.name.trim()
    if (!name)
      throw new BadRequestError('分类名称不能为空')
    const parentId = data.parentId === undefined ? category.parent_id : data.parentId
    if (parentId !== null && parentId !== undefined) {
      if (parentId === id)
        throw new BadRequestError('分类不能挂载到自己下面')
      if (collectBranchIds(getCategoryRows(), id).includes(parentId))
        throw new BadRequestError('分类不能挂载到自己的子分类下面')
    }
    assertParentCategory(parentId)
    assertSiblingNameUnique(parentId ?? null, name, id)

    getDb().prepare(`
      UPDATE za_form_category
      SET parent_id = ?, name = ?, sort_order = ?, update_time = ?
      WHERE id = ?
    `).run(parentId ?? null, name, data.sortOrder ?? category.sort_order, now(), id)
    return toCamelCase(getCategory(id) as any)
  })
}

export function updateCategoryStatus(id: number, status: number) {
  const category = getCategory(id)
  if (status === 0) {
    const child = getDb().prepare('SELECT 1 FROM za_form_category WHERE parent_id = ? LIMIT 1').get(id)
    if (child)
      throw new ConflictError('请先处理子分类')
  }
  getDb().prepare('UPDATE za_form_category SET status = ?, update_time = ? WHERE id = ?')
    .run(status, now(), category.id)
  return toCamelCase(getCategory(id) as any)
}

export function deleteCategory(id: number) {
  getCategory(id)
  const child = getDb().prepare('SELECT 1 FROM za_form_category WHERE parent_id = ? LIMIT 1').get(id)
  if (child)
    throw new ConflictError('分类下存在子分类，不能删除')
  const form = getDb().prepare('SELECT 1 FROM za_form WHERE category_id = ? AND deleted_at IS NULL LIMIT 1').get(id)
  if (form)
    throw new ConflictError('分类下存在表单，不能删除')
  getDb().prepare('DELETE FROM za_form_category WHERE id = ?').run(id)
  return null
}

export function getCategoryList() {
  return toCamelCaseList(getCategoryRows() as any[])
}
