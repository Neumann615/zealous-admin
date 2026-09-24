import { beforeAll, describe, expect, it } from 'vitest'

process.env.DB_PATH = ':memory:'

const { initDb } = await import('../../db')
const { BadRequestError, ConflictError } = await import('../../lib/errors')
const formService = await import('./form.service')
const categoryService = await import('./formCategory.service')

beforeAll(() => {
  initDb()
})

describe('form category management', () => {
  it('支持两级分类、排序树和同级重名校验', () => {
    const root = categoryService.createCategory({ name: '股权投资', sortOrder: 1 }) as any
    const child = categoryService.createCategory({ parentId: root.id, name: '项目立项', sortOrder: 2 }) as any

    expect(root.parentId).toBeNull()
    expect(child.parentId).toBe(root.id)
    expect(() => categoryService.createCategory({ parentId: child.id, name: '第三级' })).toThrow(BadRequestError)
    expect(() => categoryService.createCategory({ parentId: root.id, name: '项目立项' })).toThrow(ConflictError)

    const tree = categoryService.getCategoryTree() as any[]
    expect(tree[0].name).toBe('股权投资')
    expect(tree[0].children[0].name).toBe('项目立项')
  })

  it('分类筛选包含子分类，禁用分类不能挂载表单', () => {
    const root = categoryService.createCategory({ name: '检索根分类' }) as any
    const child = categoryService.createCategory({ parentId: root.id, name: '检索子分类' }) as any
    const rootForm = formService.createForm({ name: '根分类表单', categoryId: root.id }) as any
    const childForm = formService.createForm({ name: '子分类表单', categoryId: child.id }) as any

    const rootPage = formService.getFormList({ categoryId: root.id, pageNum: 1, pageSize: 10 }) as any
    expect(rootPage.total).toBe(2)
    expect(rootPage.list.map((item: any) => item.id)).toEqual(expect.arrayContaining([rootForm.id, childForm.id]))
    expect(rootPage.list.every((item: any) => item.categoryId === root.id || item.categoryId === child.id)).toBe(true)

    const childPage = formService.getFormList({ categoryId: child.id, pageNum: 1, pageSize: 10 }) as any
    expect(childPage.total).toBe(1)
    expect(childPage.list[0].categoryName).toBe('检索子分类')

    const keyPage = formService.getFormList({ keyword: childForm.formKey, pageNum: 1, pageSize: 10 }) as any
    expect(keyPage.total).toBe(1)
    expect(keyPage.list[0].id).toBe(childForm.id)

    const draftPage = formService.getFormList({ status: 0, categoryId: root.id, pageNum: 1, pageSize: 10 }) as any
    expect(draftPage.total).toBe(2)
    const publishedPage = formService.getFormList({ status: 1, categoryId: root.id, pageNum: 1, pageSize: 10 }) as any
    expect(publishedPage.total).toBe(0)

    categoryService.updateCategoryStatus(child.id, 0)
    expect(() => formService.updateForm({ id: rootForm.id, categoryId: child.id })).toThrow(ConflictError)
  })

  it('引用保护和移动保护阻止误删误挂', () => {
    const root = categoryService.createCategory({ name: '保护根分类' }) as any
    const child = categoryService.createCategory({ parentId: root.id, name: '保护子分类' }) as any
    const form = formService.createForm({ name: '受保护表单', categoryId: child.id }) as any

    expect(() => categoryService.deleteCategory(child.id)).toThrow(ConflictError)
    expect(() => categoryService.updateCategory(root.id, { parentId: child.id })).toThrow(BadRequestError)
    expect(() => categoryService.updateCategoryStatus(root.id, 0)).toThrow(ConflictError)

    formService.deleteForm(form.id)
    categoryService.deleteCategory(child.id)
    categoryService.updateCategoryStatus(root.id, 0)
    categoryService.deleteCategory(root.id)
    expect((categoryService.getCategoryTree() as any[]).some(item => item.id === root.id)).toBe(false)
  })
})
