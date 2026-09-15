// @vitest-environment jsdom
/* eslint-disable perfectionist/sort-imports -- dnd-kit 兜底需先于其它 import */
import '../test/setupDom'
import type { FormEventConfig } from '../events/types'
import type { FormSchema } from '../types/schema'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeFnSource } from '../events/fnSource'
import { FormRenderer } from './FormRenderer'
import '../registry/components'

afterEach(cleanup)

/** 钩子通过 globalThis.__trace 回传，避免依赖 ctx 上的测试专用方法 */
function trace() {
  const calls: any[] = []
  ;(globalThis as any).__trace = (v: any) => calls.push(v)
  return calls
}

function schemaWith(events: FormEventConfig, children: FormSchema['children'] = [
  { id: 'a', type: 'input', field: 'name', label: '姓名', props: {} },
]): FormSchema {
  return { version: 2, form: { layout: 'vertical' }, events, children }
}

function submitButton(container: HTMLElement) {
  return container.querySelector('button[type="submit"]')!
}

/** 带必填字段的 schema：用于校验失败场景 */
function requiredSchema(events: FormEventConfig): FormSchema {
  return {
    version: 2,
    form: { layout: 'vertical' },
    events,
    children: [
      { id: 'a', type: 'input', field: 'name', label: '姓名', props: {}, formItem: { rules: [{ type: 'required' }] } },
    ],
  }
}

