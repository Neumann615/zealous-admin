// @vitest-environment jsdom
/* eslint-disable perfectionist/sort-imports -- @dnd-kit/dom 在模块加载期就读取 ResizeObserver，兜底必须早于 FormDesigner 的 import */
import '../test/setupDom'
import type { FieldSchema, FormSchema } from '../types/schema'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getComponent, getMenus } from '../registry/registry'
import { createEmptySchema } from '../types/schema'
import { validateSchemaFieldNames } from '../utils/fieldName'
import { FormDesigner } from './FormDesigner'
import { useDesignerStore } from './store'
import '../registry/components'

// vitest 未开启 globals，RTL 的自动 cleanup 不会注册，这里手动清理避免跨用例串台
afterEach(cleanup)

/** P5 新增的 6 个组件 */
const NEW_TYPES = ['upload', 'money', 'icon', 'subForm', 'tableForm', 'stepForm']

function def(type: string) {
  const found = getComponent(type)
  if (!found)
    throw new Error(`组件未注册：${type}`)
  return found
}

function schemaOf(types: string[]): FormSchema {
  return {
    version: 1,
    form: { layout: 'vertical' },
    children: types.map(type => def(type).defaultSchema()),
  }
}

function renderDesigner(schema: FormSchema, onSave?: (schema: FormSchema) => void) {
  return render(
    <App>
      <FormDesigner initialSchema={schema} onSave={onSave} />
    </App>,
  )
}

/** 两个字段名相同的输入框：重名场景的通用夹具 */
function duplicateNameSchema(): { schema: FormSchema, first: FieldSchema, second: FieldSchema } {
  const first = def('input').defaultSchema()
  first.field = 'dup'
  first.label = '字段一'
  const second = def('input').defaultSchema()
  second.field = 'dup'
  second.label = '字段二'
  return {
    schema: { version: 1, form: { layout: 'vertical' }, children: [first, second] },
    first,
    second,
  }
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }))
}

/** 选中画布里第一个该类型节点，返回节点 */
function selectFirst(type: string): FieldSchema {
  const node = useDesignerStore.getState().schema.children.find(c => c.type === type)
  expect(node, `画布中应有 ${type}`).toBeTruthy()
  act(() => useDesignerStore.getState().select(node!.id))
  return node!
}

function openPreview() {
  fireEvent.click(screen.getByRole('button', { name: /预\s*览/ }))
  const modal = document.querySelector('.ant-modal') as HTMLElement | null
  expect(modal, '预览弹窗应已打开').toBeTruthy()
  return modal!
}

beforeEach(() => {
  // 设计器 store 是模块级单例，跨用例重置（cleanup 后已无挂载组件，无需 act）
  useDesignerStore.getState().setSchema(createEmptySchema())
})

