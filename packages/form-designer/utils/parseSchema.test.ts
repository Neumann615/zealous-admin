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

  it('合法 events（内联 fn + 按名引用 + custom）通过', () => {
    const raw = JSON.stringify({
      version: 2,
      form: {},
      children: [],
      events: {
        onFormCreated: [{ fn: { $type: 'fn', args: ['ctx'], body: 'return 1' }, watch: ['a'] }],
        beforeSubmit: [{ hook: 'syncDept' }],
        custom: { syncDept: { label: '同步部门', fn: { $type: 'fn', args: ['ctx'], body: '' } } },
      },
    })
    const schema = parseSchema(raw)
    expect(schema.events?.beforeSubmit).toEqual([{ hook: 'syncDept' }])
    expect(schema.events?.custom?.syncDept.label).toBe('同步部门')
  })

  it('场景值不是数组时抛错', () => {
    const raw = JSON.stringify({ version: 2, form: {}, children: [], events: { onFormCreated: { hook: 'x' } } })
    expect(() => parseSchema(raw)).toThrow('表单结构解析失败：事件钩子格式不正确（onFormCreated）')
  })

  it('fn 形状不对时抛错（缺 body / fn 非对象 / 既无 fn 也无 hook）', () => {
    const bad = (events: unknown) => JSON.stringify({ version: 2, form: {}, children: [], events })
    expect(() => parseSchema(bad({ onFormMounted: [{ fn: { $type: 'fn', args: ['ctx'] } }] })))
      .toThrow('事件钩子格式不正确（onFormMounted）')
    expect(() => parseSchema(bad({ onReset: [{ fn: 'oops' }] })))
      .toThrow('事件钩子格式不正确（onReset）')
    expect(() => parseSchema(bad({ onReset: [{ watch: ['a'] }] })))
      .toThrow('事件钩子格式不正确（onReset）')
    // hook 不是字符串同样拒绝
    expect(() => parseSchema(bad({ onReset: [{ hook: 1 }] })))
      .toThrow('事件钩子格式不正确（onReset）')
  })

  it('钩子正文超长时抛错', () => {
    const body = 'x'.repeat(20001)
    const raw = JSON.stringify({
      version: 2,
      form: {},
      children: [],
      events: { onSubmitError: [{ fn: { $type: 'fn', args: ['ctx'], body } }] },
    })
    expect(() => parseSchema(raw)).toThrow('钩子正文过长（onSubmitError）')
    // 恰好 20000 字符仍可通过
    const edge = JSON.stringify({
      version: 2,
      form: {},
      children: [],
      events: { onSubmitError: [{ fn: { $type: 'fn', args: ['ctx'], body: 'x'.repeat(20000) } }] },
    })
    expect(parseSchema(edge).events?.onSubmitError).toHaveLength(1)
  })

  it('custom 里的 fn 非法时抛错', () => {
    const raw = JSON.stringify({
      version: 2,
      form: {},
      children: [],
      events: { custom: { syncDept: { label: '同步部门' } } },
    })
    expect(() => parseSchema(raw)).toThrow('事件钩子格式不正确（公共事件 syncDept）')
  })
})

