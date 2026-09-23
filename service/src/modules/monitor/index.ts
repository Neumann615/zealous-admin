import type { DatabaseSync } from 'node:sqlite'
import { ALERT_RETENTION_DAYS, LOG_RETENTION_DAYS } from './constants'
import { pruneAlertHistory, startAlertSweeper, stopAlertSweeper } from './alert'
import { allQueues } from './queue'
import { pruneLogs } from './service'
import { prepareMonitorSchema } from './schema'
import monitorRoutes from './routes'

/** 建表 + 种子应用，由 initDb 调用 */
export function prepareMonitor(db: DatabaseSync): void {
  prepareMonitorSchema(db)
}

let retentionTimer: NodeJS.Timeout | null = null

/** 启动后台任务：预警聚合巡检 + 保留期清理 */
export function startMonitorRuntime(): void {
  startAlertSweeper()
  if (retentionTimer)
    return
  const sweep = () => {
    try {
      const logs = pruneLogs(LOG_RETENTION_DAYS)
      const alerts = pruneAlertHistory(ALERT_RETENTION_DAYS)
      if (logs || alerts)
        console.log(`[monitor] 保留期清理：日志 ${logs} 条，预警记录 ${alerts} 条`)
    }
    catch (error) {
      console.error('[monitor] 保留期清理失败', error)
    }
  }
  sweep()
  retentionTimer = setInterval(sweep, 60 * 60 * 1000)
  retentionTimer.unref?.()
}

/** 进程退出前把队列中的日志落库，避免丢数据 */
export function shutdownMonitor(): void {
  stopAlertSweeper()
  if (retentionTimer) {
    clearInterval(retentionTimer)
    retentionTimer = null
  }
  for (const queue of allQueues())
    queue.drain()
}

export default monitorRoutes