import type { MonitorLog, MonitorOptions } from './types'
import {
  cssPath,
  currentPage,
  findClickLabel,
  matchesIgnore,
  messageOf,
  normalizeUrl,
  stackOf,
  truncate,
} from './utils'

export type PushFn = (log: MonitorLog) => void

export interface CollectorContext {
  push: PushFn
  options: MonitorOptions
  getSource: () => string | undefined
}

export type CollectorInstaller = (ctx: CollectorContext) => () => void

const MAX_CONTENT = 4000

/** 脚本异常：window error 事件中排除资源加载错误（资源由 RESOURCE_PER 汇总） */
export const installErrorCollector: CollectorInstaller = (ctx) => {
  const lastFired = new Map<string, number>()
  const throttle = ctx.options.errorThrottleMs ?? 1000

  const handler = (event: ErrorEvent) => {
    const target = event.target as (EventTarget & { src?: string, tagName?: string }) | null
    if (target && target !== (window as unknown as EventTarget) && target.tagName)
      return

    const message = event.message || messageOf(event.error)
    const key = `${message}|${event.filename ?? ''}|${event.lineno ?? 0}`
    const nowTs = Date.now()
    if (nowTs - (lastFired.get(key) ?? 0) < throttle)
      return
    lastFired.set(key, nowTs)

    ctx.push({
      rangeType: 'WINDOW_ERROR',
      type: 'ERROR',
      happenTime: nowTs,
      title: truncate(message, 300),
      content: stackOf(event.error) ?? `${event.filename ?? ''}:${event.lineno ?? 0}:${event.colno ?? 0}`,
      page: currentPage(),
      params: ctx.getSource(),
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        userAgent: navigator.userAgent,
      },
    })
  }

  window.addEventListener('error', handler, true)
  return () => window.removeEventListener('error', handler, true)
}

/** Promise 未处理拒绝 */
export const installPromiseCollector: CollectorInstaller = (ctx) => {
  const handler = (event: PromiseRejectionEvent) => {
    ctx.push({
      rangeType: 'PROMISE_ERROR',
      type: 'ERROR',
      happenTime: Date.now(),
      title: truncate(messageOf(event.reason), 300),
      content: stackOf(event.reason),
      page: currentPage(),
      params: ctx.getSource(),
      extra: { userAgent: navigator.userAgent },
    })
  }
  window.addEventListener('unhandledrejection', handler)
  return () => window.removeEventListener('unhandledrejection', handler)
}

interface XhrTracked extends XMLHttpRequest {
  __zaStart?: number
  __zaUrl?: string
  __zaMethod?: string
}

function isErrorStatus(status: number): boolean {
  return status === 0 || status >= 400
}

