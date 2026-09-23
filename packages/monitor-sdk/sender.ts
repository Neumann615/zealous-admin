import type { MonitorLog, MonitorOptions } from './types'
import { createBatchId } from './utils'

interface SenderHooks {
  /** 每条日志入队前补全公共字段 */
  decorate: (log: MonitorLog) => MonitorLog
  /** 采样判定 */
  shouldSample: () => boolean
}

interface BeaconLike {
  (url: string, data?: unknown): boolean
}

/**
 * 上报发送器：缓冲 + 定时/定量批量 + 页面隐藏时 sendBeacon 兜底。
 * 失败不重试落盘（浏览器场景无持久化必要），仅丢弃并计数，避免雪崩。
 */
export function createSender(options: MonitorOptions, hooks: SenderHooks) {
  let buffer: MonitorLog[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  let destroyed = false
  let dropped = 0

  const maxBuffer = options.maxBuffer ?? 200

  function scheduleFlush(): void {
    if (timer || destroyed)
      return
    timer = setTimeout(() => {
      timer = null
      flush()
    }, options.flushInterval ?? 5000)
    if (typeof timer === 'object' && 'unref' in timer)
      (timer as { unref?: () => void }).unref?.()
  }

  function send(logs: MonitorLog[], useBeacon: boolean): void {
    if (!logs.length)
      return
    const logId = createBatchId(options.appId)
    const body = JSON.stringify({
      appId: options.appId,
      logId,
      logs: logs.map((log, index) => ({ ...log, logId, serial: index })),
    })

    if (useBeacon && typeof navigator !== 'undefined' && typeof (navigator as Navigator & { sendBeacon?: BeaconLike }).sendBeacon === 'function') {
      const ok = (navigator as Navigator & { sendBeacon: BeaconLike }).sendBeacon(
        options.reportUrl,
        new Blob([body], { type: 'application/json' }),
      )
      if (!ok)
        dropped += logs.length
      return
    }

    fetch(options.reportUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      mode: 'cors',
      credentials: 'omit',
    }).catch(() => {
      dropped += logs.length
    })
  }

  function flush(useBeacon = false): void {
    if (!buffer.length)
      return
    const batch = buffer
    buffer = []
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    // 单批上限 100 条，与后端 collectSchema 对齐，超出拆批
    for (let i = 0; i < batch.length; i += 100)
      send(batch.slice(i, i + 100), useBeacon)
  }

  function push(log: MonitorLog): void {
    if (destroyed)
      return
    if (!hooks.shouldSample())
      return
    buffer.push(hooks.decorate(log))
    if (buffer.length > maxBuffer) {
      dropped += buffer.length - maxBuffer
      buffer = buffer.slice(-maxBuffer)
    }
    if (buffer.length >= (options.batchSize ?? 10))
      flush()
    else
      scheduleFlush()
  }

  function onHidden(): void {
    if (document.visibilityState === 'hidden')
      flush(options.sendBeaconOnHide !== false)
  }

  function onPageHide(): void {
    flush(options.sendBeaconOnHide !== false)
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onPageHide)
  }

  return {
    push,
    flush: () => flush(false),
    getDropped: () => dropped,
    destroy(): void {
      destroyed = true
      flush(false)
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onHidden)
        window.removeEventListener('pagehide', onPageHide)
        window.removeEventListener('beforeunload', onPageHide)
      }
    },
  }
}