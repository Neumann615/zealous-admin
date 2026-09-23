import { BACKEND, E2E_ALERT_APP, SINK } from './helpers/config'
import { expect, selectApp, settle, test } from './helpers/fixtures'
import { login } from './helpers/seed'

interface HistoryRow {
  id: number
  ruleId: string
  title: string
  cooldownHit: number
  retryCount: number
  channels: Array<{ type: string, ok: boolean }>
}

interface SinkItem {
  path: string
  body: string
}

/**
 * 预警链路专用应用：固定 appId，create-or-update 幂等。
 * 与种子应用 za-e2e 完全隔离 —— 本用例会灌入额外的 API_ERROR 日志并产生预警记录，
 * 混用会让接口分析的行数对账和预警记录空态断言全部失真。
 */
async function ensureAlertApp(auth: Record<string, string>): Promise<void> {
  const list = await fetch(`${BACKEND}/monitor/apps`, { headers: auth })
    .then(r => r.json()) as { data: Array<{ appId: string }> }
  const url = list.data.some(app => app.appId === E2E_ALERT_APP.appId)
    ? `${BACKEND}/monitor/apps/update`
    : `${BACKEND}/monitor/apps/create`
  const res = await fetch(url, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      appId: E2E_ALERT_APP.appId,
      appName: E2E_ALERT_APP.appName,
      type: E2E_ALERT_APP.type,
      content: E2E_ALERT_APP.content,
      operatingState: 1,
      props: {
        // 关掉队列走同步写库：collect 返回后窗口查询立刻能读到这条日志，realtime 评估才不会扑空
        enableQueue: false,
        consume: { enabled: true },
        alert: {
          enabled: true,
          cooldownMinutes: 5,
          channels: [{ type: 'webhook', enabled: true, url: `${SINK}/fail` }],
          rules: [{ id: 'API_ERROR', realtime: { enabled: true, windowMinutes: 30, minCount: 1 } }],
        },
      },
    }),
  }).then(r => r.json()) as { code: number, message: string }
  expect(res.code, `准备预警应用失败：${res.message}`).toBe(200)
}

async function fetchHistory(token: string, trigger: string): Promise<HistoryRow[]> {
  const now = Date.now()
  const qs = new URLSearchParams({
    appId: E2E_ALERT_APP.appId,
    startTime: String(now - 60 * 60 * 1000),
    endTime: String(now + 60_000),
    pageSize: '50',
  })
  const res = await fetch(`${BACKEND}/monitor/alerts/history?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json()) as { data?: { list?: HistoryRow[] } }
  return (res.data?.list ?? []).filter(row => row.title.includes(trigger))
}

async function fetchSink(): Promise<SinkItem[]> {
  return fetch(`${SINK}/received`).then(r => r.json()) as Promise<SinkItem[]>
}

async function until<T>(probe: () => Promise<T>, ready: (value: T) => boolean, timeoutMs = 30_000): Promise<T> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await probe()
    if (ready(value))
      return value
    if (Date.now() > deadline)
      throw new Error(`等待条件超时（${timeoutMs}ms）`)
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

test.describe('监控中心 · 预警链路', () => {
  test('realtime 命中 → 通知失败 → UI 改通道 → 重发成功 → 冷却只累加不重发', async ({ page, diag }) => {
    test.setTimeout(180_000)
    const token = await login()
    const auth = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    const trigger = `/e2e/alert-${Date.now()}`

    await fetch(`${SINK}/reset`, { method: 'POST' })
    await ensureAlertApp(auth)

    const postTrigger = () => fetch(`${BACKEND}/monitor/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: E2E_ALERT_APP.appId,
        logId: `e2e-alert-${Date.now()}`,
        logs: [{
          rangeType: 'API',
          type: 'ERROR',
          happenTime: Date.now(),
          url: trigger,
          method: 'GET',
          status: 500,
          duration: 80,
          page: '/monitor/log',
          params: 'za-e2e-alert',
          title: 'Internal Server Error',
        }],
      }),
    }).then(r => r.json()) as Promise<{ data: { accepted: number } }>

    try {
      expect((await postTrigger()).data.accepted).toBe(1)

      const failed = await until(() => fetchHistory(token, trigger), rows => rows.length > 0)
      expect(failed[0].channels[0].ok, 'sink /fail 返回 500，应记为通知失败').toBe(false)
      expect(failed[0].retryCount).toBe(0)

      const received = await fetchSink()
      expect(received.some(item => item.path === '/fail' && item.body.includes(trigger)), 'sink 应收到预警 payload').toBe(true)

      // UI 上把通道地址改到 /ok 并保存
      await page.goto('/monitor/analysis/alert-history')
      await selectApp(page, E2E_ALERT_APP.appName)
      await settle(page)
      await page.getByRole('button', { name: '预警配置' }).click()
      const modal = page.locator('.ant-modal').filter({ hasText: '预警配置' })
      await expect(modal).toBeVisible()
      await modal.getByPlaceholder('通用 Webhook 地址（POST JSON）').fill(`${SINK}/ok`)
      await modal.getByRole('button', { name: /保\s*存/ }).click()
      await expect(modal).toHaveCount(0)

      // 重发：只重投失败通道，retryCount+1 且通知转成功
      const row = page.locator('.ant-table-row', { hasText: trigger })
      await expect(row).toBeVisible()
      await row.getByRole('button', { name: /重\s*发/ }).click()
      const retried = await until(() => fetchHistory(token, trigger), rows => rows.length > 0 && rows[0].retryCount >= 1)
      expect(retried[0].channels[0].ok, '改到 /ok 后重发应成功').toBe(true)
      expect((await fetchSink()).filter(item => item.path === '/ok').length).toBeGreaterThan(0)
      await expect(row.locator('.ant-tag-success').first(), '通知结果应转为成功态').toBeVisible()

      // 冷却：过了 realtime 15s 节流再灌同维度日志，只累加 cooldownHit，不再外发
      await page.waitForTimeout(16_000)
      await postTrigger()
      await until(() => fetchHistory(token, trigger), rows => rows.some(item => item.cooldownHit >= 1))
      expect((await fetchSink()).filter(item => item.path === '/ok').length, '冷却命中不应再次外发').toBe(1)

      await expect(diag.pageErrors).toEqual([])
    }
    finally {
      // 只关预警，不删应用（固定 appId 下次跑继续复用）；否则后台 agg 巡检会拿着旧通道继续外发
      await fetch(`${BACKEND}/monitor/apps/update`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ appId: E2E_ALERT_APP.appId, props: { alert: null } }),
      })
    }
  })
})