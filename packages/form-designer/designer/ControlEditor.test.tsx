// @vitest-environment jsdom
import type { ControlRule } from '../types/schema'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControlEditor } from './ControlEditor'
import { formatControlValue, parseControlValue, withControlOperator } from './controlRule'
import '../test/setupDom'

afterEach(cleanup)

/** 展开第 index 个下拉并点选文案命中的选项（antd Select 的交互方式） */
async function pickOption(index: number, label: string) {
  fireEvent.mouseDown(screen.getAllByRole('combobox')[index])
  const option = await waitFor(() => {
    const el = [...document.querySelectorAll('.ant-select-item-option')].find(o => o.textContent?.includes(label))
    if (!el)
      throw new Error(`下拉里没有「${label}」`)
    return el as HTMLElement
  })
  fireEvent.click(option)
}

describe('联动规则归一化', () => {
  const rule: ControlRule = { field: 'kind', operator: 'eq', value: 'a', effects: ['hidden'] }

  it('切到 in 时值必须是数组（单值转成空数组）', () => {
    expect(withControlOperator(rule, 'in')).toEqual({ field: 'kind', operator: 'in', effects: ['hidden'], value: [] })
    expect(withControlOperator({ ...rule, value: ['a', 'b'] }, 'in'))
      .toEqual({ field: 'kind', operator: 'in', effects: ['hidden'], value: ['a', 'b'] })
  })

  it('切到 empty / notEmpty 时删掉 value（留着也是永不生效的残值）', () => {
    expect(withControlOperator(rule, 'empty')).toEqual({ field: 'kind', operator: 'empty', effects: ['hidden'] })
    expect(withControlOperator(rule, 'notEmpty')).toEqual({ field: 'kind', operator: 'notEmpty', effects: ['hidden'] })
  })

  it('从 empty 切回 eq 时回落空串，数组值回落单值', () => {
    expect(withControlOperator({ field: 'kind', operator: 'empty', effects: [] }, 'eq'))
      .toEqual({ field: 'kind', operator: 'eq', effects: [], value: '' })
    expect(withControlOperator({ field: 'kind', operator: 'in', value: ['a'], effects: [] }, 'neq'))
      .toEqual({ field: 'kind', operator: 'neq', effects: [], value: '' })
  })
})

describe('比较值的解析与展示', () => {
  it('数字 / 布尔 / 数组按 JSON 解析，普通文本按字符串', () => {
    expect(parseControlValue('1')).toBe(1)
    expect(parseControlValue('true')).toBe(true)
    expect(parseControlValue('["a","b"]')).toEqual(['a', 'b'])
    expect(parseControlValue('研发部')).toBe('研发部')
    expect(parseControlValue('  ')).toBe('')
  })

  it('展示时对象 / 数组用 JSON，空值给空串', () => {
    expect(formatControlValue(['a'])).toBe('["a"]')
    expect(formatControlValue(1)).toBe('1')
    expect(formatControlValue(undefined)).toBe('')
  })
})

describe('联动规则编辑器（ControlEditor）', () => {
  it('依赖字段下拉列出 schema 字段名并写回', async () => {
    const onChange = vi.fn()
    render(<ControlEditor value={[{ field: '', effects: ['hidden'] }]} fieldNames={['city', 'contact.name']} onChange={onChange} />)

    await pickOption(0, 'contact.name')
    expect(onChange).toHaveBeenCalledWith([{ field: 'contact.name', effects: ['hidden'] }])
  })

  it('切换比较方式时清掉用不到的 value', async () => {
    const onChange = vi.fn()
    render(<ControlEditor value={[{ field: 'a', operator: 'eq', value: 'x', effects: ['hidden'] }]} onChange={onChange} />)

    await pickOption(1, '为空')
    expect(onChange).toHaveBeenCalledWith([{ field: 'a', operator: 'empty', effects: ['hidden'] }])
  })

  it('字段自身已必填时提示 required 冗余', () => {
    render(
      <ControlEditor
        value={[{ field: 'a', operator: 'eq', value: 1, effects: ['required'] }]}
        selfRequired
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('字段自身已必填，该效果冗余')).toBeTruthy()
  })

  it('字段未必填时不提示冗余', () => {
    render(
      <ControlEditor
        value={[{ field: 'a', operator: 'eq', value: 1, effects: ['required'] }]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.queryByText('字段自身已必填，该效果冗余')).toBeNull()
  })

  it('未选择效果时提示规则不会生效', () => {
    render(<ControlEditor value={[{ field: 'a', effects: [] }]} onChange={vi.fn()} />)
    expect(screen.getByText('未选择效果，规则不会生效')).toBeTruthy()
  })

  it('添加规则时预填第一个字段名与空效果', () => {
    const onChange = vi.fn()
    render(<ControlEditor value={[]} fieldNames={['city']} onChange={onChange} />)

    fireEvent.click(screen.getByText('添加规则'))
    expect(onChange).toHaveBeenCalledWith([{ field: 'city', effects: [] }])
  })

  it('同一字段的规则合并后同时含 hidden 与 required 时提示死局', () => {
    render(
      <ControlEditor
        value={[
          { field: 'a', operator: 'eq', value: 1, effects: ['hidden'] },
          { field: 'b', operator: 'eq', value: 2, effects: ['required'] },
        ]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('隐藏与必填同时生效会导致提交被拦住但用户看不到提示')).toBeTruthy()
  })

  it('同一条规则内同时含 hidden 与 required 也提示', () => {
    render(
      <ControlEditor
        value={[{ field: 'a', operator: 'eq', value: 1, effects: ['hidden', 'required'] }]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('隐藏与必填同时生效会导致提交被拦住但用户看不到提示')).toBeTruthy()
  })

  it('只有 hidden 或只有 required 时不提示死局', () => {
    const { unmount } = render(
      <ControlEditor value={[{ field: 'a', effects: ['hidden'] }]} onChange={vi.fn()} />,
    )
    expect(screen.queryByText('隐藏与必填同时生效会导致提交被拦住但用户看不到提示')).toBeNull()
    unmount()

    render(<ControlEditor value={[{ field: 'a', effects: ['required'] }]} onChange={vi.fn()} />)
    expect(screen.queryByText('隐藏与必填同时生效会导致提交被拦住但用户看不到提示')).toBeNull()
  })
})
