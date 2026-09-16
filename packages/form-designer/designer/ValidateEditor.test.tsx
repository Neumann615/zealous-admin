// @vitest-environment jsdom
import type { ValidateRule } from '../types/schema'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeFnSource } from '../events/fnSource'
import { withRuleType } from './ruleType'
import { ValidateEditor } from './ValidateEditor'
import '../test/setupDom'

// vitest 未开启 globals，RTL 的自动 cleanup 不会注册，这里手动清理避免跨用例串台
afterEach(cleanup)

const CUSTOM = { checkNick: { label: '昵称校验', fn: makeFnSource(['ctx'], '') } }

/** 展开第 index 个下拉并点选文案命中的选项（antd Select 的交互方式） */
async function pickOption(index: number, label: string) {
  fireEvent.mouseDown(screen.getAllByRole('combobox')[index])
  const option = await waitFor(() => {
    // 下拉是虚拟列表：只渲染可见窗口内的选项，先滚到底再找
    const holder = document.querySelector('.rc-virtual-list-holder') as HTMLElement | null
    if (holder) {
      holder.scrollTop = 10000
      fireEvent.scroll(holder)
    }
    const el = [...document.querySelectorAll('.ant-select-item-option')].find(o => o.textContent?.includes(label))
    if (!el)
      throw new Error(`下拉里没有「${label}」`)
    return el as HTMLElement
  })
  fireEvent.click(option)
}

describe('校验规则编辑器（ValidateEditor）', () => {
  it('阈值类型显示阈值输入，输入后写回 value', () => {
    const onChange = vi.fn()
    render(<ValidateEditor value={[{ type: 'len' }]} onChange={onChange} />)

    fireEvent.change(screen.getByPlaceholderText('阈值（长度 / 数值）'), { target: { value: '6' } })
    expect(onChange).toHaveBeenCalledWith([{ type: 'len', value: 6 }])
  })

  it('非阈值类型不显示阈值输入', () => {
    render(<ValidateEditor value={[{ type: 'required' }]} onChange={vi.fn()} />)
    expect(screen.queryByPlaceholderText('阈值（长度 / 数值）')).toBeNull()
  })

  it('触发时机下拉写回 trigger（默认项为不写该字段）', async () => {
    const onChange = vi.fn()
    render(<ValidateEditor value={[{ type: 'required' }]} onChange={onChange} />)

    await pickOption(1, '失焦时')
    expect(onChange).toHaveBeenCalledWith([{ type: 'required', trigger: 'blur' }])
  })

  it('validator 规则显示引用下拉（带公共事件名）与正文编辑器', () => {
    render(<ValidateEditor value={[{ type: 'validator', hook: 'checkNick' }]} custom={CUSTOM} onChange={vi.fn()} />)

    expect(screen.getByText('昵称校验')).toBeTruthy()
    expect(document.querySelector('textarea')).not.toBeNull()
  })

  it('编辑正文写回 fn 并清掉 hook（fn 优先，否则公共事件永远不执行）', () => {
    const onChange = vi.fn()
    render(<ValidateEditor value={[{ type: 'validator', hook: 'checkNick' }]} custom={CUSTOM} onChange={onChange} />)

    fireEvent.change(document.querySelector('textarea') as HTMLTextAreaElement, { target: { value: 'return true' } })
    expect(onChange).toHaveBeenCalledWith([
      { type: 'validator', hook: undefined, fn: makeFnSource(['ctx'], 'return true') },
    ])
  })

  it('清空引用后回落成空正文（规则仍是可执行来源）', async () => {
    const onChange = vi.fn()
    const { container } = render(
      <ValidateEditor value={[{ type: 'validator', hook: 'checkNick' } as ValidateRule]} custom={CUSTOM} onChange={onChange} />,
    )

    const clear = await waitFor(() => {
      const el = container.querySelector('.ant-select-clear') as HTMLElement | null
      if (!el)
        throw new Error('清除按钮未出现')
      return el
    })
    fireEvent.mouseDown(clear)
    fireEvent.click(clear)

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([
      { type: 'validator', hook: undefined, fn: makeFnSource(['ctx'], '') },
    ]))
  })
})

describe('切换规则类型时的字段归一化', () => {
  it('切到「自定义校验」时补一份空正文（不留无来源的空壳规则）', () => {
    expect(withRuleType({ type: 'required' }, 'validator')).toEqual({
      type: 'validator',
      fn: makeFnSource(['ctx'], ''),
    })
  })

  it('离开自定义校验时清掉 hook / fn', () => {
    expect(withRuleType({ type: 'validator', hook: 'checkNick' }, 'email')).toEqual({ type: 'email' })
    expect(withRuleType({ type: 'validator', fn: makeFnSource(['ctx'], 'return true') }, 'email')).toEqual({ type: 'email' })
  })

  it('切到正则时保留 pattern，切走时清掉；阈值在阈值类型之间保留', () => {
    expect(withRuleType({ type: 'email', pattern: '^a$' }, 'regexp')).toEqual({ type: 'regexp', pattern: '^a$' })
    expect(withRuleType({ type: 'regexp', pattern: '^a$' }, 'email')).toEqual({ type: 'email' })
    expect(withRuleType({ type: 'len', value: 6 }, 'maxLen')).toEqual({ type: 'maxLen', value: 6 })
    expect(withRuleType({ type: 'len', value: 6 }, 'email')).toEqual({ type: 'email' })
  })

  it('message 与 trigger 在所有类型间保留', () => {
    expect(withRuleType({ type: 'email', message: '格式不对', trigger: 'blur' }, 'phone')).toEqual({
      type: 'phone',
      message: '格式不对',
      trigger: 'blur',
    })
  })
})