describe('渲染器钩子接入（FormRenderer）', () => {
  it('挂载时依次触发 onFormCreated 与 onFormMounted', async () => {
    const calls = trace()
    render(
      <App>
        <FormRenderer
          schema={schemaWith({
            onFormCreated: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("created")') }],
            onFormMounted: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("mounted")') }],
          })}
          onSubmit={vi.fn()}
        />
      </App>,
    )
    await waitFor(() => expect(calls).toEqual(['created', 'mounted']))
  })

  it('父组件重渲染（schema 引用每次都变）不会重跑挂载场景', async () => {
    const calls = trace()
    function Host() {
      const [tick, setTick] = useState(0)
      return (
        <App>
          <FormRenderer
            schema={schemaWith({
              onFormCreated: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("created")') }],
              onFormMounted: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("mounted")') }],
            })}
            onSubmit={vi.fn()}
          />
          <button onClick={() => setTick(tick + 1)}>rerender</button>
          <span>{`tick:${tick}`}</span>
        </App>
      )
    }
    const { getByText } = render(<Host />)
    await waitFor(() => expect(calls).toEqual(['created', 'mounted']))

    fireEvent.click(getByText('rerender'))
    await waitFor(() => expect(getByText('tick:1')).toBeTruthy())
    // 留出微任务窗口：buildCtx 若不稳，会先 onFormUnmount 再重跑 created/mounted
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    expect(calls).toEqual(['created', 'mounted'])
  })

  it('字段变化触发 onFieldChange 并带上字段名', async () => {
    const calls = trace()
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ onFieldChange: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace(ctx.changed.field)') }] })}
          onSubmit={vi.fn()}
        />
      </App>,
    )
    fireEvent.change(container.querySelector('input')!, { target: { value: '张三' } })
    await waitFor(() => expect(calls).toEqual(['name']))
  })

  it('卸载时触发 onFormUnmount', async () => {
    const calls = trace()
    const { unmount } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ onFormUnmount: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("unmount")') }] })}
          onSubmit={vi.fn()}
        />
      </App>,
    )
    unmount()
    await waitFor(() => expect(calls).toEqual(['unmount']))
  })

  it('校验未通过时触发 onValidateFail，且不调用 onSubmit', async () => {
    const calls = trace()
    const onSubmit = vi.fn()
    const { container } = render(
      <App>
        <FormRenderer
          schema={requiredSchema({ onValidateFail: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("validateFail")') }] })}
          onSubmit={onSubmit}
        />
      </App>,
    )
    fireEvent.click(submitButton(container))
    await waitFor(() => expect(calls).toEqual(['validateFail']))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('watch 未命中的字段变化不触发钩子，命中后触发', async () => {
    const calls = trace()
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith(
            { onFieldChange: [{ watch: ['a'], fn: makeFnSource(['ctx'], 'globalThis.__trace(ctx.changed.field)') }] },
            [
              { id: 'a', type: 'input', field: 'a', label: '甲', props: {} },
              { id: 'b', type: 'input', field: 'b', label: '乙', props: {} },
            ],
          )}
          onSubmit={vi.fn()}
        />
      </App>,
    )
    fireEvent.change(container.querySelectorAll('input')[1], { target: { value: 'bee' } })
    await waitFor(() => expect(container.querySelectorAll('input')[1].value).toBe('bee'))
    expect(calls).toEqual([])

    fireEvent.change(container.querySelectorAll('input')[0], { target: { value: 'aye' } })
    await waitFor(() => expect(calls).toEqual(['a']))
  })

  it('beforeSubmit 返回 false 时不调用 onSubmit', async () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ beforeSubmit: [{ fn: makeFnSource(['ctx'], 'return false') }] })}
          onSubmit={onSubmit}
        />
      </App>,
    )
    fireEvent.click(submitButton(container))
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled())
  })

  it('beforeSubmit 不返回 false 时正常提交', async () => {
    const calls = trace()
    const onSubmit = vi.fn()
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ beforeSubmit: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("before")') }] })}
          onSubmit={onSubmit}
        />
      </App>,
    )
    fireEvent.click(submitButton(container))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(calls).toEqual(['before'])
  })

  it('beforeSubmit 里改的值会进入 onSubmit', async () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ beforeSubmit: [{ fn: makeFnSource(['ctx'], 'ctx.setValue("name", "李四")') }] })}
          onSubmit={onSubmit}
        />
      </App>,
    )
    fireEvent.click(submitButton(container))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: '李四' }))
  })

  it('onSubmit 解析后触发 afterSubmit', async () => {
    const calls = trace()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ afterSubmit: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("after")') }] })}
          onSubmit={onSubmit}
        />
      </App>,
    )
    fireEvent.click(submitButton(container))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(calls).toEqual(['after']))
  })

  it('onSubmit 拒绝时触发 onSubmitError', async () => {
    const calls = trace()
    const fail = vi.fn().mockRejectedValue(new Error('boom'))
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ onSubmitError: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("error")') }] })}
          onSubmit={fail}
        />
      </App>,
    )
    fireEvent.click(submitButton(container))
    await waitFor(() => expect(calls).toEqual(['error']))
  })

  it('非关键场景钩子抛错不影响提交', async () => {
    const onSubmit = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { container } = render(
        <App>
          <FormRenderer
            schema={schemaWith({ onFormMounted: [{ fn: makeFnSource(['ctx'], 'throw new Error("boom")') }] })}
            onSubmit={onSubmit}
          />
        </App>,
      )
      fireEvent.click(submitButton(container))
      await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    }
    finally {
      consoleError.mockRestore()
    }
  })

  it('按名引用公共事件表', async () => {
    const calls = trace()
    render(
      <App>
        <FormRenderer
          schema={schemaWith({
            custom: { ping: { label: '探针', fn: makeFnSource(['ctx'], 'globalThis.__trace("pong")') } },
            onFormMounted: [{ hook: 'ping' }],
          })}
          onSubmit={vi.fn()}
        />
      </App>,
    )
    await waitFor(() => expect(calls).toEqual(['pong']))
  })

  it('resetFields 后触发 onReset', async () => {
    const calls = trace()
    const { container } = render(
      <App>
        <FormRenderer
          schema={schemaWith({ onReset: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("reset")') }] })}
          onSubmit={vi.fn()}
        />
      </App>,
    )
    fireEvent.change(container.querySelector('input')!, { target: { value: '张三' } })
    await waitFor(() => expect(container.querySelector('input')!.value).toBe('张三'))

    fireEvent.click(container.querySelector('button:not([type="submit"])')!)
    await waitFor(() => expect(calls).toEqual(['reset']))
    expect(container.querySelector('input')!.value).toBe('')
  })

  it('ctx.emit 触发的公共事件能读到触发场景（ctx.scene）', async () => {
    const calls = trace()
    render(
      <App>
        <FormRenderer
          schema={schemaWith({
            custom: { probe: { fn: makeFnSource(['ctx'], 'globalThis.__trace(ctx.scene)') } },
            onFormMounted: [{ fn: makeFnSource(['ctx'], 'await ctx.emit("probe")') }],
          })}
          onSubmit={vi.fn()}
        />
      </App>,
    )
    await waitFor(() => expect(calls).toEqual(['onFormMounted']))
  })

  it('缺 <App> 祖先时错误提示降级为静态 message，不产生 unhandled rejection', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      render(
        <FormRenderer
          schema={schemaWith({ onFormMounted: [{ fn: makeFnSource(['ctx'], 'throw new Error("boom")') }] })}
          onSubmit={vi.fn()}
        />,
      )
      // 静态 message 会真的把提示渲染出来；若 message 仍是 {} 则会在 catch 里二次抛出
      expect(await screen.findByText('表单钩子执行失败：onFormMounted')).toBeTruthy()
    }
    finally {
      consoleError.mockRestore()
    }
  })
})