/** 接口请求：同时劫持 XMLHttpRequest 与 fetch */
export const installApiCollector: CollectorInstaller = (ctx) => {
  const ignore = [...(ctx.options.ignoreUrls ?? []), ctx.options.reportUrl]

  const record = (input: {
    url: string
    method: string
    status: number
    duration: number
    message?: string
    requestId?: string
    page: string
  }) => {
    if (matchesIgnore(input.url, ignore))
      return
    const failed = isErrorStatus(input.status)
    ctx.push({
      rangeType: 'API',
      type: failed ? 'ERROR' : 'INFO',
      happenTime: Date.now(),
      url: normalizeUrl(input.url),
      method: input.method,
      status: input.status,
      duration: Math.round(input.duration),
      requestId: input.requestId,
      title: failed ? truncate(input.message || `HTTP ${input.status}`, 300) : undefined,
      content: failed ? truncate(input.message, MAX_CONTENT) : undefined,
      page: input.page,
      params: ctx.getSource(),
    })
  }

  const OriginalXHR = window.XMLHttpRequest
  const originalOpen = OriginalXHR.prototype.open
  const originalSend = OriginalXHR.prototype.send

  OriginalXHR.prototype.open = function (this: XhrTracked, method: string, url: string | URL, ...rest: unknown[]) {
    this.__zaMethod = String(method).toUpperCase()
    this.__zaUrl = typeof url === 'string' ? url : url.toString()
    return (originalOpen as (...args: unknown[]) => unknown).apply(this, [method, url, ...rest]) as void
  }

  OriginalXHR.prototype.send = function (this: XhrTracked, body?: Document | XMLHttpRequestBodyInit | null) {
    this.__zaStart = performance.now()
    const page = currentPage()
    this.addEventListener('loadend', () => {
      const start = this.__zaStart ?? performance.now()
      record({
        url: this.__zaUrl ?? '',
        method: this.__zaMethod ?? 'GET',
        status: this.status,
        duration: performance.now() - start,
        message: this.status === 0 ? '网络异常或请求被中断' : truncate(this.responseText, 500),
        requestId: this.getResponseHeader?.('x-request-id') ?? undefined,
        page,
      })
    })
    return originalSend.call(this, body)
  }

  const originalFetch = window.fetch
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET')).toUpperCase()
    const page = currentPage()
    const start = performance.now()
    try {
      const response = await originalFetch.call(window, input as RequestInfo, init)
      record({
        url,
        method,
        status: response.status,
        duration: performance.now() - start,
        requestId: response.headers?.get?.('x-request-id') ?? undefined,
        page,
      })
      return response
    }
    catch (error) {
      record({
        url,
        method,
        status: 0,
        duration: performance.now() - start,
        message: messageOf(error),
        page,
      })
      throw error
    }
  }

  return () => {
    OriginalXHR.prototype.open = originalOpen
    OriginalXHR.prototype.send = originalSend
    window.fetch = originalFetch
  }
}

function paintEntries(): Record<string, number> {
  const result: Record<string, number> = {}
  try {
    for (const entry of performance.getEntriesByType('paint')) {
      if (entry.name === 'first-paint')
        result.fp = Math.round(entry.startTime)
      if (entry.name === 'first-contentful-paint')
        result.fcp = Math.round(entry.startTime)
    }
  }
  catch { /* ignore */ }
  return result
}

/** 页面性能：Navigation Timing 二级时间戳换算为各阶段耗时 */
export const installPerformanceCollector: CollectorInstaller = (ctx) => {
  let fired = false

  const collect = () => {
    if (fired)
      return
    fired = true
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (!nav)
      return
    const stages: Record<string, number> = {
      dns: Math.max(0, Math.round(nav.domainLookupEnd - nav.domainLookupStart)),
      tcp: Math.max(0, Math.round(nav.connectEnd - nav.connectStart)),
      ttfb: Math.max(0, Math.round(nav.responseStart - nav.requestStart)),
      download: Math.max(0, Math.round(nav.responseEnd - nav.responseStart)),
      dcl: Math.max(0, Math.round(nav.domContentLoadedEventEnd - nav.startTime)),
      load: Math.max(0, Math.round(nav.loadEventEnd - nav.startTime)),
      ...paintEntries(),
    }
    ctx.push({
      rangeType: 'PERFORMANCE',
      type: 'INFO',
      happenTime: Date.now(),
      title: '页面性能',
      page: nav.name ? normalizeUrl(nav.name) : currentPage(),
      params: ctx.getSource(),
      duration: stages.load,
      extra: { stages, transferKB: nav.transferSize ? Math.round(nav.transferSize / 1024) : 0 },
    })
  }

  if (document.readyState === 'complete')
    setTimeout(collect, 0)
  else
    window.addEventListener('load', () => setTimeout(collect, 0), { once: true })

  return () => { /* 一次性采集，无需清理 */ }
}

