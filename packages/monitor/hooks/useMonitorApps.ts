import type { MonitorApp } from '../contracts/monitor'
import { useCallback, useEffect, useState } from 'react'
import { getMonitorAppsAPI } from '../services/monitor'

export interface UseMonitorAppsOptions {
  /** 仅返回已开通日志消费（统计分析）的应用 */
  consumeOnly?: boolean
  /** 应用类型过滤 */
  type?: 'realTimeLog' | 'operationLog'
  /** 是否立即加载 */
  immediate?: boolean
}

export interface UseMonitorAppsResult {
  apps: MonitorApp[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

function matchApp(app: MonitorApp, options: UseMonitorAppsOptions): boolean {
  if (options.type && app.type !== options.type)
    return false
  if (app.operatingState !== 1)
    return false
  if (options.consumeOnly && app.props?.consume?.enabled !== true)
    return false
  return true
}

/** 应用下拉数据源：统计页与日志页共用，过滤逻辑集中在此 */
export function useMonitorApps(options: UseMonitorAppsOptions = {}): UseMonitorAppsResult {
  const { consumeOnly = true, type, immediate = true } = options
  const [apps, setApps] = useState<MonitorApp[]>([])
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getMonitorAppsAPI()
      setApps(list.filter(app => matchApp(app, { consumeOnly, type })))
      setError(null)
    }
    catch (e) {
      setError(e instanceof Error ? e.message : '获取应用数据失败')
      setApps([])
    }
    finally {
      setLoading(false)
    }
  }, [consumeOnly, type])

  useEffect(() => {
    if (immediate)
      reload()
  }, [immediate, reload])

  return { apps, loading, error, reload }
}