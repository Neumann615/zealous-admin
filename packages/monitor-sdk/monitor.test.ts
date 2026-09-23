// @vitest-environment jsdom
import type { MonitorLog } from './types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMonitor, initMonitor, monitor } from './index'

const REPORT_URL = 'http://localhost:3508/monitor/collect'

interface CollectBody {
  appId: string
  logId: string
  logs: Array<MonitorLog & { logId: string, serial: number }>
}

const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify({
  code: 200,
  message: '操作成功',
  data: { accepted: 1, dropped: 0, queued: true, logId: 'x' },
}), { status: 200, headers: { 'Content-Type': 'application/json' } })))

function postedLogs(): Array<MonitorLog & { logId: string, serial: number, uid?: string, nickname?: string }> {
  return fetchMock.mock.calls.flatMap((call) => {
    const init = call[1]
    const body = JSON.parse(String(init?.body)) as CollectBody
    return body.logs
  })
}

function lastLog(rangeType: string) {
  return [...postedLogs()].reverse().find(log => log.rangeType === rangeType)
}

function dispatchError(message: string) {
  const event = new Event('error') as Event & { message?: string, error?: Error, filename?: string, lineno?: number, colno?: number }
  event.message = message
  event.error = new Error(message)
  event.filename = 'app.js'
  event.lineno = 12
  event.colno = 3
  window.dispatchEvent(event)
}

describe('monitor-sdk', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockClear()
    initMonitor({ appId: 'unit-app', reportUrl: REPORT_URL, source: 'unit', batchSize: 1, flushInterval: 20 })
  })

  afterEach(() => {
    getMonitor()?.destroy()
    vi.unstubAllGlobals()
  })

  it('初始化后挂载全局实例并上报首屏路由', () => {
    expect(window.__ZA_MONITOR__).toBeDefined()
    const route = lastLog('USER_ROUTE')
    expect(route).toBeTruthy()
    expect(route?.params).toBe('unit')
  })

  it('捕获 window 异常并带上堆栈与 UA', () => {
    dispatchError('boom is not a function')
    const log = lastLog('WINDOW_ERROR')
    expect(log?.type).toBe('ERROR')
    expect(log?.title).toBe('boom is not a function')
    expect(log?.content).toContain('boom is not a function')
    expect(log?.extra?.userAgent).toBeTruthy()
  })

  it('捕获未处理的 Promise 拒绝', () => {
    const event = new Event('unhandledrejection') as Event & { reason?: unknown }
    event.reason = new Error('rejected reason')
    window.dispatchEvent(event)
    expect(lastLog('PROMISE_ERROR')?.title).toBe('rejected reason')
  })

  it('捕获用户点击并提取可读文案', () => {
    const button = document.createElement('button')
    button.textContent = '提交审批'
    document.body.append(button)
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const log = lastLog('USER_CLICK')
    expect(log?.title).toBe('提交审批')
    expect(log?.extra?.selector).toContain('button')
    button.remove()
  })

  it('路由跳转记录来源页，支撑路径流转分析', () => {
    const before = window.location.pathname
    history.pushState({}, '', '/monitor/log')
    const log = lastLog('USER_ROUTE')
    expect(log?.page).toBe('/monitor/log')
    expect(log?.extra?.from).toBe(before)
  })

  it('业务主动上报按 title 归并，级别由调用方指定', () => {
    monitor.report({ title: '保存表单', type: 'ERROR', content: '字段校验失败' })
    monitor.report({ title: '保存表单', type: 'INFO' })
    const failures = postedLogs().filter(log => log.rangeType === 'PROACTIVE_REPORTING')
    expect(failures).toHaveLength(2)
    expect(failures[0].type).toBe('ERROR')
    expect(failures[0].title).toBe('保存表单')
  })

  it('setUser 后日志带上 nickname 与 uid', () => {
    monitor.setUser({ nickname: '张三', uid: 'u-1001' })
    monitor.report({ title: '导出数据', type: 'INFO' })
    const log = lastLog('PROACTIVE_REPORTING')
    expect(log?.nickname).toBe('张三')
    expect(log?.uid).toBe('u-1001')
  })

  it('destroy 后不再采集', () => {
    getMonitor()?.destroy()
    fetchMock.mockClear()
    const button = document.createElement('button')
    button.textContent = '已销毁'
    document.body.append(button)
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    button.remove()
    monitor.report({ title: '不会再上报' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
