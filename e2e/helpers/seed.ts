import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
/**
 * 确定性数据种子：
 * 1. 清空 za-e2e / za-e2e-alert 的历史数据（只动测试应用，不碰真实数据）
 * 2. 用固定内容 + 相对当前时间的时间戳灌入各类埋点
 * 3. 等队列落库后，把六个统计接口的真实返回值写成 expected.json
 *    —— UI 断言直接和后端对账，避免在测试里硬编码魔法数字
 */
import { DatabaseSync } from 'node:sqlite'
import {
  API_URLS,
  BACKEND,
  BIZ_OP_TITLES,
  CLICK_LABELS,
  E2E_ALERT_APP,
  E2E_APP,
  EXPECTED_FILE,
  JS_ERROR_TITLES,
  LOGIN,
  PAGES,
  SEED_WINDOW_MS,
  USERS,
} from './config'

type LogInput = Record<string, unknown>

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'service/data/sqlite.db')

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 后端持有连接，这里用 busy_timeout + 重试避免 SQLITE_BUSY */
function purgeE2EData(): void {
  for (let attempt = 0; attempt < 6; attempt++) {
    let db: DatabaseSync | null = null
    try {
      db = new DatabaseSync(DB_PATH)
      db.exec('PRAGMA busy_timeout = 5000')
      for (const appId of [E2E_APP.appId, E2E_ALERT_APP.appId]) {
        db.prepare('DELETE FROM za_monitor_log WHERE app_id = ?').run(appId)
        db.prepare('DELETE FROM za_monitor_alert_history WHERE app_id = ?').run(appId)
      }
      db.close()
      return
    }
    catch (error) {
      try {
        db?.close()
      }
      catch { /* ignore */ }
      if (attempt === 5)
        throw error
    }
  }
}

