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
  })

  it('全局配置里的 antd 透传键仍能到达 Form', () => {
    const node = pick('input').defaultSchema()
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'vertical', size: 'small', labelAlign: 'left', colon: false, disabled: true },
      children: [node],
    }
    const { container } = render(<FormRenderer schema={schema} onSubmit={vi.fn()} />)
    const form = container.querySelector('form')!
    expect(form.classList.contains('ant-form-vertical')).toBe(true)
    expect(form.classList.contains('ant-form-small')).toBe(true)
    expect(container.querySelector('.ant-form-item-label-left')).not.toBeNull()
    expect(container.querySelector('.ant-form-item-no-colon')).not.toBeNull()
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true)
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

describe('渲染器校验规则触发时机（FormRenderer）', () => {
  function schemaWithRules(rules: any[]): FormSchema {
    const node = pick('input').defaultSchema()
    node.label = '昵称'
    node.formItem = { rules }
    return { version: 2, form: { layout: 'vertical' }, children: [node] }
  }

  const errorText = (container: HTMLElement) =>
    container.querySelector('.ant-form-item-explain-error')?.textContent

  it('未配 trigger 的规则在值变化时即校验（antd 默认时机不变）', async () => {
    const schema = schemaWithRules([{ type: 'minLen', value: 3 }])
    const { container } = render(<FormRenderer showActions={false} schema={schema} />)
    fill(container, 'ab')
    await waitFor(() => expect(errorText(container)).toContain('昵称长度不能少于 3'))
  })

  it('trigger: blur 的规则值变化时不校验，失焦时才校验', async () => {
    const schema = schemaWithRules([{ type: 'minLen', value: 3, trigger: 'blur' }])
    const { container } = render(<FormRenderer showActions={false} schema={schema} />)
    const input = container.querySelector('input') as HTMLInputElement

    fill(container, 'ab')
    // onChange 被规则级 validateTrigger 过滤：值变化后不应出现错误提示
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })
    expect(errorText(container)).toBeUndefined()

    // 规则声明了 blur，字段级时机被并入 onBlur，失焦时才真正校验
    fireEvent.blur(input)
    await waitFor(() => expect(errorText(container)).toContain('昵称长度不能少于 3'))
  })
})

describe('渲染器自定义校验（FormRenderer）', () => {
  const errorText = (container: HTMLElement) =>
    container.querySelector('.ant-form-item-explain-error')?.textContent

  it('公共事件能读到 ctx.payload（value + 表单快照），失败文案来自钩子返回值', async () => {
    ;(globalThis as any).__payload = undefined
    const node = pick('input').defaultSchema()
    node.label = '昵称'
    const name = node.field as string
    node.formItem = { rules: [{ type: 'validator', hook: 'checkNick' }] }
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'vertical' },
      events: {
        custom: {
          checkNick: {
            label: '昵称校验',
            fn: {
              $type: 'fn',
              args: ['ctx'],
              body: 'globalThis.__payload = ctx.payload; return ctx.payload.value === "ok" ? true : "昵称必须是 ok"',
            },
          },
        },
      },
      children: [node],
    }

    const { container } = render(<FormRenderer showActions={false} schema={schema} />)
    fill(container, 'bad')
    await waitFor(() => expect(errorText(container)).toContain('昵称必须是 ok'))

    const payload = (globalThis as any).__payload
    expect(payload.value).toBe('bad')
    // formValue 是表单当前值快照（名路径 → 值），不是 antd 传进来的单字段快照
    expect(payload.formValue).toEqual(expect.objectContaining({ [name]: 'bad' }))
  })

  it('钩子抛错时按「校验未通过」处理，不白屏', async () => {
    const node = pick('input').defaultSchema()
    node.label = '昵称'
    node.formItem = { rules: [{ type: 'validator', fn: { $type: 'fn', args: ['ctx'], body: 'throw new Error("炸了")' } }] }
    const schema: FormSchema = { version: 2, form: { layout: 'vertical' }, children: [node] }

    const { container } = render(<FormRenderer showActions={false} schema={schema} />)
    fill(container, 'x')
    await waitFor(() => expect(errorText(container)).toContain('昵称校验未通过'))
  })
})