/** 资源加载汇总：按窗口聚合后一次性上报，避免每个资源一条日志 */
export const installResourceCollector: CollectorInstaller = (ctx) => {
  const ignore = [...(ctx.options.ignoreUrls ?? []), ctx.options.reportUrl]
  let items: Array<{ name: string, duration: number, size: number }> = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  const flush = () => {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    if (!items.length)
      return
    const payload = items
    items = []
    const totalKB = Math.round(payload.reduce((sum, item) => sum + item.size, 0) / 1024)
    ctx.push({
      rangeType: 'RESOURCE_PER',
      type: 'INFO',
      happenTime: Date.now(),
      title: '资源加载汇总',
      page: currentPage(),
      params: ctx.getSource(),
      extra: {
        count: payload.length,
        totalKB,
        resources: [...payload].sort((a, b) => b.duration - a.duration).slice(0, 20),
      },
    })
  }

  const schedule = () => {
    if (flushTimer)
      return
    flushTimer = setTimeout(flush, 3000)
    if (typeof flushTimer === 'object' && 'unref' in flushTimer)
      (flushTimer as { unref?: () => void }).unref?.()
  }

  let observer: PerformanceObserver | null = null
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        if (matchesIgnore(entry.name, ignore))
          continue
        items.push({
          name: normalizeUrl(entry.name),
          duration: Math.round(entry.duration),
          size: entry.transferSize ?? 0,
        })
      }
      if (items.length >= 50)
        flush()
      else
        schedule()
    })
    observer.observe({ type: 'resource', buffered: true })
  }
  catch {
    observer = null
  }

  window.addEventListener('load', () => setTimeout(flush, 500), { once: true })

  return () => {
    observer?.disconnect()
    if (flushTimer)
      clearTimeout(flushTimer)
  }
}

/** 用户点击：capture 阶段监听，取最近的可读文案作为聚合维度 */
export const installClickCollector: CollectorInstaller = (ctx) => {
  const handler = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    ctx.push({
      rangeType: 'USER_CLICK',
      type: 'INFO',
      happenTime: Date.now(),
      title: findClickLabel(target),
      page: currentPage(),
      params: ctx.getSource(),
      extra: {
        selector: cssPath(target),
        x: event.clientX,
        y: event.clientY,
      },
    })
  }
  document.addEventListener('click', handler, true)
  return () => document.removeEventListener('click', handler, true)
}

/** 路由变化：劫持 history + popstate/hashchange，记录来源页以支撑路径流转分析 */
export const installRouteCollector: CollectorInstaller = (ctx) => {
  let lastPage = currentPage()

  const emit = () => {
    const page = currentPage()
    if (page === lastPage)
      return
    const from = lastPage
    lastPage = page
    ctx.push({
      rangeType: 'USER_ROUTE',
      type: 'INFO',
      happenTime: Date.now(),
      title: '进入页面',
      page,
      params: ctx.getSource(),
      extra: { from },
    })
  }

  const emitInitial = () => {
    ctx.push({
      rangeType: 'USER_ROUTE',
      type: 'INFO',
      happenTime: Date.now(),
      title: '进入页面',
      page: lastPage,
      params: ctx.getSource(),
      extra: { from: document.referrer ? normalizeUrl(document.referrer) : '' },
    })
  }

  const originalPush = history.pushState.bind(history)
  const originalReplace = history.replaceState.bind(history)
  history.pushState = (...args: Parameters<typeof history.pushState>) => {
    originalPush(...args)
    emit()
  }
  history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
    originalReplace(...args)
    emit()
  }
  window.addEventListener('popstate', emit)
  window.addEventListener('hashchange', emit)
  emitInitial()

  return () => {
    history.pushState = originalPush
    history.replaceState = originalReplace
    window.removeEventListener('popstate', emit)
    window.removeEventListener('hashchange', emit)
  }
}

export const COLLECTORS = {
  error: installErrorCollector,
  promise: installPromiseCollector,
  api: installApiCollector,
  performance: installPerformanceCollector,
  resource: installResourceCollector,
  click: installClickCollector,
  route: installRouteCollector,
} as const satisfies Record<string, CollectorInstaller>

export function isCollectorEnabled(options: MonitorOptions, name: keyof typeof COLLECTORS): boolean {
  return !(options.disabled ?? []).includes(name)
}