describe('parseSchema 校验规则形状', () => {
  function withRules(rules: unknown, label = '邮箱'): string {
    return JSON.stringify({
      version: 2,
      form: {},
      children: [{ id: 'a', type: 'input', label, props: {}, formItem: { rules } }],
    })
  }

  it('扩展后的类型、阈值与 trigger 能穿过解析', () => {
    const raw = withRules([
      { type: 'required' },
      { type: 'email' },
      { type: 'regexp', pattern: '^1\\d{10}$' },
      { type: 'len', value: 6 },
      { type: 'minLen', value: 2, trigger: 'blur' },
      { type: 'maxLen', value: 8, trigger: 'change' },
      { type: 'min', value: 18, trigger: 'submit' },
      { type: 'max', value: 60 },
      { type: 'phone' },
      { type: 'ip' },
      { type: 'integer' },
      { type: 'uppercase' },
      { type: 'lowercase' },
    ])
    expect(parseSchema(raw).children[0].formItem?.rules).toHaveLength(13)
  })

  it('未知类型被拒（错误消息带字段 label）', () => {
    expect(() => parseSchema(withRules([{ type: 'mobile' }])))
      .toThrow('表单结构解析失败：校验规则格式不正确（邮箱）')
  })

  it('阈值类型缺数字 value 时被拒', () => {
    expect(() => parseSchema(withRules([{ type: 'len' }])))
      .toThrow('表单结构解析失败：校验规则格式不正确（邮箱）：len 需要数字阈值 value')
    expect(() => parseSchema(withRules([{ type: 'min', value: '5' }]))).toThrow('校验规则格式不正确（邮箱）')
    expect(() => parseSchema(withRules([{ type: 'max', value: null }]))).toThrow('校验规则格式不正确（邮箱）')
    // 非阈值类型不需要 value
    expect(() => parseSchema(withRules([{ type: 'phone' }]))).not.toThrow()
  })

  it('pattern 非字符串、trigger 非法时被拒', () => {
    expect(() => parseSchema(withRules([{ type: 'regexp', pattern: 1 }]))).toThrow('校验规则格式不正确（邮箱）')
    expect(() => parseSchema(withRules([{ type: 'email', trigger: 'onBlur' }]))).toThrow('校验规则格式不正确（邮箱）')
  })

  it('规则不是对象、rules 不是数组时被拒', () => {
    expect(() => parseSchema(withRules(['required']))).toThrow('校验规则格式不正确（邮箱）')
    expect(() => parseSchema(withRules(null))).toThrow('校验规则格式不正确（邮箱）')
    expect(() => parseSchema(JSON.stringify({
      version: 2,
      form: {},
      children: [{ id: 'a', type: 'input', label: '邮箱', props: {}, formItem: { rules: { type: 'email' } } }],
    }))).toThrow('校验规则格式不正确（邮箱）')
  })

  it('没有 label 时用组件 type 定位，嵌套子表单里的规则同样校验', () => {
    expect(() => parseSchema(JSON.stringify({
      version: 2,
      form: {},
      children: [{ id: 'a', type: 'input', props: {}, formItem: { rules: [{ type: 'mobile' }] } }],
    }))).toThrow('校验规则格式不正确（input）')

    expect(() => parseSchema(JSON.stringify({
      version: 2,
      form: {},
      children: [{
        id: 'c',
        type: 'card',
        props: {},
        children: [{ id: 'b', type: 'input', label: '年龄', props: {}, formItem: { rules: [{ type: 'min' }] } }],
      }],
    }))).toThrow('校验规则格式不正确（年龄）：min 需要数字阈值 value')
  })

  it('validator 规则：hook 字符串或合法 fn，至少有一个', () => {
    // 只引用公共事件：合法
    expect(() => parseSchema(withRules([{ type: 'validator', hook: 'checkNick' }]))).not.toThrow()
    // 只给内联函数体：合法
    const withInlineFn = withRules([{ type: 'validator', fn: { $type: 'fn', args: ['ctx'], body: 'return true' } }])
    expect(() => parseSchema(withInlineFn)).not.toThrow()
    // 两个都没有 → 会被序列化成读不回来的空壳
    expect(() => parseSchema(withRules([{ type: 'validator' }])))
      .toThrow('表单结构解析失败：校验规则格式不正确（邮箱）')
    // hook 不是字符串
    expect(() => parseSchema(withRules([{ type: 'validator', hook: 1 }])))
      .toThrow('校验规则格式不正确（邮箱）')
  })

  it('validator 的 fn 一旦出现必须合法（形状 + 语法，与钩子同一份校验）', () => {
    expect(() => parseSchema(withRules([{ type: 'validator', fn: { $type: 'fn', args: ['ctx'] } }])))
      .toThrow('校验规则格式不正确（邮箱）')
    expect(() => parseSchema(withRules([{ type: 'validator', fn: 'oops' }])))
      .toThrow('校验规则格式不正确（邮箱）')
    // 语法错误用钩子同一份诊断文案
    expect(() => parseSchema(withRules([{ type: 'validator', fn: { $type: 'fn', args: ['ctx'], body: 'return (' } }])))
      .toThrow('校验规则格式不正确（邮箱）：语法错误')
  })

  it('validator 规则同样受 pattern / trigger 的形状检查约束', () => {
    // trigger 只允许 blur / change / submit（写成 antd 事件名会让运行时不再按配置时机过滤）
    expect(() => parseSchema(withRules([{ type: 'validator', hook: 'checkNick', trigger: 'onBlur' }])))
      .toThrow('校验规则格式不正确（邮箱）')
    expect(() => parseSchema(withRules([{ type: 'validator', hook: 'checkNick', pattern: 1 }])))
      .toThrow('校验规则格式不正确（邮箱）')
    // 合法 trigger 照常通过
    expect(() => parseSchema(withRules([{ type: 'validator', hook: 'checkNick', trigger: 'submit' }]))).not.toThrow()
  })
})
