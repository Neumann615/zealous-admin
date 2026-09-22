import type { ControlEffect, ControlRule } from '../types/schema'
import { describe, expect, it } from 'vitest'
import { getByPathName } from '../utils/path'
import { evalControl } from './control'

describe('evalControl', () => {
  it('无规则或空规则返回空对象', () => {
    expect(evalControl(undefined, {})).toEqual({})
    expect(evalControl([], { a: 1 })).toEqual({})
  })

  it('eq / neq：默认按 eq 判定', () => {
    const rules: ControlRule[] = [{ field: 'enabled', value: true, effects: ['hidden'] }]
    expect(evalControl(rules, { enabled: true })).toEqual({ hidden: true })
    expect(evalControl(rules, { enabled: false })).toEqual({})

    expect(evalControl([{ field: 'kind', operator: 'neq', value: 'a', effects: ['disabled'] }], { kind: 'b' }))
      .toEqual({ disabled: true })
    expect(evalControl([{ field: 'kind', operator: 'neq', value: 'a', effects: ['disabled'] }], { kind: 'a' }))
      .toEqual({})
  })

  it('严格相等：数字 1 与字符串 "1" 不相等', () => {
    expect(evalControl([{ field: 'count', value: 1, effects: ['hidden'] }], { count: '1' })).toEqual({})
    expect(evalControl([{ field: 'count', value: 1, effects: ['hidden'] }], { count: 1 })).toEqual({ hidden: true })
  })

  it('in：字段值在 value 数组内时命中', () => {
    const rules = [{ field: 'kind', operator: 'in' as const, value: ['a', 'b'], effects: ['required' as const] }]
    expect(evalControl(rules, { kind: 'b' })).toEqual({ required: true })
    expect(evalControl(rules, { kind: 'c' })).toEqual({})
    // value 不是数组时不命中（形状校验会拦下，运行时按不命中处理）
    expect(evalControl([{ field: 'kind', operator: 'in', value: 'a', effects: ['required'] }], { kind: 'a' })).toEqual({})
  })

  it('empty / notEmpty：undefined / null / 空串 / 空数组都算空，0 与 false 不算', () => {
    const empty = [{ field: 'note', operator: 'empty' as const, effects: ['hidden' as const] }]
    const notEmpty = [{ field: 'note', operator: 'notEmpty' as const, effects: ['required' as const] }]

    for (const value of [undefined, null, '', []]) {
      expect(evalControl(empty, { note: value })).toEqual({ hidden: true })
      expect(evalControl(notEmpty, { note: value })).toEqual({})
    }
    for (const value of [0, false, 'x', [1]]) {
      expect(evalControl(empty, { note: value })).toEqual({})
      expect(evalControl(notEmpty, { note: value })).toEqual({ required: true })
    }
  })

  it('contains：数组成员或字符串子串命中', () => {
    const rules: ControlRule[] = [{ field: 'tags', operator: 'contains', value: 'a', effects: ['hidden'] }]
    expect(evalControl(rules, { tags: ['a', 'b'] })).toEqual({ hidden: true })
    expect(evalControl(rules, { tags: 'abc' })).toEqual({ hidden: true })
    expect(evalControl(rules, { tags: ['c'] })).toEqual({})
    expect(evalControl(rules, { tags: 1 })).toEqual({})
  })

  it('gt / gte / lt / lte：数字优先，文本回退字典序', () => {
    const value = 10
    const effects: ControlEffect[] = ['hidden']

    expect(evalControl([{ field: 'count', operator: 'gt', value: 9, effects }], { count: value })).toEqual({ hidden: true })
    expect(evalControl([{ field: 'count', operator: 'gte', value: 10, effects }], { count: value })).toEqual({ hidden: true })
    expect(evalControl([{ field: 'count', operator: 'lt', value: 11, effects }], { count: value })).toEqual({ hidden: true })
    expect(evalControl([{ field: 'count', operator: 'lte', value: 9, effects }], { count: value })).toEqual({})
    expect(evalControl([{ field: 'text', operator: 'gt', value: '9', effects }], { text: '10' })).toEqual({ hidden: true })
    expect(evalControl([{ field: 'count', operator: 'gt', value: '', effects }], { count: value })).toEqual({})
  })

  it('嵌套名路径：contact.name / items.0.title', () => {
    expect(evalControl([{ field: 'contact.name', operator: 'empty', effects: ['disabled'] }], { contact: { name: '' } }))
      .toEqual({ disabled: true })
    expect(evalControl([{ field: 'items.0.title', value: '苹果', effects: ['hidden'] }], { items: [{ title: '苹果' }] }))
      .toEqual({ hidden: true })
    // 中间段不存在时取值 undefined，empty 命中
    expect(evalControl([{ field: 'contact.age', operator: 'empty', effects: ['hidden'] }], {})).toEqual({ hidden: true })
  })

  it('conditions：同一组内条件取且', () => {
    const rules: ControlRule[] = [{
      conditions: [
        { field: 'kind', operator: 'eq', value: 'vip' },
        { field: 'score', operator: 'gte', value: 90 },
      ],
      effects: ['hidden'],
    }]

    expect(evalControl(rules, { kind: 'vip', score: 90 })).toEqual({ hidden: true })
    expect(evalControl(rules, { kind: 'vip', score: 89 })).toEqual({})
    expect(evalControl(rules, { kind: 'normal', score: 90 })).toEqual({})
  })

  it('多条规则仍取或：任一 AND 条件组命中即生效', () => {
    const rules: ControlRule[] = [
      {
        conditions: [
          { field: 'kind', value: 'a' },
          { field: 'count', operator: 'notEmpty' },
        ],
        effects: ['disabled'],
      },
      {
        conditions: [
          { field: 'kind', value: 'b' },
          { field: 'count', operator: 'gt', value: 2 },
        ],
        effects: ['required'],
      },
    ]

    expect(evalControl(rules, { kind: 'a', count: 1 })).toEqual({ disabled: true })
    expect(evalControl(rules, { kind: 'b', count: 3 })).toEqual({ required: true })
    expect(evalControl(rules, { kind: 'b', count: 1 })).toEqual({})
  })

  it('同一规则内的多个效果全生效，多条规则的效果取或', () => {
    expect(evalControl(
      [{ field: 'a', value: 1, effects: ['hidden', 'disabled', 'required'] }],
      { a: 1 },
    )).toEqual({ hidden: true, disabled: true, required: true })

    expect(evalControl(
      [
        { field: 'a', value: 1, effects: ['hidden'] },
        { field: 'b', value: 2, effects: ['required'] },
        { field: 'c', value: 3, effects: ['disabled'] },
      ],
      { a: 1, b: 0, c: 3 },
    )).toEqual({ hidden: true, disabled: true })
  })

  it('非法 operator 视为 eq（手写 / 外部 JSON）', () => {
    expect(evalControl([{ field: 'a', operator: 'contains' as any, value: 'x', effects: ['hidden'] }], { a: 'x' }))
      .toEqual({ hidden: true })
  })

  it('规则缺 field 或 effects 时被跳过，不影响其它规则', () => {
    expect(evalControl([{ effects: ['hidden'] } as any], { a: 1 })).toEqual({})
    expect(evalControl([{ field: 'a', effects: [] }], { a: 1 })).toEqual({})
    expect(evalControl(
      [{ field: '', effects: ['hidden'] } as any, { field: 'a', value: 1, effects: ['required'] }],
      { a: 1 },
    )).toEqual({ required: true })
  })
})

describe('getByPathName', () => {
  it('取值失败返回 undefined', () => {
    expect(getByPathName(undefined, 'a')).toBeUndefined()
    expect(getByPathName({ a: { b: 1 } }, 'a.b')).toBe(1)
    expect(getByPathName({ a: 1 }, 'a.b')).toBeUndefined()
  })
})
