import type { FormHookContext } from './types'
import { describe, expect, it, vi } from 'vitest'
import { makeFnSource } from './fnSource'
import { emitHook, runHooks } from './runHooks'

const message = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }

function ctx(over: Partial<FormHookContext> = {}): FormHookContext {
  return {
    form: {} as any,
    values: {},
    getValues: () => ({}),
    setValue: vi.fn(),
    setValues: vi.fn(),
    getField: () => undefined,
    emit: vi.fn(),
    reload: async () => {},
    message,
    ...over,
  } as FormHookContext
}

function trace() {
  const calls: any[] = []
  ;(globalThis as any).__trace = (v: any) => calls.push(v)
  return calls
}

describe('runHooks', () => {
  it('按 order 升序执行', async () => {
    const calls = trace()
    const refs = [
      { order: 2, fn: makeFnSource(['ctx'], 'globalThis.__trace("b")') },
      { order: 1, fn: makeFnSource(['ctx'], 'globalThis.__trace("a")') },
    ]
    await runHooks('onFormCreated', refs, ctx())
    expect(calls).toEqual(['a', 'b'])
  })

  it('钩子能读到 ctx 上的值快照', async () => {
    const spy = vi.fn()
    ;(globalThis as any).__trace = spy
    await runHooks(
      'onFormCreated',
      [{ fn: makeFnSource(['ctx'], 'globalThis.__trace(ctx.values.x)') }],
      ctx({ values: { x: 7 } }),
    )
    expect(spy).toHaveBeenCalledWith(7)
  })

  it('关键场景返回 false 会中断后续钩子并向上传 false', async () => {
    const spy = vi.fn()
    ;(globalThis as any).__trace = spy
    const refs = [
      { fn: makeFnSource(['ctx'], 'return false') },
      { fn: makeFnSource(['ctx'], 'globalThis.__trace("after")') },
    ]
    expect(await runHooks('beforeSubmit', refs, ctx())).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })

  it('非关键场景返回 false 不影响流程', async () => {
    expect(await runHooks('onFormCreated', [{ fn: makeFnSource(['ctx'], 'return false') }], ctx())).toBe(true)
  })

  it('非关键场景钩子抛错：继续执行后续钩子', async () => {
    const spy = vi.fn()
    ;(globalThis as any).__trace = spy
    const refs = [
      { fn: makeFnSource(['ctx'], 'throw new Error("boom")') },
      { fn: makeFnSource(['ctx'], 'globalThis.__trace("next")') },
    ]
    expect(await runHooks('onFormCreated', refs, ctx())).toBe(true)
    expect(spy).toHaveBeenCalledWith('next')
  })

  it('关键场景钩子抛错：中断并返回 false', async () => {
    const refs = [{ fn: makeFnSource(['ctx'], 'throw new Error("boom")') }]
    expect(await runHooks('beforeSubmit', refs, ctx())).toBe(false)
  })

  it('按名引用公共事件表', async () => {
    const spy = vi.fn()
    ;(globalThis as any).__trace = spy
    const custom = { syncDept: { label: '同步部门', fn: makeFnSource(['ctx'], 'globalThis.__trace("synced")') } }
    await runHooks('onFieldChange', [{ hook: 'syncDept' }], ctx(), custom)
    expect(spy).toHaveBeenCalledWith('synced')
  })

  it('引用不存在的公共事件不抛错', async () => {
    await expect(runHooks('onFieldChange', [{ hook: 'ghost' }], ctx(), {})).resolves.toBe(true)
  })

  it('异步钩子被 await', async () => {
    const spy = vi.fn()
    ;(globalThis as any).__trace = spy
    const refs = [{ fn: makeFnSource(['ctx'], 'await Promise.resolve(); globalThis.__trace("done")') }]
    await runHooks('onFormCreated', refs, ctx())
    expect(spy).toHaveBeenCalledWith('done')
  })

  it('emitHook 按名执行公共事件', async () => {
    const spy = vi.fn()
    ;(globalThis as any).__trace = spy
    const custom = { ping: { fn: makeFnSource(['ctx'], 'globalThis.__trace("pong")') } }
    await emitHook('ping', ctx(), custom)
    expect(spy).toHaveBeenCalledWith('pong')
  })

  it('emitHook 遇到不存在的名字或抛错的钩子都不抛异常', async () => {
    await expect(emitHook('ghost', ctx(), {})).resolves.toBeUndefined()
    const custom = { bad: { fn: makeFnSource(['ctx'], 'throw new Error("boom")') } }
    await expect(emitHook('bad', ctx(), custom)).resolves.toBeUndefined()
  })
})
