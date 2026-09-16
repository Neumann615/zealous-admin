// @vitest-environment jsdom
/* eslint-disable perfectionist/sort-imports -- @dnd-kit/dom 在模块加载期就读取 ResizeObserver，兜底必须早于 FormDesigner 的 import */
import '../test/setupDom'
import type { FieldSchema, FormSchema } from '../types/schema'
import type { FormHookContext } from '../events/types'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runHooks } from '../events/runHooks'
import { getComponent, getMenus } from '../registry/registry'
import { createEmptySchema } from '../types/schema'
import { validateSchemaFieldNames } from '../utils/fieldName'
import { parseSchema } from '../utils/parseSchema'
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
    version: 2,
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
    schema: { version: 2, form: { layout: 'vertical' }, children: [first, second] },
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

    renderDesigner({ version: 2, form: { layout: 'vertical' }, children: [subForm, tableForm] })
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
      version: 2,
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
      version: 2,
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
    expect(validateSchemaFieldNames({ version: 2, form: {}, children })).toEqual([])
  })
})

/** 画布外壳：字段级栅格落在 CanvasItem 外壳上（.ant-form-item 的直接父节点） */
function shellOf(container: HTMLElement): HTMLElement {
  const item = container.querySelector('.ant-form-item')
  expect(item, '画布中应有 Form.Item').toBeTruthy()
  return item!.parentElement as HTMLElement
}

describe('字段级栅格（col）', () => {
  it('选中字段后可用 span 预设设置栅格，画布外壳同步 flex 尺寸', () => {
    const { container } = renderDesigner(schemaOf(['input']))
    selectFirst('input')

    fireEvent.click(screen.getByRole('button', { name: '1/2' }))
    expect(useDesignerStore.getState().schema.children[0].col).toEqual({ span: 12 })
    expect(shellOf(container).style.flex).toBe('0 0 50%')
    expect(shellOf(container).style.maxWidth).toBe('50%')
  })

  it('再次点击同一预设置空 col，导出不含空 col 键', () => {
    const { container } = renderDesigner(schemaOf(['input']))
    selectFirst('input')

    const preset = screen.getByRole('button', { name: '1/2' })
    fireEvent.click(preset)
    expect(useDesignerStore.getState().schema.children[0].col).toEqual({ span: 12 })

    fireEvent.click(preset)
    expect(useDesignerStore.getState().schema.children[0].col).toBeUndefined()
    expect(useDesignerStore.getState().exportSchema()).not.toContain('"col"')
    // 未配置时外壳不再写 flex 尺寸，回到默认的整行流
    expect(shellOf(container).style.flex).toBe('')
  })

  it('响应式断点写入 col', () => {
    renderDesigner(schemaOf(['input']))
    selectFirst('input')

    fireEvent.change(screen.getByPlaceholderText('md'), { target: { value: '8' } })
    expect(useDesignerStore.getState().schema.children[0].col).toEqual({ md: 8 })
  })

  it('辅助组件（无 Form.Item）不提供布局分组', () => {
    renderDesigner(schemaOf(['divider']))
    selectFirst('divider')

    expect(screen.queryByText('响应式断点（1-24，留空表示不设）')).toBeNull()
  })
})

describe('校验规则形状与保存拦截', () => {
  it('阈值规则未填数值（面板中间态）时保存被拦截', async () => {
    const onSave = vi.fn()
    renderDesigner(schemaOf(['input']), onSave)
    const node = selectFirst('input')
    act(() => {
      useDesignerStore.getState().updateField(node.id, 'formItem.rules', [{ type: 'len' }], true)
    })

    clickSave()
    expect(onSave).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText(/校验规则格式不正确/)).toBeTruthy())
    // 与解析侧同一口径：同一份 schema 回读也被拒
    expect(() => parseSchema(useDesignerStore.getState().exportSchema())).toThrow('校验规则格式不正确')
  })

  it('填好阈值的规则不拦截保存', () => {
    const onSave = vi.fn()
    renderDesigner(schemaOf(['input']), onSave)
    const node = selectFirst('input')
    act(() => {
      useDesignerStore.getState().updateField(
        node.id,
        'formItem.rules',
        [{ type: 'minLen', value: 2, trigger: 'blur' }],
        true,
      )
    })

    clickSave()
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('没有可执行来源的自定义校验规则被保存拦截', async () => {
    const onSave = vi.fn()
    renderDesigner(schemaOf(['input']), onSave)
    const node = selectFirst('input')
    act(() => {
      useDesignerStore.getState().updateField(node.id, 'formItem.rules', [{ type: 'validator' }], true)
    })

    clickSave()
    expect(onSave).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText(/校验规则格式不正确/)).toBeTruthy())
  })

  it('引用不存在的公共事件仍可保存（运行时按「不校验」处理并提示一次）', () => {
    const onSave = vi.fn()
    renderDesigner(schemaOf(['input']), onSave)
    const node = selectFirst('input')
    act(() => {
      useDesignerStore.getState().updateField(node.id, 'formItem.rules', [{ type: 'validator', hook: 'ghost' }], true)
    })

    clickSave()
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})

