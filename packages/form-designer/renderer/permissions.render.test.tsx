// @vitest-environment jsdom
import type { FormSchema } from '../types/schema'
import { cleanup, render, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FormRenderer } from './FormRenderer'
import '../registry/components'
import '../test/setupDom'

afterEach(cleanup)

function renderForm(schema: FormSchema, initialValues?: Record<string, any>) {
  return render(
    <App>
      <FormRenderer
        schema={schema}
        initialValues={initialValues}
        onSubmit={vi.fn()}
        showActions={false}
      />
    </App>,
  )
}

describe('渲染器字段权限', () => {
  it('嵌套字段按完整路径叠加隐藏、禁用和必填', () => {
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'vertical' },
      permissions: {
        'contact.name': { visible: false, editable: false, required: true },
      },
      children: [{
        id: 'contact',
        type: 'subForm',
        field: 'contact',
        label: '联系人',
        props: {},
        children: [{ id: 'name', type: 'input', field: 'name', label: '姓名', props: {} }],
      }],
    }

    const { container } = renderForm(schema, { contact: { name: '张三' } })
    const input = container.querySelector('input') as HTMLInputElement
    expect(input).toBeTruthy()
    expect({
      disabled: input.disabled,
      hidden: !!container.querySelector('.ant-form-item-hidden'),
      required: !!container.querySelector('.ant-form-item-required'),
    }).toEqual({ disabled: true, hidden: true, required: true })
    expect(input.value).toBe('张三')
    expect(container.querySelector('.ant-form-item-hidden')).toBeTruthy()
    expect(container.querySelector('.ant-form-item-required')).toBeTruthy()
  })

  it('表格子表单行内字段支持通配路径禁用', async () => {
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'vertical' },
      permissions: {
        'items.*.title': { editable: false },
      },
      children: [{
        id: 'items',
        type: 'tableForm',
        field: 'items',
        label: '明细',
        props: {},
        children: [{ id: 'title', type: 'input', field: 'title', label: '品名', props: {} }],
      }],
    }

    const { container } = renderForm(schema, { items: [{ title: '苹果' }] })
    const input = container.querySelector('.ant-table-tbody input') as HTMLInputElement
    await waitFor(() => expect(input.value).toBe('苹果'))
    expect(input.disabled).toBe(true)
  })
})