export async function login(): Promise<string> {
  const res = await fetch(`${BACKEND}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LOGIN),
  }).then(r => r.json()) as { code: number, message: string, data: { token: string } }
  if (res.code !== 200)
    throw new Error(`登录失败：${res.message}`)
  return res.data.token
}

/** 幂等确保测试应用存在且已开通日志消费 */
export async function ensureApp(token: string): Promise<void> {
  const H = { 'Authorization': token, 'Content-Type': 'application/json' }
  const list = await fetch(`${BACKEND}/monitor/apps`, { headers: H }).then(r => r.json()) as { data: Array<{ appId: string, props: Record<string, unknown> }> }
  const existing = list.data.find(app => app.appId === E2E_APP.appId)
  const props = {
    ...(existing?.props ?? {}),
    enableQueue: true,
    maxSize: 5000,
    batchSize: 50,
    flushInterval: 500,
    retryAttempts: 2,
    retryDelay: 500,
    consume: { enabled: true },
    alert: null,
  }
  const url = existing ? `${BACKEND}/monitor/apps/update` : `${BACKEND}/monitor/apps/create`
  const res = await fetch(url, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ appId: E2E_APP.appId, appName: E2E_APP.appName, type: E2E_APP.type, content: E2E_APP.content, operatingState: 1, props }),
  }).then(r => r.json()) as { code: number, message: string }
  if (res.code !== 200)
    throw new Error(`准备测试应用失败：${res.message}`)
}

/** 固定内容 + 相对时间戳，保证每次跑出来的聚合结果完全一致 */
export function buildSeedLogs(): LogInput[] {
  const now = Date.now()
  const at = (ratio: number) => Math.round(now - SEED_WINDOW_MS * ratio)
  const user = (i: number) => USERS[i % USERS.length]
  const logs: LogInput[] = []

  for (let i = 0; i < 60; i++) {
    logs.push({
      rangeType: 'USER_ROUTE',
      type: 'INFO',
      happenTime: at(0.95 - (i / 60) * 0.9),
      page: PAGES[i % PAGES.length],
      uid: user(i).uid,
      nickname: user(i).nickname,
      title: '进入页面',
      params: i < 54 ? 'za-e2e' : 'partner-sys',
      extra: { from: PAGES[(i + 1) % PAGES.length] },
    })
  }

  for (let i = 0; i < 45; i++) {
    logs.push({
      rangeType: 'USER_CLICK',
      type: 'INFO',
      happenTime: at(0.9 - (i / 45) * 0.85),
      page: PAGES[i % PAGES.length],
      uid: user(i).uid,
      nickname: user(i).nickname,
      title: CLICK_LABELS[i % CLICK_LABELS.length],
      params: 'za-e2e',
      extra: { selector: `body > div:nth-of-type(${(i % 4) + 1}) > button`, x: 120 + i, y: 240 + i },
    })
  }

  for (let i = 0; i < 48; i++) {
    const failed = i % 8 === 0
    const slow = i % 4 === 0
    logs.push({
      rangeType: 'API',
      type: failed ? 'ERROR' : 'INFO',
      happenTime: at(0.92 - (i / 48) * 0.88),
      url: API_URLS[i % API_URLS.length],
      method: i % 3 === 0 ? 'POST' : 'GET',
      status: failed ? 500 : 200,
      duration: slow ? 1200 + (i % 7) * 100 : 120 + (i % 9) * 40,
      page: PAGES[i % PAGES.length],
      uid: user(i).uid,
      nickname: user(i).nickname,
      title: failed ? 'Internal Server Error' : undefined,
      content: failed ? '{"code":500,"message":"模拟接口异常"}' : undefined,
      params: 'za-e2e',
      requestId: `e2e-req-${i}`,
    })
  }

  for (let i = 0; i < 18; i++) {
    const base = 100 + (i % 6) * 60
    logs.push({
      rangeType: 'PERFORMANCE',
      type: 'INFO',
      happenTime: at(0.8 - (i / 18) * 0.6),
      page: PAGES[i % PAGES.length],
      uid: user(i).uid,
      nickname: user(i).nickname,
      title: '页面性能',
      params: 'za-e2e',
      extra: {
        stages: {
          dns: base / 10,
          tcp: base / 5,
          ttfb: base,
          download: base / 3,
          dcl: base * 3,
          load: base * 6,
          fp: base * 2,
          fcp: base * 2 + 30,
        },
      },
    })
    logs.push({
      rangeType: 'RESOURCE_PER',
      type: 'INFO',
      happenTime: at(0.8 - (i / 18) * 0.6),
      page: PAGES[i % PAGES.length],
      uid: user(i).uid,
      nickname: user(i).nickname,
      title: '资源加载汇总',
      params: 'za-e2e',
      extra: {
        count: 30 + (i % 5) * 8,
        totalKB: 800 + (i % 7) * 350,
        resources: [
          { name: `/js/vendor-${i % 3}.js`, duration: 900 + (i % 5) * 120, size: 240_000 },
          { name: `/js/page-${i % 6}.js`, duration: 300 + (i % 4) * 90, size: 60_000 },
        ],
      },
    })
  }

  for (let i = 0; i < 8; i++) {
    logs.push({
      rangeType: 'WINDOW_ERROR',
      type: 'ERROR',
      happenTime: at(0.7 - (i / 8) * 0.5),
      page: PAGES[i % PAGES.length],
      uid: user(i).uid,
      nickname: user(i).nickname,
      title: JS_ERROR_TITLES[i % JS_ERROR_TITLES.length],
      content: `${JS_ERROR_TITLES[i % JS_ERROR_TITLES.length]}\n    at render (page-${i % 6}.js:12:${i})`,
      params: 'za-e2e',
      extra: { filename: `/js/page-${i % 6}.js`, lineno: 12, colno: i },
    })
  }

  for (let i = 0; i < 4; i++) {
    logs.push({
      rangeType: 'PROMISE_ERROR',
      type: 'ERROR',
      happenTime: at(0.6 - (i / 4) * 0.4),
      page: PAGES[i % PAGES.length],
      uid: user(i).uid,
      nickname: user(i).nickname,
      title: JS_ERROR_TITLES[2],
      content: 'AxiosError: timeout of 5000ms exceeded',
      params: 'za-e2e',
    })
  }

  for (let i = 0; i < 12; i++) {
    const failed = i % 3 === 0
    logs.push({
      rangeType: 'PROACTIVE_REPORTING',
      type: failed ? 'ERROR' : 'INFO',
      happenTime: at(0.5 - (i / 12) * 0.4),
      page: PAGES[i % PAGES.length],
      uid: user(i).uid,
      nickname: user(i).nickname,
      title: BIZ_OP_TITLES[i % BIZ_OP_TITLES.length],
      content: failed ? '字段校验失败：名称不能为空' : undefined,
      params: 'za-e2e',
    })
  }

  return logs
}

export async function postSeedLogs(logs: LogInput[]): Promise<number> {
  let accepted = 0
  for (let i = 0; i < logs.length; i += 90) {
    const chunk = logs.slice(i, i + 90)
    const res = await fetch(`${BACKEND}/monitor/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: E2E_APP.appId, logs: chunk }),
    }).then(r => r.json()) as { code: number, message: string, data: { accepted: number } }
    if (res.code !== 200)
      throw new Error(`灌数据失败：${res.message}`)
    accepted += res.data.accepted
  }
  return accepted
}

