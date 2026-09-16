import type { FormHookContext } from '../events/types'
import type { FieldSchema, ValidateRule } from '../types/schema'
import { describe, expect, it, vi } from 'vitest'
import { makeFnSource } from '../events/fnSource'
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

describe('toAntdRules 自定义校验（validator）', () => {
  const CUSTOM = {
    checkNick: { label: '昵称校验', fn: makeFnSource(['ctx'], 'return ctx.payload.value === "ok"') },
  }

  function stubCtx(over?: Partial<FormHookContext>): FormHookContext {
    return {
      form: {} as FormHookContext['form'],
      values: {},
      getValues: () => ({}),
      setValue: vi.fn(),
      setValues: vi.fn(),
      getField: () => undefined,
      emit: vi.fn(),
      reload: async () => {},
      message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
      ...over,
    }
  }

  /** 取规则里的校验器：签名与 antd 调用方式一致（忽略 callback，用 promise 表达结果） */
  function validatorOf(rule: ValidateRule, custom?: any, buildCtx?: any) {
    const rules = toAntdRules(field({ rules: [rule] }), custom, buildCtx)
    return (rules[0] as any)?.validator as ((r: unknown, v: unknown) => Promise<void>) | undefined
  }

  it('返回 true / undefined / 空串视为通过', async () => {
    await expect(validatorOf({ type: 'validator', fn: makeFnSource(['ctx'], 'return true') })!({}, 'ok')).resolves.toBeUndefined()
    await expect(validatorOf({ type: 'validator', fn: makeFnSource(['ctx'], '') })!({}, 'ok')).resolves.toBeUndefined()
    await expect(validatorOf({ type: 'validator', fn: makeFnSource(['ctx'], 'return ""') })!({}, 'ok')).resolves.toBeUndefined()
  })

  it('返回字符串时作为错误消息', async () => {
    const check = validatorOf({ type: 'validator', fn: makeFnSource(['ctx'], 'return "昵称已经被占用"') })!
    await expect(check({}, 'ok')).rejects.toThrow('昵称已经被占用')
  })

  it('返回 false 时用「字段校验未通过」', async () => {
    const check = validatorOf({ type: 'validator', fn: makeFnSource(['ctx'], 'return false') })!
    await expect(check({}, 'ok')).rejects.toThrow('邮箱校验未通过')
  })

  it('抛错视为不通过，并走 notifyError 上报（ctx 由渲染器注入）', async () => {
    const messageError = vi.fn()
    const buildCtx = () => stubCtx({ message: { ...stubCtx().message, error: messageError } })
    const check = validatorOf(
      { type: 'validator', fn: makeFnSource(['ctx'], 'throw new Error("炸了")') },
      CUSTOM,
      buildCtx,
    )!
    await expect(check({}, 'ok')).rejects.toThrow('邮箱校验未通过')
    expect(messageError).toHaveBeenCalledTimes(1)
  })

  it('钩子拿到 ctx.payload = { value, formValue }', async () => {
    const seen: any[] = []
    ;(globalThis as any).__payload = (p: any) => seen.push(p)
    const buildCtx = () => stubCtx({ values: { name: '张三' } })
    const check = validatorOf(
      { type: 'validator', fn: makeFnSource(['ctx'], 'globalThis.__payload(ctx.payload); return true') },
      CUSTOM,
      buildCtx,
    )!

    await check({}, 42)
    expect(seen).toEqual([{ value: 42, formValue: { name: '张三' } }])
  })

  it('fn 优先于 hook（与 HookRef 同规则）', async () => {
    const check = validatorOf(
      { type: 'validator', hook: 'checkNick', fn: makeFnSource(['ctx'], 'return "内联生效"') },
      CUSTOM,
    )!
    await expect(check({}, 'ok')).rejects.toThrow('内联生效')
  })

  it('引用不存在的公共事件：该规则被忽略（不抛错、视为通过），按名只提示一次', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(toAntdRules(field({ rules: [{ type: 'validator', hook: 'nope' }] }), CUSTOM)).toEqual([])
    expect(warn).toHaveBeenCalled()
    const afterFirst = warn.mock.calls.length
    expect(toAntdRules(field({ rules: [{ type: 'validator', hook: 'nope' }] }), CUSTOM)).toEqual([])
    expect(warn.mock.calls.length).toBe(afterFirst)
    warn.mockRestore()
  })

  it('未传 custom 表时忽略 validator 规则（按名去重，不逐次刷屏）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(toAntdRules(field({ rules: [{ type: 'validator', hook: 'checkNick' }] }))).toEqual([])
    const afterFirst = warn.mock.calls.length
    expect(afterFirst).toBeGreaterThan(0)
    expect(toAntdRules(field({ rules: [{ type: 'validator', hook: 'checkNick' }] }))).toEqual([])
    expect(warn.mock.calls.length).toBe(afterFirst)
    warn.mockRestore()
  })

  it('函数体编译失败时跳过该规则而不抛错（渲染期不能白屏）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const badRule: ValidateRule = { type: 'validator', fn: makeFnSource(['ctx'], 'return (') }
    expect(() => toAntdRules(field({ rules: [badRule] }), CUSTOM)).not.toThrow()
    expect(toAntdRules(field({ rules: [badRule] }), CUSTOM)).toEqual([])
    warn.mockRestore()
  })

  it('面板配置的 message 透传到 rule（antd 会用它覆盖校验器给出的文案）', () => {
    const rules = toAntdRules(
      field({ rules: [{ type: 'validator', hook: 'checkNick', message: '昵称不合法' }] }),
      CUSTOM,
    )
    expect((rules[0] as any).message).toBe('昵称不合法')
  })

  it('trigger 同样透传到校验器规则', () => {
    const check = validatorOf({ type: 'validator', hook: 'checkNick', trigger: 'submit' }, CUSTOM)
    expect(check).toBeTypeOf('function')
    expect((toAntdRules(field({ rules: [{ type: 'validator', hook: 'checkNick', trigger: 'submit' }] }), CUSTOM)[0] as any).validateTrigger)
      .toBe('onSubmit')
  })
})
