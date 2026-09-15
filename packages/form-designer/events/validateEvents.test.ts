import { describe, expect, it } from 'vitest'
import { makeFnSource } from './fnSource'
import { HOOK_BODY_LIMIT, validateEvents, validateHookFn } from './validateEvents'

describe('validateEvents', () => {
  it('合法 events 返回空（内联 fn、按名引用、custom、空对象）', () => {
    expect(validateEvents(undefined)).toEqual([])
    expect(validateEvents({})).toEqual([])
    expect(validateEvents({ custom: {} })).toEqual([])
    expect(validateEvents({
      onFormCreated: [{ fn: makeFnSource(['ctx'], 'return 1') }],
      beforeSubmit: [{ hook: 'syncDept' }],
      custom: { syncDept: { label: '同步部门', fn: makeFnSource(['ctx'], '') } },
    })).toEqual([])
  })

  it('fn 形状不对 / 既无 fn 也无 hook / 场景值非数组都报错', () => {
    expect(validateEvents({ onFormMounted: [{ fn: { $type: 'fn', args: ['ctx'] } }] as any }))
      .toEqual(['事件钩子格式不正确（onFormMounted）'])
    expect(validateEvents({ onReset: [{}] }))
      .toEqual(['事件钩子格式不正确（onReset）'])
    expect(validateEvents({ onReset: [{ hook: 1 }] as any }))
      .toEqual(['事件钩子格式不正确（onReset）'])
    expect(validateEvents({ onFormCreated: { hook: 'x' } } as any))
      .toEqual(['事件钩子格式不正确（onFormCreated）'])
    expect(validateEvents([] as any)).toEqual(['events 应为对象'])
    expect(validateEvents({ custom: [] } as any)).toEqual(['events.custom 应为对象'])
  })

  it('形参名与语法问题带场景定位', () => {
    expect(validateEvents({ onFormCreated: [{ fn: makeFnSource(['ctx'], 'ctx.') }] })[0])
      .toMatch(/^onFormCreated：语法错误/)
    expect(validateEvents({ onSubmitError: [{ fn: makeFnSource([''], 'return 1') }] })[0])
      .toBe('onSubmitError：参数名不合法：不能为空')
  })

  it('正文超长报错，恰好达到上限通过（场景引用与公共事件一致）', () => {
    const over = 'x'.repeat(HOOK_BODY_LIMIT + 1)
    expect(validateEvents({ onSubmitError: [{ fn: makeFnSource(['ctx'], over) }] }))
      .toEqual([`钩子正文过长（onSubmitError）：最多 ${HOOK_BODY_LIMIT} 字符`])
    expect(validateEvents({ custom: { big: { fn: makeFnSource(['ctx'], over) } } }))
      .toEqual([`钩子正文过长（公共事件 big）：最多 ${HOOK_BODY_LIMIT} 字符`])
    expect(validateEvents({ onSubmitError: [{ fn: makeFnSource(['ctx'], 'x'.repeat(HOOK_BODY_LIMIT)) }] }))
      .toEqual([])
  })

  it('custom 缺少合法 fn 报错（没有 hook 回退）', () => {
    expect(validateEvents({ custom: { syncDept: { label: '同步部门' } } as any }))
      .toEqual(['事件钩子格式不正确（公共事件 syncDept）'])
  })

  it('一次列出全部问题（保存侧要展示完）', () => {
    const issues = validateEvents({
      onFormCreated: [{}],
      onReset: [{ hook: 1 } as any],
      custom: { bad: {} as any },
    })
    expect(issues).toEqual([
      '事件钩子格式不正确（onFormCreated）',
      '事件钩子格式不正确（onReset）',
      '事件钩子格式不正确（公共事件 bad）',
    ])
  })
})

describe('validateHookFn', () => {
  it('不传 where 时只返回问题本身（设计器红字）', () => {
    expect(validateHookFn(makeFnSource(['ctx'], 'return 1'))).toBeNull()
    expect(validateHookFn(makeFnSource(['ctx'], 'ctx.'))).toMatch(/^语法错误/)
    expect(validateHookFn(makeFnSource(['ctx'], 'x'.repeat(HOOK_BODY_LIMIT + 1))))
      .toBe(`钩子正文过长：最多 ${HOOK_BODY_LIMIT} 字符`)
  })
})
