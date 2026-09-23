import type { CollectorContext } from './collectors'
import type {
  MonitorClient,
  MonitorOptions,
  MonitorUser,
  ReportInput,
} from './types'
import { COLLECTORS, isCollectorEnabled } from './collectors'
import { createSender } from './sender'
import { currentPage, getUid, messageOf, stackOf, truncate } from './utils'

export { COLLECTORS } from './collectors'
export type * from './types'

let activeClient: MonitorClient | null = null

function createClient(options: MonitorOptions): MonitorClient {
  const state = {
    uid: getUid(),
    nickname: undefined as string | undefined,
    source: options.source,
    commonExtra: { ...(options.commonExtra ?? {}) },
    sampleRate: options.sampleRate ?? 1,
  }

  const sender = createSender(options, {
    decorate: (log) => {
      const extra = { ...state.commonExtra, ...(log.extra ?? {}) }
      return {
        ...log,
        happenTime: log.happenTime ?? Date.now(),
        type: log.type ?? 'INFO',
        uid: log.uid ?? state.uid,
        nickname: log.nickname ?? state.nickname,
        page: log.page ?? currentPage(),
        params: log.params ?? state.source,
        extra: Object.keys(extra).length ? extra : undefined,
      }
    },
    shouldSample: () => state.sampleRate >= 1 || Math.random() < state.sampleRate,
  })

  const teardowns: Array<() => void> = []
  const ctx: CollectorContext = {
    push: log => sender.push(log),
    options,
    getSource: () => state.source,
  }
  for (const [name, install] of Object.entries(COLLECTORS)) {
    if (!isCollectorEnabled(options, name as keyof typeof COLLECTORS))
      continue
    try {
      teardowns.push(install(ctx))
    }
    catch (error) {
      // 单个采集器安装失败不应影响整体监控（例如旧浏览器缺 PerformanceObserver）
      console.warn(`[monitor-sdk] 采集器 ${name} 安装失败`, error)
    }
  }

  const client: MonitorClient = {
    report(input: ReportInput): void {
      sender.push({
        rangeType: 'PROACTIVE_REPORTING',
        type: input.type ?? 'INFO',
        happenTime: Date.now(),
        title: truncate(input.title, 300),
        content: truncate(input.content, 4000),
        params: input.params ?? state.source,
        page: input.page ?? currentPage(),
        extra: input.extra,
      })
    },
    captureError(error: unknown, context?: Record<string, unknown>): void {
      sender.push({
        rangeType: 'WINDOW_ERROR',
        type: 'ERROR',
        happenTime: Date.now(),
        title: truncate(messageOf(error), 300),
        content: stackOf(error),
        page: currentPage(),
        params: state.source,
        extra: context,
      })
    },
    setUser(user: MonitorUser): void {
      if (user.uid)
        state.uid = user.uid
      state.nickname = user.nickname
    },
    setCommonExtra(extra: Record<string, unknown>): void {
      state.commonExtra = { ...state.commonExtra, ...extra }
    },
    setSource(source: string): void {
      state.source = source
    },
    flush(): void {
      sender.flush()
    },
    destroy(): void {
      for (const teardown of teardowns) {
        try {
          teardown()
        }
        catch { /* ignore */ }
      }
      sender.destroy()
      if (activeClient === client)
        activeClient = null
    },
    getOptions(): Readonly<MonitorOptions> {
      return options
    },
  }

  return client
}

/**
 * 初始化监控采集。重复调用返回同一实例，需切换配置请先 destroy()。
 * @example
 * initMonitor({ appId: 'zealous-admin', reportUrl: 'http://localhost:3508/monitor/collect' })
 */
export function initMonitor(options: MonitorOptions): MonitorClient {
  if (activeClient)
    return activeClient
  activeClient = createClient(options)
  if (typeof window !== 'undefined')
    window.__ZA_MONITOR__ = activeClient
  return activeClient
}

export function getMonitor(): MonitorClient | undefined {
  return activeClient ?? (typeof window !== 'undefined' ? window.__ZA_MONITOR__ : undefined)
}

/** 便捷单例：未 initMonitor 时静默丢弃，业务代码无需判空 */
export const monitor = {
  report(input: ReportInput): void {
    getMonitor()?.report(input)
  },
  captureError(error: unknown, context?: Record<string, unknown>): void {
    getMonitor()?.captureError(error, context)
  },
  setUser(user: MonitorUser): void {
    getMonitor()?.setUser(user)
  },
  setCommonExtra(extra: Record<string, unknown>): void {
    getMonitor()?.setCommonExtra(extra)
  },
  setSource(source: string): void {
    getMonitor()?.setSource(source)
  },
  flush(): void {
    getMonitor()?.flush()
  },
}