/** 队列是异步落库的，轮询到条数对上为止 */
export async function waitForPersisted(token: string, expected: number): Promise<number> {
  const H = { Authorization: token }
  const now = Date.now()
  const qs = new URLSearchParams({
    appId: E2E_APP.appId,
    startTime: String(now - 60 * 60 * 1000),
    endTime: String(now + 60_000),
    pageNum: '1',
    pageSize: '1',
  })
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`${BACKEND}/monitor/logs?${qs}`, { headers: H }).then(r => r.json()) as { data: { total: number } }
    if (res.data.total >= expected)
      return res.data.total
    await sleep(500)
  }
  throw new Error(`等待落库超时，期望 ${expected} 条`)
}

async function fetchJson(url: string, token: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Authorization: token } }).then(r => r.json()) as { code: number, message: string, data: unknown }
  if (res.code !== 200)
    throw new Error(`${url} 失败：${res.message}`)
  return res.data
}

/** 把六个统计接口 + 日志接口的真实返回值落盘，UI 测试直接对账 */
export async function writeExpected(token: string): Promise<void> {
  const now = Date.now()
  const hour = new URLSearchParams({ appId: E2E_APP.appId, startTime: String(now - 60 * 60 * 1000), endTime: String(now + 60_000) })
  const partner = new URLSearchParams({ appId: E2E_APP.appId, startTime: String(now - 60 * 60 * 1000), endTime: String(now + 60_000), source: 'partner-sys' })

  const expected = {
    generatedAt: now,
    workbench: await fetchJson(`${BACKEND}/monitor/stats/workbench?${new URLSearchParams({ appId: E2E_APP.appId })}`, token),
    perf: await fetchJson(`${BACKEND}/monitor/stats/perf?${hour}`, token),
    api: await fetchJson(`${BACKEND}/monitor/stats/api?${hour}`, token),
    behavior: await fetchJson(`${BACKEND}/monitor/stats/behavior?${hour}`, token),
    behaviorPartner: await fetchJson(`${BACKEND}/monitor/stats/behavior?${partner}`, token),
    error: await fetchJson(`${BACKEND}/monitor/stats/error?${hour}`, token),
    bizError: await fetchJson(`${BACKEND}/monitor/stats/biz-error?${hour}`, token),
    logs: await fetchJson(`${BACKEND}/monitor/logs?${hour}&pageNum=1&pageSize=20`, token),
  }

  mkdirSync(path.dirname(EXPECTED_FILE), { recursive: true })
  writeFileSync(EXPECTED_FILE, `${JSON.stringify(expected, null, 2)}\n`, 'utf8')
}

export async function seed(): Promise<void> {
  purgeE2EData()
  const token = await login()
  await ensureApp(token)
  const logs = buildSeedLogs()
  const accepted = await postSeedLogs(logs)
  const total = await waitForPersisted(token, logs.length)
  await writeExpected(token)
  // eslint-disable-next-line no-console
  console.log(`[e2e seed] 灌入 ${accepted}/${logs.length} 条，落库 ${total} 条，期望值已写入 ${EXPECTED_FILE}`)
}