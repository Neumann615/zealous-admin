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
