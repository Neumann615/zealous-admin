import { describe, expect, it } from 'vitest'
import { interpolate, interpolateDeep } from './interpolate'

describe('interpolate', () => {
  const values = {
    province: '浙江',
    contact: { name: '张三' },
    count: 0,
    enabled: false,
  }

  it('替换顶层名路径', () => {
    expect(interpolate('{{province}}', values)).toBe('浙江')
  })

  it('替换嵌套名路径', () => {
    expect(interpolate('联系人：{{contact.name}}', values)).toBe('联系人：张三')
  })

  it('缺失的路径替换为空串（不留下占位符）', () => {
    expect(interpolate('{{contact.age}}-{{missing}}', values)).toBe('-')
  })

  it('混合固定文本与多个占位符', () => {
    expect(interpolate('{{province}}/{{contact.name}}', values)).toBe('浙江/张三')
  })

  it('花括号内允许空格，非字符串值转成字符串（0 与 false 不算缺失）', () => {
    expect(interpolate('{{ count }}|{{ enabled }}', values)).toBe('0|false')
  })

  it('没有占位符时原样返回', () => {
    expect(interpolate('固定文本', values)).toBe('固定文本')
  })
})

describe('interpolateDeep', () => {
  const values = { dept: { id: 7 }, keyword: 'abc' }

  it('递归处理对象与数组里的字符串', () => {
    const input = {
      deptId: '{{dept.id}}',
      list: ['{{keyword}}', 1, true],
      nested: { q: 'x-{{keyword}}' },
    }

    expect(interpolateDeep(input, values)).toEqual({
      deptId: '7',
      list: ['abc', 1, true],
      nested: { q: 'x-abc' },
    })
  })

  it('非字符串原样返回', () => {
    const date = new Date(0)
    expect(interpolateDeep(date, values)).toBe(date)
    expect(interpolateDeep(undefined, values)).toBeUndefined()
    expect(interpolateDeep(null, values)).toBeNull()
    expect(interpolateDeep(3, values)).toBe(3)
  })

  it('不改变原对象', () => {
    const input = { a: '{{keyword}}' }
    interpolateDeep(input, values)
    expect(input.a).toBe('{{keyword}}')
  })
})