describe('设计器交互（P5 新组件）', () => {
  it('左侧面板出现「高级组件」「子表单」分组与 6 个新组件', () => {
    renderDesigner(createEmptySchema())

    const menus = getMenus()
    expect(menus.map(g => g.title)).toContain('高级组件')
    expect(menus.map(g => g.title)).toContain('子表单')
    expect(menus.flatMap(g => g.list.map(d => d.type))).toEqual(expect.arrayContaining(NEW_TYPES))

    // 分组默认展开，面板里能直接看到组件名（「子表单」与分组标题同名，故用 getAllByText）
    for (const type of NEW_TYPES)
      expect(screen.getAllByText(def(type).title).length).toBeGreaterThan(0)
  })

  it('画布渲染 6 个新组件的设计态外壳不抛错', () => {
    const { container } = renderDesigner(schemaOf(NEW_TYPES))

    expect(useDesignerStore.getState().schema.children).toHaveLength(NEW_TYPES.length)
    // 画布的 Form 用 component={false}（无 form 元素），这里数 Form.Item：
    // upload / money / icon 各 1，subForm 子字段 1，tableForm 子字段 2，stepForm 无子字段
    expect(container.querySelectorAll('.ant-form-item')).toHaveLength(6)
    // stepForm 无 label，用步骤标题确认它渲染出了内容
    expect(screen.getByText('步骤一')).toBeTruthy()
  })

  it('表格子表单画布态走设计壳层，不渲染运行时的增行按钮', () => {
    const { baseElement } = renderDesigner(schemaOf(['tableForm']))

    expect(screen.getByText('运行时可增删行')).toBeTruthy()
    expect(within(baseElement).queryByText('添加一行')).toBeNull()
  })

  it('值绑定容器显示「字段名」，普通布局容器不显示', () => {
    renderDesigner(schemaOf(['subForm', 'tableForm', 'card']))

    selectFirst('subForm')
    expect(screen.getByText('字段名')).toBeTruthy()

    selectFirst('tableForm')
    expect(screen.getByText('字段名')).toBeTruthy()

    selectFirst('card')
    expect(screen.queryByText('字段名')).toBeNull()
  })

  it('校验规则只对非容器开放：upload 有、subForm 无', () => {
    renderDesigner(schemaOf(['upload', 'subForm']))

    selectFirst('upload')
    expect(screen.getByText('校验规则')).toBeTruthy()

    selectFirst('subForm')
    expect(screen.queryByText('校验规则')).toBeNull()
  })

  it('预览弹窗内表格子表单可增删行，列头由 children 生成', async () => {
    renderDesigner(schemaOf(['tableForm']))
    const modal = openPreview()

    const rowCount = () => modal.querySelectorAll('.ant-table-tbody tr.ant-table-row').length
    expect(rowCount()).toBe(0)
    // 列头取子字段 label，单元格不再重复渲染 label
    expect(within(modal).getAllByText('名称')).toHaveLength(1)
    expect(within(modal).getAllByText('数量')).toHaveLength(1)

    fireEvent.click(within(modal).getByRole('button', { name: /添加一行/ }))
    await waitFor(() => expect(rowCount()).toBe(1))
    expect(modal.querySelectorAll('.ant-table-tbody tr.ant-table-row input').length).toBeGreaterThan(0)

    fireEvent.click(within(modal).getAllByRole('button', { name: /删\s*除/ })[0])
    await waitFor(() => expect(rowCount()).toBe(0))
  })

  it('预览弹窗提交：子表单收进对象、表格子表单收成数组', async () => {
    const subForm = def('subForm').defaultSchema()
    subForm.field = 'contact'
    subForm.children = [{ id: 'sub-name', type: 'input', field: 'name', label: '姓名', props: {} }]
    const tableForm = def('tableForm').defaultSchema()
    tableForm.field = 'items'
    tableForm.children = [{ id: 'row-title', type: 'input', field: 'title', label: '品名', props: {} }]

    renderDesigner({ version: 1, form: { layout: 'vertical' }, children: [subForm, tableForm] })
    const modal = openPreview()

    fireEvent.click(within(modal).getByRole('button', { name: /添加一行/ }))
    await waitFor(() => expect(modal.querySelectorAll('.ant-table-tbody tr.ant-table-row')).toHaveLength(1))

    const nameInput = within(modal).getByText('姓名').closest('.ant-form-item')!.querySelector('input')!
    fireEvent.change(nameInput, { target: { value: '张三' } })
    const titleInput = modal.querySelector('.ant-table-tbody tr.ant-table-row input')!
    fireEvent.change(titleInput, { target: { value: '苹果' } })

    fireEvent.click(within(modal).getByRole('button', { name: /提\s*交/ }))
    await waitFor(() => expect(modal.querySelector('pre')).toBeTruthy())

    expect(JSON.parse(modal.querySelector('pre')!.textContent!)).toEqual({
      contact: { name: '张三' },
      items: [{ title: '苹果' }],
    })
  })

  it('删除含子字段的容器需二次确认，确认后仍可撤销', async () => {
    renderDesigner(schemaOf(['subForm']))
    const node = selectFirst('subForm')
    expect(node.children).toHaveLength(1)

    fireEvent.click(screen.getByTitle('删除'))
    // antd v6 的 confirm 标题会渲染出多个同名节点，故用 getAllByText
    await waitFor(() => expect(screen.getAllByText('删除容器？').length).toBeGreaterThan(0))
    // 未点确认前节点还在
    expect(useDesignerStore.getState().schema.children).toHaveLength(1)

    const okButtons = screen.getAllByRole('button', { name: /删\s*除/ })
    fireEvent.click(okButtons[okButtons.length - 1])
    await waitFor(() => expect(useDesignerStore.getState().schema.children).toHaveLength(0))

    act(() => useDesignerStore.getState().undo())
    expect(useDesignerStore.getState().schema.children).toHaveLength(1)
  })

  it('字段名与同级字段重复时，属性面板对两个字段都给出提示', () => {
    const { schema, first, second } = duplicateNameSchema()
    renderDesigner(schema)

    act(() => useDesignerStore.getState().select(first.id))
    expect(screen.getByText('字段名「dup」已被同级字段占用')).toBeTruthy()

    act(() => useDesignerStore.getState().select(second.id))
    expect(screen.getByText('字段名「dup」已被同级字段占用')).toBeTruthy()
  })

  it('字段名未填写时，属性面板提示不能为空', () => {
    renderDesigner({
      version: 1,
      form: { layout: 'vertical' },
      children: [{ id: 'no-name', type: 'input', label: '姓名', props: {} }],
    })

    act(() => useDesignerStore.getState().select('no-name'))
    expect(screen.getByText('字段名不能为空')).toBeTruthy()
  })

  it('字段名合法时保存正常触发', () => {
    const onSave = vi.fn()
    renderDesigner(schemaOf(['input']), onSave)

    clickSave()
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('存在重名字段时保存被拦截并提示', async () => {
    const onSave = vi.fn()
    renderDesigner(duplicateNameSchema().schema, onSave)

    clickSave()
    expect(onSave).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText(/字段名.*重复/)).toBeTruthy())
  })

  it('存在未填字段名时保存被拦截', () => {
    const onSave = vi.fn()
    renderDesigner({
      version: 1,
      form: { layout: 'vertical' },
      children: [{ id: 'no-name', type: 'input', label: '姓名', props: {} }],
    }, onSave)

    clickSave()
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('内置组件字段名校验', () => {
  it('全部内置组件的默认 schema 通过校验，不产生误报', () => {
    const children = getMenus().flatMap(g => g.list).map(d => d.defaultSchema())
    expect(children.length).toBeGreaterThan(30)
    expect(validateSchemaFieldNames({ version: 1, form: {}, children })).toEqual([])
  })
})
