import { describe, expect, it, vi } from 'vitest'
import { compileFn, isFnSource, makeFnSource, validateFnSource } from './fnSource'

describe('isFnSource', () => {
  it('识别合法信封', () => {
    expect(isFnSource({ $type: 'fn', args: ['ctx'], body: 'return 1' })).toBe(true)
  })

  it('拒绝缺字段、类型不符或非对象', () => {
    expect(isFnSource({ $type: 'fn', args: ['ctx'] })).toBe(false)
    expect(isFnSource({ $type: 'fn', args: 'ctx', body: '' })).toBe(false)
    expect(isFnSource({ $type: 'other', args: [], body: '' })).toBe(false)
    expect(isFnSource(null)).toBe(false)
  })
})

describe('validateFnSource', () => {
  it('语法正确返回 null', () => {
    expect(validateFnSource(makeFnSource(['ctx'], 'ctx.message.success("ok")'))).toBeNull()
  })

  it('语法错误返回可展示消息', () => {
    expect(validateFnSource(makeFnSource(['ctx'], 'ctx.'))).toContain('语法错误')
  })

  it('形参名非法返回可展示消息', () => {
    expect(validateFnSource({ $type: 'fn', args: ['1bad'], body: '' })).toContain('参数名不合法')
  })

  it('空形参名返回可展示消息（不被空串真值判断绕过）', () => {
    const msg = validateFnSource({ $type: 'fn', args: [''], body: '' })
    expect(msg).toContain('参数名不合法')
    expect(msg).toBe('参数名不合法：不能为空')
  })

  it('顶层 await 不误判为语法错误', () => {
    expect(validateFnSource(makeFnSource(['ctx'], 'await Promise.resolve(); return 1'))).toBeNull()
  })
})

describe('compileFn', () => {
  it('编译后可执行并返回值', async () => {
    await expect(compileFn(makeFnSource(['a', 'b'], 'return a + b'))(1, 2)).resolves.toBe(3)
  })

  it('相同 args+body 命中缓存（返回同一函数引用）', () => {
    const src = makeFnSource(['a'], 'return a * 2')
    expect(compileFn(src)).toBe(compileFn({ ...src }))
  })

  it('不同函数体不复用', () => {
    expect(compileFn(makeFnSource([], 'return 1'))).not.toBe(compileFn(makeFnSource([], 'return 2')))
  })

  it('缓存超限后同一 key 重新编译（返回新引用）', () => {
    const src = makeFnSource(['a'], 'return a')
    const first = compileFn(src)
    for (let i = 0; i < 500; i++)
      compileFn(makeFnSource([], `return ${i}`))
    expect(compileFn(src)).not.toBe(first)
  })

  it('入参对象可用', () => {
    const spy = vi.fn()
    compileFn(makeFnSource(['ctx'], 'ctx.message.success("hi")'))({ message: { success: spy } })
    expect(spy).toHaveBeenCalledWith('hi')
  })

  it('钩子体允许顶层 await', async () => {
    await expect(compileFn(makeFnSource(['ctx'], 'await Promise.resolve(); return 1'))()).resolves.toBe(1)
  })
})