describe('自定义校验面板（复用公共事件表）', () => {
  it('引用下拉列出公共事件名，编辑正文写回 fn 并清掉 hook', () => {
    renderDesigner(schemaOf(['input']))
    const node = selectFirst('input')
    act(() => {
      useDesignerStore.getState().updateCustomHooks({
        checkNick: { label: '昵称校验', fn: { $type: 'fn', args: ['ctx'], body: '' } },
      })
    })
    act(() => {
      useDesignerStore.getState().updateField(node.id, 'formItem.rules', [{ type: 'validator', hook: 'checkNick' }], true)
    })

    // 下拉的既有值以公共事件的 label 展示，说明面板拿到了 events.custom
    expect(screen.getByText('昵称校验')).toBeTruthy()

    const body = document.querySelector('textarea') as HTMLTextAreaElement
    expect(body, '内联正文编辑器应复用 HookEditor').toBeTruthy()
    fireEvent.change(body, { target: { value: 'return ctx.payload.value === "ok"' } })

    expect(useDesignerStore.getState().schema.children[0].formItem?.rules?.[0]).toEqual({
      type: 'validator',
      hook: undefined,
      fn: { $type: 'fn', args: ['ctx'], body: 'return ctx.payload.value === "ok"' },
    })
  })
})

describe('设计器全局事件与公共事件', () => {
  it('全局事件里写入语法错误的钩子时保存被拦截', async () => {
    const onSave = vi.fn()
    renderDesigner(schemaOf(['input']), onSave)
    act(() => {
      useDesignerStore.getState().updateEvents({
        onFormCreated: [{ fn: { $type: 'fn', args: ['ctx'], body: 'ctx.' } }],
      })
    })

    clickSave()
    expect(onSave).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText(/语法错误/)).toBeTruthy())
  })

  it('同时带坏 fn 与 hook 的引用同样被拦截（fn 优先）', async () => {
    const onSave = vi.fn()
    renderDesigner(schemaOf(['input']), onSave)
    act(() => {
      useDesignerStore.getState().updateEvents({
        beforeSubmit: [{ hook: 'ping', fn: { $type: 'fn', args: ['ctx'], body: 'return (' } }],
      })
    })

    clickSave()
    expect(onSave).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText(/语法错误/)).toBeTruthy())
  })

  it('语法合法的钩子不拦截保存', () => {
    const onSave = vi.fn()
    renderDesigner(schemaOf(['input']), onSave)
    act(() => {
      useDesignerStore.getState().updateEvents({
        onFormMounted: [{ fn: { $type: 'fn', args: ['ctx'], body: 'ctx.setValue("a", 1)' } }],
      })
    })

    clickSave()
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('表单页签可新增命名公共事件', () => {
    renderDesigner(createEmptySchema())
    fireEvent.click(screen.getByRole('tab', { name: /表\s*单/ }))
    fireEvent.click(screen.getByRole('button', { name: /新增公共事件/ }))

    const custom = useDesignerStore.getState().schema.events?.custom
    expect(custom).toBeTruthy()
    expect(Object.keys(custom!)).toHaveLength(1)
  })

  it('全局事件里新增钩子后，编辑函数体写回 store，删除后清空', () => {
    renderDesigner(createEmptySchema())
    fireEvent.click(screen.getByRole('tab', { name: /表\s*单/ }))

    // 场景按固定顺序渲染，第一个「添加钩子」对应 onFormCreated
    fireEvent.click(screen.getAllByRole('button', { name: /添加钩子/ })[0])
    expect(useDesignerStore.getState().schema.events?.onFormCreated).toHaveLength(1)

    // 此时面板里只有这一个钩子编辑器
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'return 1' } })
    const ref = useDesignerStore.getState().schema.events?.onFormCreated?.[0]
    expect(ref?.fn).toEqual({ $type: 'fn', args: ['ctx'], body: 'return 1' })

    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }))
    expect(useDesignerStore.getState().schema.events?.onFormCreated).toHaveLength(0)
  })

  it('清空钩子正文后仍是合法 schema（存得进、读得回）', () => {
    const onSave = vi.fn()
    renderDesigner(createEmptySchema(), onSave)
    fireEvent.click(screen.getByRole('tab', { name: /表\s*单/ }))
    fireEvent.click(screen.getAllByRole('button', { name: /添加钩子/ })[0])

    // 正文存原文、不 trim：纯空白也要留下来（否则从空正文起手打不进前导空格）
    const area = screen.getByRole('textbox')
    fireEvent.change(area, { target: { value: '  ' } })
    expect(useDesignerStore.getState().schema.events?.onFormCreated?.[0].fn)
      .toEqual({ $type: 'fn', args: ['ctx'], body: '  ' })

    // 清空正文：空正文 = 合法的「什么都不做」，不能退化成 undefined / {}
    fireEvent.change(area, { target: { value: '' } })
    expect(useDesignerStore.getState().schema.events?.onFormCreated?.[0].fn)
      .toEqual({ $type: 'fn', args: ['ctx'], body: '' })

    clickSave()
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(() => parseSchema(useDesignerStore.getState().exportSchema())).not.toThrow()
  })

  it('切换为「引用公共事件」后，钩子真的执行公共事件', async () => {
    renderDesigner(createEmptySchema())
    fireEvent.click(screen.getByRole('tab', { name: /表\s*单/ }))
    fireEvent.click(screen.getAllByRole('button', { name: /添加钩子/ })[0])
    fireEvent.click(screen.getByRole('button', { name: /新增公共事件/ }))
    act(() => {
      useDesignerStore.getState().updateCustomHooks({
        event_1: { label: '探针', fn: { $type: 'fn', args: ['ctx'], body: 'globalThis.__trace("hit")' } },
      })
    })

    // 引用下拉在全局事件段内（表单配置段还有两个 Select，取最后一个 combobox）
    const combos = screen.getAllByRole('combobox')
    fireEvent.mouseDown(combos[combos.length - 1])
    const option = await waitFor(() => {
      const el = document.querySelector('.ant-select-item-option') as HTMLElement | null
      if (!el)
        throw new Error('引用公共事件下拉未展开')
      return el
    })
    fireEvent.click(option)

    // 互斥：引用生效时内联 fn 必须被清掉，否则 fn 优先会执行空正文
    expect(useDesignerStore.getState().schema.events?.onFormCreated?.[0]).toEqual({ hook: 'event_1' })

    const calls: any[] = []
    ;(globalThis as any).__trace = (v: any) => calls.push(v)
    const events = useDesignerStore.getState().schema.events!
    const ctx: FormHookContext = {
      form: {} as any,
      values: {},
      getValues: () => ({}),
      setValue: vi.fn(),
      setValues: vi.fn(),
      getField: () => undefined,
      emit: vi.fn(),
      reload: async () => {},
      message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
    }
    await act(async () => {
      await runHooks('onFormCreated', events.onFormCreated, ctx, events.custom)
    })
    expect(calls).toEqual(['hit'])
  })

  it('清空「引用公共事件」下拉后仍是合法 schema（存得进、读得回）', async () => {
    const onSave = vi.fn()
    renderDesigner(createEmptySchema(), onSave)
    fireEvent.click(screen.getByRole('tab', { name: /表\s*单/ }))
    fireEvent.click(screen.getAllByRole('button', { name: /添加钩子/ })[0])
    fireEvent.click(screen.getByRole('button', { name: /新增公共事件/ }))

    const combos = screen.getAllByRole('combobox')
    fireEvent.mouseDown(combos[combos.length - 1])
    const option = await waitFor(() => {
      const el = document.querySelector('.ant-select-item-option') as HTMLElement | null
      if (!el)
        throw new Error('引用公共事件下拉未展开')
      return el
    })
    fireEvent.click(option)
    expect(useDesignerStore.getState().schema.events?.onFormCreated?.[0]).toEqual({ hook: 'event_1' })

    // allowClear 的 × 回传 undefined：归一化后应回落成空正文，而不是被序列化成 {}
    const clear = await waitFor(() => {
      const el = document.querySelector('.ant-select-clear') as HTMLElement | null
      if (!el)
        throw new Error('清除按钮未出现')
      return el
    })
    fireEvent.mouseDown(clear)
    fireEvent.click(clear)
    await waitFor(() => {
      expect(useDesignerStore.getState().schema.events?.onFormCreated?.[0])
        .toEqual({ fn: { $type: 'fn', args: ['ctx'], body: '' } })
    })

    clickSave()
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(() => parseSchema(useDesignerStore.getState().exportSchema())).not.toThrow()
  })

  it('切换 / 清空引用后保留 watch 与 order（只能来自导入 JSON 的附加字段）', async () => {
    renderDesigner(createEmptySchema())
    fireEvent.click(screen.getByRole('tab', { name: /表\s*单/ }))
    fireEvent.click(screen.getByRole('button', { name: /新增公共事件/ }))
    act(() => {
      useDesignerStore.getState().updateEvents({
        onFieldChange: [{ fn: { $type: 'fn', args: ['ctx'], body: '' }, watch: ['name'], order: 3 }],
      })
    })

    // 引用下拉在全局事件段内（表单配置段还有两个 Select，取最后一个 combobox）
    const combos = screen.getAllByRole('combobox')
    fireEvent.mouseDown(combos[combos.length - 1])
    const option = await waitFor(() => {
      const el = document.querySelector('.ant-select-item-option') as HTMLElement | null
      if (!el)
        throw new Error('引用公共事件下拉未展开')
      return el
    })
    fireEvent.click(option)
    expect(useDesignerStore.getState().schema.events?.onFieldChange?.[0])
      .toEqual({ hook: 'event_1', watch: ['name'], order: 3 })

    // allowClear 的 × 回传 undefined：回落成空正文，但 watch / order 不能被顺手抹掉
    const clear = await waitFor(() => {
      const el = document.querySelector('.ant-select-clear') as HTMLElement | null
      if (!el)
        throw new Error('清除按钮未出现')
      return el
    })
    fireEvent.mouseDown(clear)
    fireEvent.click(clear)
    await waitFor(() => {
      expect(useDesignerStore.getState().schema.events?.onFieldChange?.[0])
        .toEqual({ fn: { $type: 'fn', args: ['ctx'], body: '' }, watch: ['name'], order: 3 })
    })
  })

  it('正文超长的钩子在保存侧也被拦截（与 parseSchema 同一口径）', async () => {
    const onSave = vi.fn()
    renderDesigner(schemaOf(['input']), onSave)
    act(() => {
      useDesignerStore.getState().updateEvents({
        onFormCreated: [{ fn: { $type: 'fn', args: ['ctx'], body: 'x'.repeat(20001) } }],
      })
    })

    clickSave()
    expect(onSave).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText(/钩子正文过长/)).toBeTruthy())
    // 同一份 schema 在解析侧也被拒（此前是「保存放行、回读拒绝」）
    expect(() => parseSchema(useDesignerStore.getState().exportSchema())).toThrow('钩子正文过长')
  })

  it('导入 schema 不丢事件与数据源（导出 → 清空 → 导入）', () => {
    const source: FormSchema = {
      version: 2,
      form: { layout: 'vertical' },
      children: [{ id: 'a', type: 'input', field: 'name', label: '姓名', props: {} }],
      events: {
        custom: { event_1: { label: '探针', fn: { $type: 'fn', args: ['ctx'], body: 'return 1' } } },
        onFormCreated: [{ hook: 'event_1' }],
      },
      dataSources: { orgTree: { type: 'static' } },
    }
    const dumped = JSON.stringify(source)

    renderDesigner(createEmptySchema())
    expect(useDesignerStore.getState().schema.events).toBeUndefined()

    let result: { ok: boolean } = { ok: false }
    act(() => {
      result = useDesignerStore.getState().importSchema(dumped)
    })
    expect(result.ok).toBe(true)

    const after = useDesignerStore.getState().schema
    expect(after.events?.custom?.event_1?.label).toBe('探针')
    expect(after.events?.onFormCreated).toEqual([{ hook: 'event_1' }])
    expect(after.dataSources).toEqual({ orgTree: { type: 'static' } })
    expect(after.children).toHaveLength(1)
  })
})
