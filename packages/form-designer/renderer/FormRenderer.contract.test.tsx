// @vitest-environment jsdom
import type { RenderContract } from '../types/schema'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerFormDataApis } from './dataApis'
import { FormRenderer } from './FormRenderer'
import '../registry/components'
import '../test/setupDom'

afterEach(cleanup)

function schema(field: string): any {
  return {
    version: 2,
    form: { layout: 'vertical' },
    children: [{ id: field, type: 'input', field, label: '姓名', props: {} }],
  }
}

function contract(field: string, data?: Record<string, any>): RenderContract {
  return { schema: schema(field), data }
}

describe('formRenderer 渲染契约', () => {
  it('缺少 __render 注册时展示可执行的错误提示', async () => {
    render(<FormRenderer formId={9001} />)
    expect(await screen.findByText(/需要在宿主注册 __render 数据接口/)).toBeTruthy()
  })

  it('renderContract 直传优先于 formId 与 schemaJson', async () => {
    const renderApi = vi.fn()
    registerFormDataApis({ __render: renderApi })

    render(
      <FormRenderer
        renderContract={contract('contract', { contract: '契约值' })}
        formId={1}
        schemaJson={JSON.stringify(schema('fallback'))}
      />,
    )

    expect(await screen.findByDisplayValue('契约值')).toBeTruthy()
    expect(renderApi).not.toHaveBeenCalled()
    expect(screen.queryByDisplayValue('fallback')).toBeNull()
  })

  it('非法 renderContract 展示解析错误而不抛出未处理异常', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<FormRenderer renderContract={{ schema: '{ bad json' } as RenderContract} />)

    expect(await screen.findByText('表单结构解析失败：不是合法的 JSON')).toBeTruthy()
    consoleError.mockRestore()
  })

  it('formId 模式调用宿主 __render 并渲染完整契约', async () => {
    const renderApi = vi.fn().mockResolvedValue(contract('remote', { remote: '回显值' }))
    registerFormDataApis({ __render: renderApi })

    render(<FormRenderer formId={3} initialValues={{ remote: '调用方' }} />)

    expect(await screen.findByDisplayValue('回显值')).toBeTruthy()
    expect(renderApi).toHaveBeenCalledWith(
      { formId: 3, data: { remote: '调用方' } },
      expect.anything(),
    )
  })

  it('formId 快速切换时取消旧请求，旧契约不覆盖新契约', async () => {
    const signals: AbortSignal[] = []
    let resolveFirst: (value: RenderContract) => void = () => {}
    const renderApi = vi.fn()
      .mockImplementationOnce((_params, signal) => {
        signals.push(signal)
        return new Promise((resolve, reject) => {
          resolveFirst = resolve
          signal.addEventListener('abort', () => reject(new Error('aborted')))
        })
      })
      .mockImplementationOnce(() => Promise.resolve(contract('second', { second: '表单二' })))
    registerFormDataApis({ __render: renderApi })

    const { rerender } = render(<FormRenderer formId={1} />)
    await waitFor(() => expect(renderApi).toHaveBeenCalledTimes(1))

    rerender(<FormRenderer formId={2} />)
    await waitFor(() => expect(signals[0]?.aborted).toBe(true))
    await waitFor(() => expect(renderApi).toHaveBeenCalledTimes(2))

    await act(async () => {
      resolveFirst(contract('first', { first: '表单一' }))
      await Promise.resolve()
    })

    expect(await screen.findByDisplayValue('表单二')).toBeTruthy()
    expect(screen.queryByDisplayValue('表单一')).toBeNull()
  })
})
