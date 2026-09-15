// @vitest-environment jsdom
import type { FormSchema } from '../types/schema'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FormRenderer } from './FormRenderer'
import '../registry/components'
import '../test/setupDom'

// vitest 未开启 globals，RTL 的自动 cleanup 不会注册，这里手动清理避免跨用例串台
afterEach(cleanup)

function buildSchema(): FormSchema {
  return {
    version: 2,
    form: { layout: 'vertical' },
    children: [
      {
        id: 'sub',
        type: 'subForm',
        field: 'contact',
        label: '联系人',
        props: {},
        children: [
          { id: 'sub-name', type: 'input', field: 'name', label: '姓名', props: {} },
          { id: 'sub-age', type: 'number', field: 'age', label: '年龄', props: {} },
        ],
      },
      {
        id: 'list',
        type: 'tableForm',
        field: 'items',
        label: '明细',
        props: {},
        children: [
          { id: 'list-title', type: 'input', field: 'title', label: '名称', props: {} },
        ],
      },
    ],
  }
}

describe('嵌套容器的提交结构', () => {
  it('子表单收进对象、表格子表单收成数组', async () => {
    const onSubmit = vi.fn()
    render(
      <FormRenderer
        schema={buildSchema()}
        initialValues={{ contact: { name: '张三', age: 20 }, items: [{ title: 'A' }, { title: 'B' }] }}
        onSubmit={onSubmit}
      />,
    )

    // antd Button 会在两个汉字间自动插空格（提交 → 提 交），故用正则匹配可访问名
    fireEvent.click(screen.getByRole('button', { name: /提\s*交/ }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      contact: { name: '张三', age: 20 },
      items: [{ title: 'A' }, { title: 'B' }],
    })
  })

  it('表格子表单可增删行', async () => {
    const { container } = render(
      <FormRenderer schema={buildSchema()} initialValues={{ items: [{ title: 'A' }] }} showActions={false} />,
    )
    const cellInputs = () => container.querySelectorAll('.ant-table-tbody input').length
    expect(cellInputs()).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: /添加一行/ }))
    await waitFor(() => expect(cellInputs()).toBe(2))

    fireEvent.click(screen.getAllByRole('button', { name: /删\s*除/ })[0])
    await waitFor(() => expect(cellInputs()).toBe(1))
  })
})
