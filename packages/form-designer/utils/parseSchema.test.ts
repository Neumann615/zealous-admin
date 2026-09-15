import { describe, expect, it } from 'vitest'
import { createEmptySchema } from '../types/schema'
import { parseSchema } from './parseSchema'

describe('parseSchema', () => {
  it('v1 schema 迁移到当前版本并补齐可选段', () => {
    const v1 = JSON.stringify({
      version: 1,
      form: { layout: 'vertical', labelAlign: 'left' },
      children: [{ id: 'a', type: 'input', field: 'name', props: {} }],
    })
    const schema = parseSchema(v1)
    expect(schema.version).toBe(2)
    expect(schema.form.layout).toBe('vertical')
    expect(schema.form.size).toBe('middle')
    expect(schema.form.colon).toBe(true)
    expect(schema.children).toHaveLength(1)
  })

  it('当前版本原样通过', () => {
    expect(parseSchema(JSON.stringify({ version: 2, form: {}, children: [] })).version).toBe(2)
  })

  it('缺少 version 视为 v1 迁移', () => {
    expect(parseSchema(JSON.stringify({ form: {}, children: [] })).version).toBe(2)
  })

  it('版本号非法时抛错', () => {
    expect(() => parseSchema(JSON.stringify({ version: 0, form: {}, children: [] }))).toThrow('表单版本号非法')
    expect(() => parseSchema(JSON.stringify({ version: 'abc', form: {}, children: [] }))).toThrow('表单版本号非法')
    expect(() => parseSchema(JSON.stringify({ version: true, form: {}, children: [] }))).toThrow('表单版本号非法')
    expect(() => parseSchema(JSON.stringify({ version: '2', form: {}, children: [] }))).toThrow('表单版本号非法')
  })

  it('缺少 form 时补空模板默认配置', () => {
    expect(parseSchema(JSON.stringify({ version: 2, children: [] })).form).toEqual(createEmptySchema().form)
  })

  it('更高的未知版本抛出可展示的错误', () => {
    const future = JSON.stringify({ version: 99, form: {}, children: [] })
    expect(() => parseSchema(future)).toThrow('不支持的表单版本 v99')
  })

  it('非法 JSON 抛出可展示的错误', () => {
    expect(() => parseSchema('{bad json')).toThrow('表单结构解析失败')
  })

  it('children 非数组时抛错', () => {
    expect(() => parseSchema(JSON.stringify({ version: 2, form: {}, children: {} }))).toThrow('表单结构解析失败')
  })

  it('也接受已解析的对象（后端可能直出对象快照）', () => {
    expect(parseSchema({ version: 1, form: {}, children: [] } as unknown).version).toBe(2)
  })

  it('events 与 dataSources 能穿过解析', () => {
    const raw = JSON.stringify({
      version: 2,
      form: {},
      children: [],
      events: { onFormCreated: [{ fn: { $type: 'fn', args: ['ctx'], body: '' } }] },
      dataSources: { orgTree: { type: 'static' } },
    })
    const schema = parseSchema(raw)
    expect(schema.events?.onFormCreated).toHaveLength(1)
    expect(schema.dataSources?.orgTree).toEqual({ type: 'static' })
  })
})
