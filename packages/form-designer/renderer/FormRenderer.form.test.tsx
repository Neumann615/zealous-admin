// @vitest-environment jsdom
import type { FormInstance } from 'antd'
import type { FormSchema } from '../types/schema'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { Form } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMenus } from '../registry/registry'
import { FormRenderer } from './FormRenderer'
import '../registry/components'
import '../test/setupDom'

// vitest 未开启 globals，RTL 的自动 cleanup 不会注册，这里手动清理避免跨用例串台
afterEach(cleanup)

const defs = getMenus().flatMap(g => g.list)

function pick(type: string) {
  const def = defs.find(d => d.type === type)
  if (!def) {
    throw new Error(`组件未注册：${type}`)
  }
  return def
}

function schemaOf(): { schema: FormSchema, field: string } {
  const node = pick('input').defaultSchema()
  return {
    schema: { version: 2, form: { layout: 'vertical' }, children: [node] },
    field: node.field as string,
  }
}

function fill(container: HTMLElement, value: string) {
  const input = container.querySelector('input') as HTMLInputElement
  expect(input).not.toBeNull()
  fireEvent.change(input, { target: { value } })
}

function submit(container: HTMLElement) {
  fireEvent.click(container.querySelector('button[type="submit"]') as HTMLElement)
}

/** antd 会在两个中文字符之间插空格，比较文案时去掉空白 */
function hasResetButton(container: HTMLElement) {
  return Array.from(container.querySelectorAll('form button'))
    .some(b => (b.textContent ?? '').replace(/\s/g, '') === '重置')
}

describe('渲染器外部表单实例（FormRenderer）', () => {
  it('传入 form 时由外部实例接管取值，且提交后能被外部重置', async () => {
    const { schema, field } = schemaOf()
    const onSubmit = vi.fn()
    let external: FormInstance | undefined

    function Host() {
      const [form] = Form.useForm()
      external = form
      return <FormRenderer form={form} schema={schema} onSubmit={onSubmit} />
    }

    const { container } = render(<Host />)
    fill(container, '张三')

    // 外部实例确实连上了这份表单（未接管时取值恒为空）
    expect(external?.getFieldValue(field)).toBe('张三')

    submit(container)
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ [field]: '张三' }))

    act(() => external?.resetFields())
    expect(external?.getFieldValue(field)).toBeUndefined()
    // 重置后 antd 会替换受控 input 节点，这里重新查询再断言
    await waitFor(() => expect((container.querySelector('input') as HTMLInputElement).value).toBe(''))
  })

  it('未传 form 时内部自建实例仍可正常提交', async () => {
    const { schema, field } = schemaOf()
    const onSubmit = vi.fn()

    const { container } = render(<FormRenderer schema={schema} onSubmit={onSubmit} />)
    fill(container, '李四')
    submit(container)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ [field]: '李四' }))
  })
})

describe('渲染器全局配置（FormRenderer）', () => {
  it('全局配置里的非 antd 字段不会透传到 form 元素上', () => {
    const node = pick('input').defaultSchema()
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'vertical', labelWidth: 120, submitBtn: true, resetBtn: true, hideRequiredAsterisk: true },
      children: [node],
    }
    const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
    const form = container.querySelector('form')!
    // labelWidth 是数字，泄漏时会真的落到 form 的 DOM 属性上，这条是白名单生效的硬证据
    expect(form.hasAttribute('labelwidth')).toBe(false)
    // 布尔型自有键即使泄漏也会被 React 丢弃，所以整体断言「不出现任意自有配置键」
    const own = ['labelwidth', 'submitbtn', 'resetbtn', 'hiderequiredasterisk']
    expect([...form.attributes].every(a => !own.includes(a.name.toLowerCase()))).toBe(true)
  })

  it('labelWidth 转成标签列宽', () => {
    const node = pick('input').defaultSchema()
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'horizontal', labelWidth: 120 },
      children: [node],
    }
    const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
    const label = container.querySelector('.ant-form-item-label') as HTMLElement
    expect(label.getAttribute('style')).toContain('120px')
  })

  it('submitBtn 为 false 时不渲染提交按钮', () => {
    const node = pick('input').defaultSchema()
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'vertical', submitBtn: false },
      children: [node],
    }
    const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
    expect(container.querySelector('button[type="submit"]')).toBeNull()
  })

  it('未配置 resetBtn 时重置按钮照常渲染', () => {
    const node = pick('input').defaultSchema()
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'vertical' },
      children: [node],
    }
    const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
    expect(hasResetButton(container)).toBe(true)
  })

  it('resetBtn 为 false 时不渲染重置按钮', () => {
    const node = pick('input').defaultSchema()
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'vertical', resetBtn: false },
      children: [node],
    }
    const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
    expect(hasResetButton(container)).toBe(false)
  })

  it('垂直布局下 labelWidth 不生效', () => {
    const node = pick('input').defaultSchema()
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'vertical', labelWidth: 120 },
      children: [node],
    }
    const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
    const label = container.querySelector('.ant-form-item-label') as HTMLElement
    expect(label.getAttribute('style') ?? '').not.toContain('120px')
  })

  it('layout 未设值时按 horizontal 处理，labelWidth 生效', () => {
    const node = pick('input').defaultSchema()
    const schema: FormSchema = {
      version: 2,
      form: { labelWidth: 120 },
      children: [node],
    }
    const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
    const label = container.querySelector('.ant-form-item-label') as HTMLElement
    expect(label.getAttribute('style')).toContain('120px')
  })

  it('hideRequiredAsterisk 为 true 时必填星号被隐藏', () => {
    const node = pick('input').defaultSchema()
    node.formItem = { rules: [{ type: 'required', message: '必填' }] }
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'vertical', hideRequiredAsterisk: true },
      children: [node],
    }
    const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
    // 星号是 label 上的 ::before 伪元素，jsdom 不渲染伪元素；
    // 可靠的 DOM 证据是 antd 为「隐藏态」加的类（对照见下）
    expect(container.querySelector('.ant-form-item-required-mark-hidden')).not.toBeNull()
    // 对照：未开启配置时同一个必填项只有 ant-form-item-required，没有 mark-hidden
    const control = render(
      <FormRenderer
        schema={{ ...schema, form: { layout: 'vertical' } }}
        onSubmit={vi.fn()}
      />,
    )
    expect(control.container.querySelector('.ant-form-item-required')).not.toBeNull()
    expect(control.container.querySelector('.ant-form-item-required-mark-hidden')).toBeNull()
  })
})
