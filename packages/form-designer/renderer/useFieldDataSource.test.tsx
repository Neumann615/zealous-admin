// @vitest-environment jsdom
import type { FormEventConfig } from '../events/types'
import type { FieldSchema, FormSchema } from '../types/schema'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeFnSource } from '../events/fnSource'
import { registerFormDataApis } from './dataApis'
import { FormRenderer } from './FormRenderer'
import '../registry/components'
import '../test/setupDom'

afterEach(() => {
  cleanup()
  delete (globalThis as any).__reload
  delete (globalThis as any).__trace
})

/** 选项类字段：radio 直接把 options 的 label 渲染成可见文本，断言不必展开下拉 */
function radio(id: string, field: string, dataSource?: FieldSchema['dataSource'], props: Record<string, any> = {}): FieldSchema {
  return { id, type: 'radio', field, label: field, props, ...(dataSource ? { dataSource } : {}) }
}

function input(id: string, field: string): FieldSchema {
  return { id, type: 'input', field, label: field, props: {} }
}

function schemaWith(children: FieldSchema[], events?: FormEventConfig): FormSchema {
  return {
    version: 2,
    form: { layout: 'vertical' },
    ...(events ? { events } : {}),
    children,
  }
}

function renderForm(schema: FormSchema, initialValues?: Record<string, any>) {
  return render(
    <App>
      <FormRenderer schema={schema} initialValues={initialValues} showActions={false} />
    </App>,
  )
}

/** 钩子体里没有回调出口，用全局变量把 ctx.reload 抓出来（与 hooks.test.tsx 的 __trace 同法） */
const captureReload: FormEventConfig = { onFormMounted: [{ fn: makeFnSource(['ctx'], 'globalThis.__reload = ctx.reload') }] }

async function getReload(): Promise<(field?: string) => Promise<void>> {
  await waitFor(() => expect((globalThis as any).__reload).toBeTypeOf('function'))
  return (globalThis as any).__reload
}

function trace(): any[] {
  const calls: any[] = []
  ;(globalThis as any).__trace = (v: any) => calls.push(v)
  return calls
}

