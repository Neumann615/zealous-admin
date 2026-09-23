import type { Page } from '@playwright/test'
import { E2E_APP, MONITOR_ROUTES } from './helpers/config'
import {
  expect,
  expectChartPainted,
  expectClean,
  expectNoEllipsis,
  expectNoHorizontalOverflow,
  expectStat,
  panel,
  screenshot,
  selectApp,
  settle,
  statValue,
  test,
} from './helpers/fixtures'

/** 与 packages/monitor/runtime/format.ts 的 formatNumber 口径一致 */
function num(value: number): string {
  return value.toLocaleString('zh-CN')
}

function sum(rows: Array<Record<string, number>>, key: string): number {
  return rows.reduce((total, row) => total + (row[key] ?? 0), 0)
}

/** 统计页统一入口：切到 E2E 应用后 FilterBar 会自动查询一次 */
async function openStatsPage(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await selectApp(page)
  await settle(page)
}

test.describe('监控中心 · 页面渲染与视觉核对', () => {
  test('九个页面都能渲染，无控制台报错、无横向溢出', async ({ page, diag }) => {
    // 九页连跑要焐热全部按需编译，冷缓存或机器被抢占时 90s 默认上限不够
    test.setTimeout(180_000)
    for (const route of MONITOR_ROUTES) {
      diag.consoleErrors.length = 0
      diag.pageErrors.length = 0
      diag.failedRequests.length = 0

      await page.goto(route.path)
      await settle(page)

      await expect(page.getByText(route.marker).first(), `${route.title} 没有渲染出标识区块`).toBeVisible()
      await expect(page.getByText('监控客户端未初始化')).toHaveCount(0)
      await expect(page.locator('.ant-result-error, .ant-empty-description', { hasText: '出错了' })).toHaveCount(0)

      await expectNoHorizontalOverflow(page)
      await screenshot(page, `00-${route.name}-zealous-admin`)
      await expectClean(diag)
    }
  })

  test('工作台：核心指标与后端返回值逐项对账', async ({ page, diag, expected }) => {
    await page.goto('/monitor/workbench')
    await expect(page.getByRole('heading', { name: '数据看板' })).toBeVisible()
    await selectApp(page)
    await settle(page)

    await expectStat(page, 'PV', num(expected.workbench.overall.pv))
    await expectStat(page, 'UV', num(expected.workbench.overall.uv))
    await expectStat(page, '点击数', num(expected.workbench.overall.clicks))
    await expectStat(page, 'JS 错误', num(expected.workbench.overall.jsError.count))
    await expectStat(page, '错误影响人数', num(expected.workbench.overall.jsError.users))

    await expectChartPainted(page)
    await expect(page.getByText('页面访问 Top')).toBeVisible()
    await expect(page.getByText('实时访问趋势')).toBeVisible()

    await expectNoHorizontalOverflow(page)
    await screenshot(page, '01-workbench')
    await expectClean(diag)
  })

  test('性能统计：样本数、页面数与总表行数一致', async ({ page, diag, expected }) => {
    await openStatsPage(page, '/monitor/analysis/perf')

    await expectStat(page, '覆盖页面', num(expected.perf.overall.pages))
    await expectStat(page, '样本数', num(expected.perf.overall.samples))
    await expect(statValue(page, '平均加载 load')).not.toHaveText('-')

    const rows = panel(page, '页面指标总表').locator('.ant-table-tbody tr.ant-table-row')
    await expect(rows).toHaveCount(expected.perf.pages.length)
    await expectChartPainted(page)

    await expectNoHorizontalOverflow(page)
    await screenshot(page, '02-perf')
    await expectClean(diag)
  })

  test('接口分析：四张指标卡等于明细表列的合计', async ({ page, diag, expected }) => {
    await openStatsPage(page, '/monitor/analysis/api')

    await expectStat(page, '接口数', num(expected.api.apis.length))
    await expectStat(page, '调用次数', num(sum(expected.api.apis, 'count')))
    await expectStat(page, '慢调用', num(sum(expected.api.apis, 'slowCount')))
    await expectStat(page, '报错', num(sum(expected.api.apis, 'errorCount')))

    const rows = panel(page, '接口明细').locator('.ant-table-tbody tr.ant-table-row')
    await expect(rows).toHaveCount(expected.api.apis.length)
    await expectChartPainted(page)

    await expectNoHorizontalOverflow(page)
    await screenshot(page, '03-api')
    await expectClean(diag)
  })

  test('行为分析：PV / 点击 / 路径 / 页面数逐项对账', async ({ page, diag, expected }) => {
    await openStatsPage(page, '/monitor/analysis/behavior')

    await expectStat(page, 'PV', num(expected.behavior.overall.pv))
    await expectStat(page, 'UV', num(expected.behavior.overall.uv ?? 0))
    await expectStat(page, '点击数', num(expected.behavior.overall.clicks))
    await expectStat(page, '路径流转数', num(expected.behavior.overall.paths))
    await expectStat(page, '页面数', num(expected.behavior.pageviews.length))

    await expect(page.getByText('热门点击 Top')).toBeVisible()
    await expect(page.getByText('路径流转 Top')).toBeVisible()
    await expectChartPainted(page)

    await expectNoHorizontalOverflow(page)
    await screenshot(page, '04-behavior')
    await expectClean(diag)
  })

  test('JS 错误分析：错误次数、错误率、聚合条目对账', async ({ page, diag, expected }) => {
    await openStatsPage(page, '/monitor/analysis/js-error')

    await expectStat(page, 'JS 错误次数', num(expected.error.total.count))
    await expectStat(page, '错误率', `${expected.error.total.rate}%`)
    await expectStat(page, '影响人数', num(expected.error.total.users))
    await expectStat(page, '聚合条目', num(expected.error.top.length))

    await expect(page.getByText('错误明细排行')).toBeVisible()
    await expect(page.getByText(expected.error.top[0].title).first()).toBeVisible()
    await expectChartPainted(page)

    await expectNoHorizontalOverflow(page)
    await screenshot(page, '05-js-error')
    await expectClean(diag)
  })

  test('业务错误分析：与 JS 错误分析口径不同（分母是主动上报总数）', async ({ page, diag, expected }) => {
    await openStatsPage(page, '/monitor/analysis/biz-error')

    await expectStat(page, '业务失败次数', num(expected.bizError.total.count))
    await expectStat(page, '失败率', `${expected.bizError.total.rate}%`)
    await expect(page.getByText(/失败率 = 失败操作数 \/ 同窗口主动上报操作总数/)).toBeVisible()

    await expectNoHorizontalOverflow(page)
    await screenshot(page, '06-biz-error')
    await expectClean(diag)
  })

  test('实时日志：总数与后端一致，卡片视图渲染批次', async ({ page, diag, expected }) => {
    await page.goto('/monitor/log')
    await selectApp(page)
    await settle(page)

    await expect(page.getByText(`共${expected.logs.total}`, { exact: false }).first()).toBeVisible()
    await expect(page.getByText('已加载', { exact: false }).first()).toBeVisible()
    await expect(page.locator('.ant-card').first()).toBeVisible()
    // 查询面板最窄时级别 Segmented 的 ERROR/DEBUG 曾被截成 ERR…/DEB…，用滚动宽度守住
    await expectNoEllipsis(page, '.ant-segmented-item-label')

    await expectNoHorizontalOverflow(page)
    await screenshot(page, '07-log-card')
    await expectClean(diag)
  })

  test('应用管理：测试应用与真实应用都在列表里，队列指标可读', async ({ page, diag }) => {
    await page.goto('/monitor/app')
    await settle(page)

    await expect(page.getByText(E2E_APP.appName).first()).toBeVisible()
    await expect(page.getByText('Zealous Admin').first()).toBeVisible()
    await expect(page.getByRole('button', { name: '创建应用' })).toBeVisible()

    await expectNoHorizontalOverflow(page)
    await screenshot(page, '08-app')
    await expectClean(diag)
  })

  test('预警记录：空态可读，筛选控件齐全', async ({ page, diag }) => {
    await page.goto('/monitor/analysis/alert-history')
    await selectApp(page)
    await settle(page)

    await expect(page.getByText('预警记录').first()).toBeVisible()
    // 「预警类型」等文案同时是表格列头，这里只认筛选栏里的那个
    await expect(page.locator('span', { hasText: '预警类型' }).first()).toBeVisible()
    await expect(page.locator('span', { hasText: '通知通道' }).first()).toBeVisible()
    await expect(page.locator('span', { hasText: '发送结果' }).first()).toBeVisible()

    await expectNoHorizontalOverflow(page)
    await screenshot(page, '09-alert-history')
    await expectClean(diag)
  })

  test('1280 宽度下不出现横向滚动（笔记本常见分辨率）', async ({ page, diag }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    for (const route of MONITOR_ROUTES) {
      await page.goto(route.path)
      await settle(page)
      await expectNoHorizontalOverflow(page)
    }
    await screenshot(page, '10-responsive-1280-alert-history')
    await expectClean(diag)
  })
})