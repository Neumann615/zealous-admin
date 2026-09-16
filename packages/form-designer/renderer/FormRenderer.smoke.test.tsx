// @vitest-environment jsdom
import type { FormSchema } from '../types/schema'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getMenus } from '../registry/registry'
import { FormRenderer } from './FormRenderer'
import '../registry/components'
import '../test/setupDom'

const defs = getMenus().flatMap(g => g.list)

function pick(type: string) {
  const def = defs.find(d => d.type === type)
  if (!def)
    throw new Error(`组件未注册：${type}`)
  return def
}

function renderOne(schema: FormSchema) {
  const { container, unmount } = render(<FormRenderer schema={schema} showActions={false} />)
  expect(container.querySelector('.ant-form')).not.toBeNull()
  unmount()
}

describe('渲染器冒烟（FormRenderer）', () => {
  it('注册表已加载全部组件', () => {
    expect(defs.length).toBeGreaterThan(0)
  })

  it.each(defs.map(def => [def.type, def] as const))('%s 用 defaultSchema 渲染不抛错', (_type, def) => {
    renderOne({ version: 2, form: { layout: 'vertical' }, children: [def.defaultSchema()] })
  })

  it('容器嵌套（卡片 > 栅格 > 输入框）渲染不抛错', () => {
    const rowNode = pick('row').defaultSchema()
    rowNode.children![0].children = [pick('input').defaultSchema()]
    const cardNode = pick('card').defaultSchema()
    cardNode.children = [rowNode]
    renderOne({ version: 2, form: {}, children: [cardNode] })
  })

  it('未注册类型降级为警告占位而不崩溃', () => {
    renderOne({
      version: 2,
      form: {},
      children: [{ id: 'x1', type: 'not-registered', props: {} }],
    })
  })

  it('字段级 col 在运行态包一层 Col（辅助组件同样适用）', () => {
    const input = pick('input').defaultSchema()
    input.col = { span: 12, md: 8 }
    const divider = pick('divider').defaultSchema()
    divider.col = { span: 18 }

    const { container, unmount } = render(
      <FormRenderer
        showActions={false}
        schema={{ version: 2, form: {}, children: [input, divider] }}
      />,
    )
    // 断点类一并落到 Col 上
    const inputCol = container.querySelector('.ant-col-12.ant-col-md-8')
    expect(inputCol?.querySelector('.ant-form-item')).not.toBeNull()
    // 辅助组件（无 Form.Item）同样被 Col 包裹
    const dividerCol = container.querySelector('.ant-col-18')
    expect(dividerCol?.querySelector('.ant-divider')).not.toBeNull()
    unmount()
  })
})