describe('声明式数据来源（useFieldDataSource）', () => {
  let error: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    error = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    error.mockRestore()
  })

  it('没有 def / ref 时不加载，保持 props.options 原样', async () => {
    renderForm(schemaWith([
      radio('a', 'dept', { watch: ['city'] }, { options: [{ label: '原有选项', value: '1' }] }),
    ]))

    await waitFor(() => expect(screen.getByText('原有选项')).toBeTruthy())
    expect(error).not.toHaveBeenCalled()
  })

  it('static 来源直接用定义里的选项，覆盖 props.options', async () => {
    renderForm(schemaWith([
      radio('a', 'dept', { def: { type: 'static', options: [{ label: '静态项', value: '1' }] } }, { options: [{ label: '被覆盖', value: '0' }] }),
    ]))

    await waitFor(() => expect(screen.getByText('静态项')).toBeTruthy())
    expect(screen.queryByText('被覆盖')).toBeNull()
  })

  it('def 优先于 ref（与 HookRef 的内联优先同规则）', async () => {
    const schema: FormSchema = {
      ...schemaWith([
        radio('a', 'dept', {
          ref: 'shared',
          def: { type: 'static', options: [{ label: '内联', value: '1' }] },
        }),
      ]),
      dataSources: { shared: { type: 'static', options: [{ label: '命名表', value: '2' }] } },
    }
    renderForm(schema)

    await waitFor(() => expect(screen.getByText('内联')).toBeTruthy())
    expect(screen.queryByText('命名表')).toBeNull()
  })

  it('ref 指向 schema.dataSources 的命名定义', async () => {
    const schema: FormSchema = {
      ...schemaWith([radio('a', 'dept', { ref: 'shared' })]),
      dataSources: { shared: { type: 'static', options: [{ label: '命名表', value: '2' }] } },
    }
    renderForm(schema)

    await waitFor(() => expect(screen.getByText('命名表')).toBeTruthy())
  })

  it('metadata 走宿主注册的 metadata 接口，默认按 label / value 映射', async () => {
    const metadata = vi.fn().mockResolvedValue([
      { label: '男', value: '1' },
      { label: '女', value: '2' },
    ])
    registerFormDataApis({ metadata })

    renderForm(schemaWith([radio('a', 'sex', { def: { type: 'metadata', setCode: 'GENDER' } })]))

    await waitFor(() => expect(screen.getByText('男')).toBeTruthy())
    expect(metadata).toHaveBeenCalledWith({ type: 'metadata', setCode: 'GENDER' }, expect.anything())
    expect(screen.getByText('女')).toBeTruthy()
  })

  it('metadata 的 labelField / valueField 可改字段映射', async () => {
    registerFormDataApis({
      metadata: vi.fn().mockResolvedValue([{ name: '研发部', code: 9 }]),
    })

    renderForm(schemaWith([
      radio('a', 'dept', { def: { type: 'metadata', setCode: 'ORGANIZATION', labelField: 'name', valueField: 'code' } }),
    ]))

    await waitFor(() => expect(screen.getByText('研发部')).toBeTruthy())
  })

  it('api 来源：params 插值后传入，parse 按名路径取数组', async () => {
    const api = vi.fn().mockResolvedValue({ data: { list: [{ label: '研发', value: 9 }] } })
    registerFormDataApis({ 'test.deptList': api })

    renderForm(
      schemaWith([
        input('city', 'city'),
        radio('a', 'dept', {
          def: { type: 'api', api: 'test.deptList', params: { city: '{{city}}', fixed: 'x' }, parse: 'data.list' },
        }),
      ]),
      { city: 'hz' },
    )

    await waitFor(() => expect(screen.getByText('研发')).toBeTruthy())
    expect(api).toHaveBeenCalledWith({ city: 'hz', fixed: 'x' }, expect.anything())
  })

  it('接口未注册时提示「未注册的数据接口」，且不写入选项', async () => {
    renderForm(schemaWith([radio('a', 'dept', { def: { type: 'api', api: 'test.missing' } })]))

    expect(await screen.findByText('未注册的数据接口：test.missing')).toBeTruthy()
    expect(error).toHaveBeenCalled()
  })

  it('beforeLoadData 返回 false 时中断本次加载（不取数、不提示）', async () => {
    const api = vi.fn().mockResolvedValue([{ label: 'A', value: 'a' }])
    registerFormDataApis({ 'test.blocked': api })
    const calls = trace()

    renderForm(schemaWith(
      [radio('a', 'dept', { def: { type: 'api', api: 'test.blocked' } })],
      {
        beforeLoadData: [{
          fn: makeFnSource(['ctx'], 'globalThis.__trace([ctx.payload.field, ctx.payload.config.type])\nreturn false'),
        }],
      },
    ))

    await waitFor(() => expect(calls).toEqual([['dept', 'api']]))
    expect(api).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('afterLoadData 拿到 field / config / result', async () => {
    registerFormDataApis({ 'test.after': vi.fn().mockResolvedValue([{ label: 'A', value: 'a' }]) })
    const calls = trace()

    renderForm(schemaWith(
      [radio('a', 'dept', { def: { type: 'api', api: 'test.after' } })],
      {
        afterLoadData: [{
          fn: makeFnSource(['ctx'], 'globalThis.__trace([ctx.payload.field, ctx.payload.config.type, ctx.payload.result.length])'),
        }],
      },
    ))

    await waitFor(() => expect(calls).toEqual([['dept', 'api', 1]]))
  })

  it('watch 命中的字段变化后重取，未命中不重取', async () => {
    const api = vi.fn().mockResolvedValue([{ label: '研发', value: 9 }])
    registerFormDataApis({ 'test.watch': api })

    const { container } = renderForm(schemaWith([
      input('city', 'city'),
      input('note', 'note'),
      radio('a', 'dept', { def: { type: 'api', api: 'test.watch' }, watch: ['city'], debounce: 10 }),
    ]))

    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))

    // 未命中 watch 的字段变化：值版本号会动，但依赖值没变 → 不重取
    fireEvent.change(container.querySelectorAll('input')[1], { target: { value: 'x' } })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40))
    })
    expect(api).toHaveBeenCalledTimes(1)

    fireEvent.change(container.querySelectorAll('input')[0], { target: { value: 'hz' } })
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
  })

  it('watch 引起的自动重取不触发 onReload', async () => {
    registerFormDataApis({ 'test.auto': vi.fn().mockResolvedValue([{ label: 'A', value: 'a' }]) })
    const calls = trace()

    const { container } = renderForm(schemaWith(
      [
        input('city', 'city'),
        radio('a', 'dept', { def: { type: 'api', api: 'test.auto' }, watch: ['city'], debounce: 10 }),
      ],
      { onReload: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("reload")') }] },
    ))

    await waitFor(() => expect(screen.getByText('A')).toBeTruthy())
    fireEvent.change(container.querySelector('input')!, { target: { value: 'hz' } })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40))
    })
    expect(calls).toEqual([])
  })

  it('后写胜：先发的请求晚返回时不覆盖后发请求的结果，并 abort 上一请求', async () => {
    const resolves: ((value: any) => void)[] = []
    const signals: (AbortSignal | undefined)[] = []
    registerFormDataApis({
      'test.race': (_params, signal) => {
        signals.push(signal)
        return new Promise(resolve => resolves.push(resolve))
      },
    })

    renderForm(schemaWith(
      [radio('a', 'dept', { def: { type: 'api', api: 'test.race' } })],
      captureReload,
    ))
    const reload = await getReload()
    await waitFor(() => expect(resolves.length).toBe(1))

    let pending: Promise<void> | undefined
    await act(async () => {
      pending = reload()
    })
    expect(signals[0]?.aborted).toBe(true)
    expect(resolves.length).toBe(2)

    await act(async () => {
      resolves[1]([{ label: '新', value: 'new' }])
      await pending
    })
    await waitFor(() => expect(screen.getByText('新')).toBeTruthy())

    // 第一次请求的宿主实现忽略了 signal，晚到的结果必须被序号丢弃
    await act(async () => {
      resolves[0]([{ label: '旧', value: 'old' }])
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    expect(screen.queryByText('旧')).toBeNull()
    expect(screen.getByText('新')).toBeTruthy()
  })

  it('取数被取消（AbortError）时静默忽略：不提示、不 console.error', async () => {
    registerFormDataApis({
      'test.aborted': vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })),
    })

    renderForm(schemaWith([radio('a', 'dept', { def: { type: 'api', api: 'test.aborted' } })]))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })
    expect(error).not.toHaveBeenCalled()
    expect(screen.queryByText(/数据接口/)).toBeNull()
  })

  it('取数失败保留上一次的 options（已选值的标签不会消失）', async () => {
    const api = vi.fn()
      .mockResolvedValueOnce([{ label: '首次成功', value: 'a' }])
      .mockRejectedValueOnce(new Error('boom'))
    registerFormDataApis({ 'test.flaky': api })

    renderForm(schemaWith(
      [radio('a', 'dept', { def: { type: 'api', api: 'test.flaky' } })],
      captureReload,
    ))
    const reload = await getReload()
    await waitFor(() => expect(screen.getByText('首次成功')).toBeTruthy())

    await act(async () => {
      await reload()
    })

    expect(await screen.findByText('数据源加载失败：dept')).toBeTruthy()
    expect(error).toHaveBeenCalled()
    expect(screen.getByText('首次成功')).toBeTruthy()
  })

  it('ctx.reload() 重取全部数据源字段，ctx.reload(field) 只重取命中字段；两者都触发 onReload', async () => {
    const apiA = vi.fn().mockResolvedValue([{ label: 'A', value: 'a' }])
    const apiB = vi.fn().mockResolvedValue([{ label: 'B', value: 'b' }])
    registerFormDataApis({ 'test.reloadA': apiA, 'test.reloadB': apiB })
    const calls = trace()

    renderForm(schemaWith(
      [
        radio('a', 'a', { def: { type: 'api', api: 'test.reloadA' } }),
        radio('b', 'b', { def: { type: 'api', api: 'test.reloadB' } }),
      ],
      {
        ...captureReload,
        onReload: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace(String(ctx.payload.field))') }],
      },
    ))
    const reload = await getReload()
    await waitFor(() => expect(apiA).toHaveBeenCalledTimes(1))

    await act(async () => {
      await reload()
    })
    expect(apiA).toHaveBeenCalledTimes(2)
    expect(apiB).toHaveBeenCalledTimes(2)

    await act(async () => {
      await reload('b')
    })
    expect(apiA).toHaveBeenCalledTimes(2)
    expect(apiB).toHaveBeenCalledTimes(3)
    expect(calls).toEqual(['undefined', 'b'])
  })

  it('宿主每次重渲染都传新 schema 引用时，挂载后仍只取数一次', async () => {
    const api = vi.fn().mockResolvedValue([{ label: '研发', value: 9 }])
    registerFormDataApis({ 'test.inline': api })

    function Host() {
      const [tick, setTick] = useState(0)
      // 每次渲染都新建 schema 对象（与业务页内联传 schema 的写法一致）
      return (
        <App>
          <FormRenderer
            schema={{
              version: 2,
              form: { layout: 'vertical' },
              children: [radio('a', 'dept', { def: { type: 'api', api: 'test.inline' } })],
            }}
            showActions={false}
            onSubmit={vi.fn()}
          />
          <button onClick={() => setTick(tick + 1)}>rerender</button>
          <span>{`tick:${tick}`}</span>
        </App>
      )
    }

    const { getByText } = render(<Host />)
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))

    fireEvent.click(getByText('rerender'))
    await waitFor(() => expect(getByText('tick:1')).toBeTruthy())
    // 留出微任务窗口：schema 引用变化若被当成依赖，会在这里多发一次请求
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 30))
    })
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('static 来源不触发 beforeLoadData / afterLoadData（没有请求）', async () => {
    const calls = trace()
    renderForm(schemaWith(
      [radio('a', 'dept', { def: { type: 'static', options: [{ label: 'A', value: 'a' }] } })],
      {
        beforeLoadData: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("before")') }],
        afterLoadData: [{ fn: makeFnSource(['ctx'], 'globalThis.__trace("after")') }],
      },
    ))

    await waitFor(() => expect(screen.getByText('A')).toBeTruthy())
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })
    expect(calls).toEqual([])
  })

  it('静态来源的空 options 同样覆盖组件属性里的选项（空数组也是 truthy）', async () => {
    renderForm(schemaWith([
      radio('a', 'dept', { def: { type: 'static', options: [] } }, { options: [{ label: '组件属性里的选项', value: 'x' }] }),
    ]))

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })
    expect(screen.queryByText('组件属性里的选项')).toBeNull()
  })

  it('元数据返回形状不符的数组时跳过无效项并告警（不产出垃圾选项）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    registerFormDataApis({
      // 对象项缺 value → 跳过；字符串项直接当值用；布尔项无法当值 → 跳过
      metadata: vi.fn().mockResolvedValue([{ label: '缺值' }, 'b', true, { label: '正常', value: '1' }]),
    })

    renderForm(schemaWith([radio('a', 'dept', { def: { type: 'metadata', setCode: 'GENDER' } })]))

    await waitFor(() => expect(screen.getByText('正常')).toBeTruthy())
    expect(screen.getByText('b')).toBeTruthy()
    expect(screen.queryByText('缺值')).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
