import type { FormSchema } from '../types/schema'
import { describe, expect, it } from 'vitest'
import { applyContractPermissions, resolveRenderContract, resolveSchemaContract } from './renderContractLoader'

function schema(): FormSchema {
  return {
    version: 2,
    form: { layout: 'vertical' },
    children: [{ id: 'name', type: 'input', field: 'name', label: '姓名', props: {} }],
  }
}

describe('renderContractLoader', () => {
  it('完整契约兼容 JSON 字符串和对象 schema，并合并回显与权限', () => {
    const input = schema()
    const contract = {
      schema: JSON.stringify(input),
      data: { name: '张三' },
      permissions: { name: { required: true, editable: false } },
      formVersion: 3,
    }

    const resolved = resolveRenderContract(contract)
    expect(resolved.data).toEqual({ name: '张三' })
    expect(resolved.schema.children[0].formItem?.required).toBe(true)
    expect(resolved.schema.children[0].props.disabled).toBe(true)
    expect(resolved.schema).not.toBe(contract.schema)
  })

  it('对象 schema 会经解析器校验，契约 data 缺失时回落调用方数据', () => {
    const resolved = resolveRenderContract({ schema: schema() }, { name: '回显' })
    expect(resolved.schema.version).toBe(2)
    expect(resolved.data).toEqual({ name: '回显' })
  })

  it('schema 直传会克隆并应用内置权限，不污染调用方对象', () => {
    const input = schema()
    input.permissions = { name: { editable: false } }
    const resolved = resolveSchemaContract(input, { name: '张三' })

    expect(resolved.schema.children[0].props.disabled).toBe(true)
    expect(input.children[0].props.disabled).toBeUndefined()
  })

  it('权限按名路径应用，并支持数组行的 wildcard 路径', () => {
    const input = { id: 'qty', type: 'input', field: 'qty', label: '数量', props: {} }
    const table = { id: 'items', type: 'tableForm', field: 'items', label: '明细', props: {}, children: [input] }
    const tree = [{ ...table, children: [input] }] as FormSchema['children']

    applyContractPermissions(tree, { 'items.*.qty': { visible: false } })
    expect(tree[0].children?.[0].formItem?.hidden).toBe(true)
  })

  it('非法契约给出可展示错误', () => {
    expect(() => resolveRenderContract({ schema: '' })).toThrow('渲染契约缺少 schema')
    expect(() => resolveRenderContract({ schema: schema(), data: [] as any })).toThrow('渲染契约的 data 应为对象')
    expect(() => resolveRenderContract({ schema: schema(), permissions: [] as any })).toThrow('渲染契约的 permissions 应为对象')
  })
})
