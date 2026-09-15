import type { FormHookContext } from './types'
import { describe, expect, it, vi } from 'vitest'
import { makeFnSource } from './fnSource'
import { emitHook, filterRefsForField, runHooks } from './runHooks'

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

  it('非关键场景 return false 后继续执行后续钩子', async () => {
    const calls = trace()
    const refs = [
      { fn: makeFnSource(['ctx'], 'return false') },
      { fn: makeFnSource(['ctx'], 'globalThis.__trace("next")') },
    ]
    await runHooks('onFormCreated', refs, ctx())
    expect(calls).toEqual(['next'])
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

  it('同时配置 fn 与 hook 时以 fn 为准', async () => {
    const calls = trace()
    const custom = { ping: { fn: makeFnSource(['ctx'], 'globalThis.__trace("hook")') } }
    await runHooks(
      'onFormCreated',
      [{ hook: 'ping', fn: makeFnSource(['ctx'], 'globalThis.__trace("fn")') }],
      ctx(),
      custom,
    )
    expect(calls).toEqual(['fn'])
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

  it('钩子失败时以稳定 key 上报 error 提示并打 console.error', async () => {
    const error = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await runHooks(
        'onFormCreated',
        [{ fn: makeFnSource(['ctx'], 'throw new Error("boom")') }],
        ctx({ message: { success: vi.fn(), error, warning: vi.fn(), info: vi.fn() } }),
      )
      expect(error).toHaveBeenCalledWith({
        content: '表单钩子执行失败：onFormCreated',
        key: 'form-designer-hook-error',
      })
      expect(consoleError).toHaveBeenCalled()
    }
    finally {
      consoleError.mockRestore()
    }
  })

  it('emit 的 payload 经 ctx 投递且不写入 values', async () => {
    const spy = vi.fn()
    ;(globalThis as any).__trace = spy
    const custom = { echo: { fn: makeFnSource(['ctx'], 'globalThis.__trace([ctx.payload, ctx.values])') } }
    await emitHook('echo', ctx({ values: { x: 1 } }), custom, 'hi')
    expect(spy).toHaveBeenCalledWith(['hi', { x: 1 }])
  })

  it('自 emit 的公共事件不会无限递归，且计数归还后仍可正常执行', async () => {
    const error = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const calls = trace()
      const custom = { loop: { fn: makeFnSource(['ctx'], 'globalThis.__trace("tick"); await ctx.emit("loop")') } }
      const base = ctx({ message: { success: vi.fn(), error, warning: vi.fn(), info: vi.fn() } })
      base.emit = (name, payload) => emitHook(name, base, custom, payload)

      await base.emit('loop')
      // 前 5 层正常执行，第 6 层被深度护栏拦下
      expect(calls).toHaveLength(5)
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('递归过深'))
      expect(error).toHaveBeenCalledWith({
        content: '表单钩子 emit 递归过深：loop',
        key: 'form-designer-hook-error',
      })

      // 计数已在 finally 归还：再触发一次仍能跑到同样的深度上限（不是一次就卡死）
      calls.length = 0
      error.mockClear()
      await base.emit('loop')
      expect(calls).toHaveLength(5)
      expect(error).toHaveBeenCalledTimes(1)
    }
    finally {
      consoleError.mockRestore()
    }
  })

  it('两个公共事件互相 emit 同样被深度护栏中断', async () => {
    const error = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const calls = trace()
      const custom = {
        ping: { fn: makeFnSource(['ctx'], 'globalThis.__trace("ping"); await ctx.emit("pong")') },
        pong: { fn: makeFnSource(['ctx'], 'globalThis.__trace("pong"); await ctx.emit("ping")') },
      }
      const base = ctx({ message: { success: vi.fn(), error, warning: vi.fn(), info: vi.fn() } })
      base.emit = (name, payload) => emitHook(name, base, custom, payload)

      await base.emit('ping')
      expect(calls).toEqual(['ping', 'pong', 'ping', 'pong', 'ping'])
      expect(error).toHaveBeenCalledTimes(1)
    }
    finally {
      consoleError.mockRestore()
    }
  })

  it('同时配 fn 与 hook、引用不存在的公共事件各警告一次（不随触发重复）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const refs = [
        { hook: 'both', fn: makeFnSource(['ctx'], 'return 1') },
        { hook: 'missingX' },
      ]
      const custom = { both: { fn: makeFnSource(['ctx'], 'return 1') } }
      await runHooks('onFormCreated', refs, ctx(), custom)
      await runHooks('onFormCreated', refs, ctx(), custom)
      expect(warn).toHaveBeenCalledTimes(2)
      expect(warn.mock.calls[0][0]).toContain('以 fn 为准')
      expect(warn.mock.calls[1][0]).toContain('不存在的公共事件')
    }
    finally {
      warn.mockRestore()
    }
  })
})

describe('filterRefsForField', () => {
  it('未声明 watch 的引用对任意字段都触发', () => {
    const refs = [{ fn: makeFnSource([], '') }, { watch: [], fn: makeFnSource([], '') }]
    expect(filterRefsForField(refs, 'any')).toHaveLength(2)
    expect(filterRefsForField(undefined, 'any')).toEqual([])
  })

  it('声明了 watch 的引用只在命中的字段触发', () => {
    const refs = [
      { watch: ['a'], fn: makeFnSource([], '') },
      { watch: ['a', 'b'], fn: makeFnSource([], '') },
    ]
    expect(filterRefsForField(refs, 'a')).toHaveLength(2)
    expect(filterRefsForField(refs, 'b')).toHaveLength(1)
    expect(filterRefsForField(refs, 'c')).toHaveLength(0)
  })
})
