import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { test as base, expect } from '@playwright/test'
import { E2E_APP, EXPECTED_FILE, SCREENSHOT_DIR } from './config'

/** globalSetup 落盘的后端真实返回值，UI 断言直接与之对账 */
export interface ExpectedStats {
  generatedAt: number
  workbench: {
    overall: { pv: number, uv: number, clicks: number, jsError: { count: number, rate: number, users: number } }
    topPages: Array<{ page: string, pv: number }>
    topErrors: Array<{ title: string, count: number }>
  }
  perf: { overall: { pages: number, samples: number }, pages: Array<{ page: string, samples: number }> }
  api: { apis: Array<{ url: string, count: number, slowCount: number, errorCount: number }> }
  behavior: {
    overall: { pv: number, uv: number | null, clicks: number, paths: number }
    pageviews: Array<{ page: string, pv: number }>
    topClicks: Array<{ label: string, count: number }>
  }
  behaviorPartner: { overall: { pv: number, clicks: number } }
  error: { total: { count: number, rate: number, users: number }, top: Array<{ title: string, count: number }> }
  bizError: { total: { count: number, rate: number, denominator: number } }
  logs: { total: number }
}

export interface Diagnostics {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
}

/** 已知无害噪声：ResizeObserver 在 antd + echarts 组合下偶发，不代表页面坏了 */
const NOISE = [
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  // rolldown-vite 运行中发现新依赖会重新预构建，旧 URL 返回 504，属 dev server 噪音
  /Outdated Optimize Dep/i,
  /node_modules\/\.vite\/deps/,
  // 布局头像走外网 dicebear，内网/离线环境必然超时，与被测模块无关
  /dicebear\.com/,
  /\[monitor\] SDK 初始化失败/,
]

export const LOGSTREAM_STORAGE_KEYS = [
  'za-monitor-log-query',
  'za-monitor-log-panel-width',
  'za-monitor-log-collapsed',
]

const BOOT_LOADER = '#app-loading'

/** index.html 的启动遮罩整页覆盖（z-index 99999），导航后必须等它自行移除，否则点击被拦、截图带遮罩 */
export async function waitBootLoaderGone(page: Page): Promise<void> {
  await page.locator(BOOT_LOADER).waitFor({ state: 'detached', timeout: 60_000 }).catch(() => {})
}

export const test = base.extend<{ diag: Diagnostics, expected: ExpectedStats }>({
  /** rolldown-vite 下 antd/echarts 首次访问才现场编译，整页导航还会重放启动遮罩；统一在 goto 后等遮罩消失 */
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page)
    page.goto = async (url, options) => {
      const response = await originalGoto(url, options)
      await waitBootLoaderGone(page)
      return response
    }
    await use(page)
  },
  expected: async ({}, use) => {
    await use(JSON.parse(readFileSync(EXPECTED_FILE, 'utf8')) as ExpectedStats)
  },
  diag: async ({ page }, use) => {
    const diag: Diagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [] }
    page.on('console', (msg) => {
      if (msg.type() !== 'error')
        return
      const text = msg.text()
      // 「Failed to load resource」不带地址，补上 location 才能定位是哪个资源挂了
      const url = msg.location()?.url
      if (NOISE.some(pattern => pattern.test(text) || (url !== undefined && pattern.test(url))))
        return
      diag.consoleErrors.push(url && !text.includes(url) ? `${text} @ ${url}` : text)
    })
    page.on('requestfailed', (req) => {
      const reason = req.failure()?.errorText ?? ''
      // 导航/关页取消的请求不算失败
      if (reason === 'net::ERR_ABORTED')
        return
      const url = req.url()
      if (NOISE.some(pattern => pattern.test(url)))
        return
      diag.failedRequests.push(`${reason} ${url}`)
    })
    page.on('pageerror', error => diag.pageErrors.push(String(error)))
    page.on('response', (res) => {
      if (res.status() >= 400 && res.url().includes('/monitor/'))
        diag.failedRequests.push(`${res.status()} ${res.url()}`)
    })
    await use(diag)
  },
})

export { expect }

/** 统计页/工作台默认选第一个应用，测试统一切到 E2E 专用应用 */
export async function selectApp(page: Page, appName: string = E2E_APP.appName): Promise<void> {
  await page.locator('.ant-select').first().click()
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: appName }).first().click()
  await expectDropdownClosed(page)
}

/** antd Select 通用选项点击（时间档位、预警类型等） */
export async function pickOption(page: Page, optionText: string): Promise<void> {
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: optionText }).first().click()
  await expectDropdownClosed(page)
}

/** antd v6 Segmented 的原生 radio 是隐藏 input，交互要点 label 本身 */
export function segmented(page: Page, option: string) {
  return page.locator('.ant-segmented-item-label', { hasText: option }).first()
}

/** antd v6 下拉收起有过渡动画，不等它走完截图会拍到半开的浮层 */
export async function expectDropdownClosed(page: Page): Promise<void> {
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0)
}

export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {})
  await expect(page.locator('.ant-spin-spinning').first()).toBeHidden({ timeout: 20_000 })
}

export async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: true })
}

/** StatCards 结构固定：label 的下一个兄弟是 body，body > div > div 即数值 */
export function statValue(page: Page, label: string) {
  return page.locator(`xpath=//div[normalize-space()="${label}"]/following-sibling::div[1]/div[1]/div[1]`).first()
}

/** PanelBlock 渲染为 <section><header><h3>标题</h3></header>…；按标题定位区块，避免同页多张表串行 */
export function panel(page: Page, title: string) {
  return page.locator('section').filter({ has: page.locator('h3', { hasText: title }) })
}

export async function expectStat(page: Page, label: string, value: string | number): Promise<void> {
  await expect(statValue(page, label), `指标卡「${label}」`).toHaveText(String(value))
}

/** 文案被 ellipsis 截断时 scrollWidth 会大于 clientWidth；守住 Segmented/Tag 这类窄容器里的可读性 */
export async function expectNoEllipsis(page: Page, selector: string): Promise<void> {
  const truncated = await page.locator(selector).evaluateAll(elements => elements
    .filter(el => el.scrollWidth > el.clientWidth + 1)
    .map(el => el.textContent?.trim() ?? ''))
  expect(truncated, `以下文案被截断：${truncated.join('、')}`).toEqual([])
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, '页面出现横向滚动条').toBeLessThanOrEqual(1)
}

export async function expectClean(diag: Diagnostics): Promise<void> {
  expect(diag.pageErrors, '页面抛出未捕获异常').toEqual([])
  expect(diag.consoleErrors, '控制台报错').toEqual([])
  expect(diag.failedRequests, '监控接口返回 4xx/5xx').toEqual([])
}

/** echarts 画的是 canvas，断言它真的画了东西（非全透明） */
export async function expectChartPainted(page: Page, index = 0): Promise<void> {
  const canvas = page.locator('canvas').nth(index)
  await expect(canvas).toBeVisible()
  const painted = await canvas.evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext('2d')
    if (!ctx || el.width === 0 || el.height === 0)
      return false
    const { data } = ctx.getImageData(0, 0, el.width, el.height)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0)
        return true
    }
    return false
  })
  expect(painted, `第 ${index} 个图表没有绘制任何像素`).toBe(true)
}

export function clearLogStreamState(page: Page): Promise<void> {
  return page.evaluate((keys) => {
    for (const key of keys)
      window.localStorage.removeItem(key)
  }, LOGSTREAM_STORAGE_KEYS)
}