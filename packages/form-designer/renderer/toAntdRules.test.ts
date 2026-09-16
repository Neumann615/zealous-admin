import type { FieldSchema, ValidateRule } from '../types/schema'
import { describe, expect, it, vi } from 'vitest'
import { collectValidateTriggers, toAntdRules } from './toAntdRules'

function field(formItem: FieldSchema['formItem']): FieldSchema {
  return { id: 'a', type: 'input', field: 'fa', label: '邮箱', props: {}, formItem }
}

describe('toAntdRules', () => {
  it('无规则返回空数组', () => {
    expect(toAntdRules(field(undefined))).toEqual([])
    expect(toAntdRules(field({ rules: [] }))).toEqual([])
  })

  it('required 规则', () => {
    expect(toAntdRules(field({ rules: [{ type: 'required' }] }))).toEqual([
      { required: true, message: '邮箱不能为空' },
    ])
  })

  it('formItem.required 映射为必填规则并置于最前', () => {
    const rules = toAntdRules(field({ required: true, rules: [{ type: 'email' }] }))
    expect(rules[0]).toEqual({ required: true, message: '邮箱不能为空' })
    expect(rules).toHaveLength(2)
  })

  it('formItem.required 与 rules 中 required 不重复', () => {
    const rules = toAntdRules(field({ required: true, rules: [{ type: 'required', message: '必填' }] }))
    expect(rules.filter((r: any) => r.required)).toHaveLength(1)
  })

  it('email/url/number 映射为 type 规则', () => {
    expect(toAntdRules(field({ rules: [{ type: 'email' }] }))).toEqual([
      { type: 'email', message: '邮箱格式不正确' },
    ])
  })

  it('regexp 正常 pattern', () => {
    const rules = toAntdRules(field({ rules: [{ type: 'regexp', pattern: '^1\\d{10}$', message: '手机号不正确' }] }))
    expect(rules[0]).toHaveProperty('pattern')
    expect((rules[0] as any).pattern).toBeInstanceOf(RegExp)
  })

  it('regexp 空 pattern 被过滤', () => {
    expect(toAntdRules(field({ rules: [{ type: 'regexp' }] }))).toEqual([])
  })

  it('regexp 非法 pattern 被过滤且不抛异常', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => toAntdRules(field({ rules: [{ type: 'regexp', pattern: '[' }] }))).not.toThrow()
    expect(toAntdRules(field({ rules: [{ type: 'regexp', pattern: '[' }] }))).toEqual([])
    vi.restoreAllMocks()
  })

  it('无 label 时使用默认称谓', () => {
    const f = field({ rules: [{ type: 'required' }] })
    delete f.label
    expect(toAntdRules(f)).toEqual([{ required: true, message: '该字段不能为空' }])
  })
})

/** 取单条规则的映射结果（用例只关心这一条） */
function firstRule(rule: ValidateRule): any {
  return toAntdRules(field({ rules: [rule] }))[0]
}

describe('toAntdRules 长度与数值规则', () => {
  it('len / minLen / maxLen 落到字符串长度规则', () => {
    expect(firstRule({ type: 'len', value: 6 })).toEqual({ type: 'string', len: 6, message: '邮箱长度必须为 6' })
    expect(firstRule({ type: 'minLen', value: 2 })).toEqual({ type: 'string', min: 2, message: '邮箱长度不能少于 2' })
    expect(firstRule({ type: 'maxLen', value: 8 })).toEqual({ type: 'string', max: 8, message: '邮箱长度不能超过 8' })
  })

  it('min / max 落到数值范围规则（与长度规则语义不同）', () => {
    expect(firstRule({ type: 'min', value: 18 })).toEqual({ type: 'number', min: 18, message: '邮箱不能小于 18' })
    expect(firstRule({ type: 'max', value: 60 })).toEqual({ type: 'number', max: 60, message: '邮箱不能大于 60' })
  })

  it('阈值缺失时跳过该规则，重复调用不重复刷屏', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(toAntdRules(field({ rules: [{ type: 'len' }] }))).toEqual([])
    const afterFirst = warn.mock.calls.length
    expect(afterFirst).toBeGreaterThan(0)
    expect(toAntdRules(field({ rules: [{ type: 'len' }] }))).toEqual([])
    // 按名去重（warnOnce）：同一条诊断只提示一次
    expect(warn.mock.calls.length).toBe(afterFirst)
    warn.mockRestore()
  })

  it('自定义 message 覆盖默认文案', () => {
    expect(firstRule({ type: 'len', value: 6, message: '请填 6 位' }).message).toBe('请填 6 位')
  })
})

describe('toAntdRules 内置 pattern 规则', () => {
  it('phone 用大陆手机号正则', () => {
    const rule = firstRule({ type: 'phone' })
    expect(rule.pattern.source).toBe('^1[3-9]\\d{9}$')
    expect(rule.pattern.test('13812345678')).toBe(true)
    expect(rule.pattern.test('12812345678')).toBe(false)
    expect(rule.message).toBe('邮箱格式不正确')
  })

  it('ip 用 IPv4 正则（每段 0-255）', () => {
    const rule = firstRule({ type: 'ip' })
    expect(rule.pattern.test('192.168.1.1')).toBe(true)
    expect(rule.pattern.test('256.168.1.1')).toBe(false)
    expect(rule.pattern.test('192.168.1')).toBe(false)
    expect(rule.message).toBe('邮箱不是合法的 IP 地址')
  })

  it('integer 按字符串内容校验（可带负号，小数不通过）', () => {
    const rule = firstRule({ type: 'integer' })
    expect(rule.pattern.source).toBe('^-?\\d+$')
    expect(rule.pattern.test('-12')).toBe(true)
    expect(rule.pattern.test('1.5')).toBe(false)
    expect(rule.message).toBe('邮箱必须为整数')
  })

  it('uppercase / lowercase 只认单一大写或小写形态', () => {
    expect(firstRule({ type: 'uppercase' })).toEqual({ pattern: /^[A-Z]+$/, message: '邮箱只能是大写字母' })
    expect(firstRule({ type: 'lowercase' })).toEqual({ pattern: /^[a-z]+$/, message: '邮箱只能是小写字母' })
  })
})

describe('toAntdRules trigger', () => {
  it('trigger 映射为 antd 的字段事件名', () => {
    expect(firstRule({ type: 'required', trigger: 'blur' }).validateTrigger).toBe('onBlur')
    expect(firstRule({ type: 'required', trigger: 'change' }).validateTrigger).toBe('onChange')
    expect(firstRule({ type: 'required', trigger: 'submit' }).validateTrigger).toBe('onSubmit')
  })

  it('未配置 trigger 时不写 validateTrigger（保持 antd 默认时机）', () => {
    const rule = firstRule({ type: 'required' })
    expect(rule).toEqual({ required: true, message: '邮箱不能为空' })
    expect('validateTrigger' in rule).toBe(false)
  })

  it('collectValidateTriggers：只有 blur 规则需要把 onBlur 并入字段级时机', () => {
    expect(collectValidateTriggers(undefined)).toBeUndefined()
    expect(collectValidateTriggers([{ type: 'required' }])).toBeUndefined()
    expect(collectValidateTriggers([{ type: 'required', trigger: 'change' }])).toBeUndefined()
    // submit 不走字段事件（提交本就全量校验），不并入
    expect(collectValidateTriggers([{ type: 'required', trigger: 'submit' }])).toBeUndefined()
    // 显式设置字段级时机不能挤掉 antd 默认的 onChange 校验
    expect(collectValidateTriggers([{ type: 'required', trigger: 'blur' }])).toEqual(['onChange', 'onBlur'])
  })
})
