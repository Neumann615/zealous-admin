// @vitest-environment jsdom
import type { FormSchema } from '../types/schema'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeFnSource } from '../events/fnSource'
import { FormRenderer } from './FormRenderer'
import '../registry/components'
import '../test/setupDom'

afterEach(cleanup)

function renderForm(schema: FormSchema) {
  return render(
    <App>
      <FormRenderer schema={schema} onSubmit={vi.fn()} showActions={false} />
    </App>,
  )
}

/** 开关（布尔）+ 文本：联动的典型组合 */
function toggleSchema(control?: FormSchema['children'][number]['control']): FormSchema {
  return {
    version: 2,
    form: { layout: 'vertical' },
    children: [
      { id: 'sw', type: 'switch', field: 'hasCompany', label: '有公司', props: {} },
      {
        id: 'company',
        type: 'input',
        field: 'company',
        label: '公司名',
        props: {},
        ...(control ? { control } : {}),
      },
    ],
  }
}

describe('联动 control 的渲染器行为', () => {
  it('hidden：条件命中时 Form.Item 隐藏（值仍在表单里）', async () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <App>
        <FormRenderer
          schema={toggleSchema([{ field: 'hasCompany', operator: 'eq', value: false, effects: ['hidden'] }])}
          onSubmit={onSubmit}
          showActions={false}
        />
      </App>,
    )

    // 初始 hasCompany 为 undefined → eq false 未命中，公司名可见
    expect(screen.getByText('公司名')).toBeTruthy()

    const input = container.querySelector('input#company') as HTMLInputElement
    fireEvent.change(input, { target: { value: '示例科技' } })
    // 打开开关 → true，仍未命中
    fireEvent.click(container.querySelector('button#hasCompany')!)
    await waitFor(() => expect(screen.getByText('公司名')).toBeTruthy())

    // 再关掉开关 → false，命中：字段隐藏
    fireEvent.click(container.querySelector('button#hasCompany')!)
    await waitFor(() => expect(container.querySelector('.ant-form-item-hidden')).not.toBeNull())

    // 隐藏不改变值：再打开开关恢复可见时，之前输入的值还在
    fireEvent.click(container.querySelector('button#hasCompany')!)
    await waitFor(() => expect(container.querySelector('.ant-form-item-hidden')).toBeNull())
    expect((container.querySelector('input#company') as HTMLInputElement).value).toBe('示例科技')
  })

  it('hidden：命中后隐藏，且值保留在表单里（不会被清空）', async () => {
    const onSubmit = vi.fn()
    const schema: FormSchema = {
      ...toggleSchema([{ field: 'hasCompany', operator: 'eq', value: true, effects: ['hidden'] }]),
      form: { layout: 'vertical', submitBtn: true },
    }
    const { container } = render(
      <App>
        <FormRenderer schema={schema} onSubmit={onSubmit} initialValues={{ hasCompany: true, company: '示例科技' }} />
      </App>,
    )

    const input = container.querySelector('input#company') as HTMLInputElement
    await waitFor(() => expect(input).toBeTruthy())
    // 初始值就命中规则（initialValues 在 antd 自己的 effect 里才进 store，挂载后要重算一次）
    await waitFor(() => {
      expect(container.querySelector('.ant-form-item-hidden')).not.toBeNull()
    })
    // 隐藏只影响呈现：input 与其值都还在
    expect((container.querySelector('input#company') as HTMLInputElement).value).toBe('示例科技')

    // 关掉开关后规则不再命中，字段恢复可见
    fireEvent.click(container.querySelector('button#hasCompany')!)
    await waitFor(() => expect(container.querySelector('.ant-form-item-hidden')).toBeNull())
  })

  it('required 与字段自身 formItem.required 取或：提交时拦住空值', async () => {
    const onSubmit = vi.fn()
    const schema: FormSchema = {
      version: 2,
      form: { layout: 'vertical' },
      children: [
        { id: 'sw', type: 'switch', field: 'needTax', label: '需要税号', props: {} },
        {
          id: 'tax',
          type: 'input',
          field: 'taxNo',
          label: '税号',
          props: {},
          control: [{ field: 'needTax', operator: 'eq', value: true, effects: ['required'] }],
        },
      ],
    }
    const { container } = render(
      <App>
        <FormRenderer schema={schema} onSubmit={onSubmit} />
      </App>,
    )

    fireEvent.click(container.querySelector('button#needTax')!)
    fireEvent.click(container.querySelector('button[type="submit"]')!)

    expect(await screen.findByText('税号不能为空')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('多条规则的效果取或（任一命中即生效）', async () => {
    const { container } = renderForm({
      version: 2,
      form: { layout: 'vertical' },
      children: [
        { id: 'a', type: 'input', field: 'a', label: '甲', props: {} },
        { id: 'b', type: 'input', field: 'b', label: '乙', props: {} },
        {
          id: 'target',
          type: 'input',
          field: 'target',
          label: '目标',
          props: {},
          control: [
            { field: 'a', operator: 'eq', value: 'x', effects: ['disabled'] },
            { field: 'b', operator: 'eq', value: 'y', effects: ['hidden'] },
          ],
        },
      ],
    })

    const target = () => container.querySelector('input#target') as HTMLInputElement
    expect(target().disabled).toBe(false)

    fireEvent.change(container.querySelector('input#a')!, { target: { value: 'x' } })
    await waitFor(() => expect(target().disabled).toBe(true))

    fireEvent.change(container.querySelector('input#b')!, { target: { value: 'y' } })
    await waitFor(() => expect(container.querySelector('.ant-form-item-hidden')).not.toBeNull())
  })

  it('子表单容器禁用后内部字段的 input 也 disabled', async () => {
    const { container } = renderForm({
      version: 2,
      form: { layout: 'vertical' },
      children: [
        { id: 'sw', type: 'switch', field: 'lock', label: '锁定', props: {} },
        {
          id: 'contact',
          type: 'subForm',
          field: 'contact',
          label: '联系人',
          props: {},
          control: [{ field: 'lock', operator: 'eq', value: true, effects: ['disabled'] }],
          children: [
            { id: 'name', type: 'input', field: 'name', label: '姓名', props: {} },
          ],
        },
      ],
    })

    const name = () => container.querySelector('input#contact_name') as HTMLInputElement
    await waitFor(() => expect(name()).toBeTruthy())
    expect(name().disabled).toBe(false)

    fireEvent.click(container.querySelector('button#lock')!)
    await waitFor(() => expect(name().disabled).toBe(true))

    // 关掉规则后恢复可编辑（只置真、不回退）
    fireEvent.click(container.querySelector('button#lock')!)
    await waitFor(() => expect(name().disabled).toBe(false))
  })

  it('表格子表单容器禁用后行内字段的 input 也 disabled', async () => {
    const { container } = renderForm({
      version: 2,
      form: { layout: 'vertical' },
      children: [
        { id: 'sw', type: 'switch', field: 'lock', label: '锁定', props: {} },
        {
          id: 'items',
          type: 'tableForm',
          field: 'items',
          label: '明细',
          props: {},
          control: [{ field: 'lock', operator: 'eq', value: true, effects: ['disabled'] }],
          children: [
            { id: 'title', type: 'input', field: 'title', label: '品名', props: {} },
          ],
        },
      ],
    })

    // 加一行
    const add = await screen.findByText('添加一行')
    fireEvent.click(add)
    const row = () => container.querySelector('input#items_0_title') as HTMLInputElement | null
    await waitFor(() => expect(row()).toBeTruthy())
    expect(row()!.disabled).toBe(false)

    fireEvent.click(container.querySelector('button#lock')!)
    await waitFor(() => expect(row()!.disabled).toBe(true))
  })

  it('钩子里 ctx.setValue 改的值立刻重算联动（不必等用户再输入）', async () => {
    const { container } = render(
      <App>
        <FormRenderer
          schema={{
            version: 2,
            form: { layout: 'vertical' },
            events: {
              onFormMounted: [{ fn: makeFnSource(['ctx'], 'ctx.setValue(\'hasCompany\', true)') }],
            },
            children: toggleSchema([
              { field: 'hasCompany', operator: 'eq', value: true, effects: ['hidden'] },
            ]).children,
          }}
          showActions={false}
          onSubmit={vi.fn()}
        />
      </App>,
    )

    // 没有任何用户输入：onFormMounted 写入的值必须已经把公司名隐藏掉
    await waitFor(() => expect(container.querySelector('.ant-form-item-hidden')).not.toBeNull())
    // 值确实写进了表单（开关呈选中态），隐藏只影响呈现
    expect(container.querySelector('button#hasCompany')!.getAttribute('aria-checked')).toBe('true')
  })

  it('钩子里 ctx.setValues 批量改值同样立刻重算（禁用生效）', async () => {
    const { container } = render(
      <App>
        <FormRenderer
          schema={{
            version: 2,
            form: { layout: 'vertical' },
            events: {
              onFormMounted: [{ fn: makeFnSource(['ctx'], 'ctx.setValues({ hasCompany: true })') }],
            },
            children: toggleSchema([
              { field: 'hasCompany', operator: 'eq', value: true, effects: ['disabled'] },
            ]).children,
          }}
          showActions={false}
          onSubmit={vi.fn()}
        />
      </App>,
    )

    await waitFor(() => {
      expect((container.querySelector('input#company') as HTMLInputElement).disabled).toBe(true)
    })
  })
})
