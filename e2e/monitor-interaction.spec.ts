import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { E2E_APP, EXPECTED_FILE, JS_ERROR_TITLES } from './helpers/config'
import {
  clearLogStreamState,
  expect,
  expectDropdownClosed,
  panel,
  pickOption,
  segmented,
  selectApp,
  settle,
  test,
} from './helpers/fixtures'

interface ExpectedStats {
  logs: { total: number }
}

function expected(): ExpectedStats {
  return JSON.parse(readFileSync(EXPECTED_FILE, 'utf8')) as ExpectedStats
}

/** 卡片视图里每条日志恰好渲染一个级别 Tag，用它度量可见行数 */
function levelTags(page: Page) {
  return page.locator('.ant-tag').filter({ hasText: /^(INFO|WARN|ERROR|DEBUG)$/ })
}

/** 查询面板里的「检索」按钮；工具栏那个叫「重新检索」，DOM 顺序上检索在前 */
function searchButton(page: Page) {
  return page.getByRole('button', { name: /检\s*索/ }).first()
}

async function openLogStream(page: Page): Promise<void> {
  await page.goto('/monitor/log')
  await clearLogStreamState(page)
  await page.reload()
  await selectApp(page)
  await settle(page)
}

test.describe('监控中心 · 交互细节', () => {
  test('实时日志：级别筛选只留 ERROR，切回全部恢复', async ({ page, diag }) => {
    await openLogStream(page)
    const total = expected().logs.total
    const before = await levelTags(page).count()
    expect(before, '默认应加载出种子日志').toBeGreaterThan(0)
    expect(before).toBeLessThanOrEqual(total)

    await segmented(page, 'ERROR').click()
    await searchButton(page).click()
    await settle(page)
    await expect(levelTags(page).filter({ hasText: /^(INFO|WARN|DEBUG)$/ }), '筛选 ERROR 后不应再出现其它级别').toHaveCount(0)
    const errorRows = await levelTags(page).count()
    expect(errorRows, '种子数据里一定有 ERROR 日志').toBeGreaterThan(0)
    expect(errorRows).toBeLessThan(before)

    await segmented(page, '全部').click()
    await searchButton(page).click()
    await settle(page)
    await expect(levelTags(page)).toHaveCount(before)
    await expect(diag.pageErrors).toEqual([])
  })

  test('实时日志：本地关键字筛选、卡片/表格切换、查询面板折叠', async ({ page, diag }) => {
    await openLogStream(page)
    const before = await levelTags(page).count()

    await page.getByPlaceholder('在已加载结果中筛选').fill(JS_ERROR_TITLES[0])
    const filtered = await levelTags(page).count()
    expect(filtered, '关键字应只留下匹配的日志').toBeGreaterThan(0)
    expect(filtered).toBeLessThan(before)
    await page.getByPlaceholder('在已加载结果中筛选').fill('')
    await expect(levelTags(page)).toHaveCount(before)

    await segmented(page, '表格').click()
    await expect(page.locator('.ant-table').first()).toBeVisible()
    await expect(page.getByText('批次：')).toHaveCount(0)
    await segmented(page, '卡片').click()
    await expect(page.getByText('批次：').first()).toBeVisible()

    await page.getByRole('button', { name: 'menu-fold' }).click()
    await expect(page.getByText('查询条件')).toHaveCount(0)
    await page.getByRole('button', { name: 'menu-unfold' }).click()
    await expect(page.getByText('查询条件')).toBeVisible()
    await expect(diag.pageErrors).toEqual([])
  })

  test('实时日志：超过折叠阈值的批次可以展开/收起', async ({ page, diag }) => {
    await openLogStream(page)
    const expand = page.getByRole('button', { name: /展开全部/ }).first()
    await expect(expand).toBeVisible()
    const folded = await levelTags(page).count()
    await expand.click()
    const unfolded = await levelTags(page).count()
    expect(unfolded, '展开后可见行数应增加').toBeGreaterThan(folded)
    // 批次头的「收起」在 DOM 上早于行内容里的同名按钮
    await page.getByRole('button', { name: /^收起$/ }).first().click()
    await expect(levelTags(page)).toHaveCount(folded)
    await expect(diag.pageErrors).toEqual([])
  })

  test('接口分析：隐藏接口会同步计数，可从已隐藏浮层恢复', async ({ page, diag }) => {
    await page.goto('/monitor/analysis/api')
    await selectApp(page)
    await settle(page)

    const table = panel(page, '接口明细')
    const rows = table.locator('.ant-table-tbody tr.ant-table-row')
    // 绝对条数由渲染套件与后端对账，这里只验证隐藏/恢复带来的相对变化
    const total = await rows.count()
    expect(total, '接口明细至少要有两行才能验证隐藏与恢复').toBeGreaterThanOrEqual(2)

    await rows.first().getByRole('button', { name: '隐藏' }).click()
    const hiddenTag = page.getByText(/已隐藏/).first()
    await expect(hiddenTag).toBeVisible()
    await expect(rows).toHaveCount(total - 1)

    await hiddenTag.click()
    await page.locator('.ant-popover').getByRole('button', { name: '取消隐藏' }).first().click()
    await expect(page.getByText(/已隐藏/)).toHaveCount(0)
    await expect(rows).toHaveCount(total)
    await expect(diag.pageErrors).toEqual([])
  })

  test('接口分析：次数阈值会过滤明细表', async ({ page, diag }) => {
    await page.goto('/monitor/analysis/api')
    await selectApp(page)
    await settle(page)

    const table = panel(page, '接口明细')
    const rows = table.locator('.ant-table-tbody tr.ant-table-row')
    const threshold = table.locator('.ant-input-number-input')
    const total = await rows.count()
    expect(total, '调整阈值前明细表应有数据').toBeGreaterThan(0)
    await threshold.fill('1')
    await threshold.blur()
    await expect(rows, '种子接口调用次数都大于 1，阈值 1 应清空表格').toHaveCount(0)
    await threshold.fill('')
    await threshold.blur()
    await expect(rows).toHaveCount(total)
    await expect(diag.pageErrors).toEqual([])
  })

  test('应用管理：消费配置弹窗可开关、取消不落库', async ({ page, diag }) => {
    await page.goto('/monitor/app')
    await settle(page)

    const row = page.locator('.ant-table-row', { hasText: E2E_APP.appName })
    await row.getByRole('button', { name: '消费配置' }).click()
    const modal = page.locator('.ant-modal').filter({ hasText: '日志消费与预警配置' })
    await expect(modal).toBeVisible()

    const consume = modal.locator('.ant-switch').nth(0)
    const alert = modal.locator('.ant-switch').nth(1)
    await expect(consume).toBeChecked()
    await expect(alert).toBeEnabled()

    const before = await alert.isChecked()
    await alert.click()
    expect(await alert.isChecked(), '点击开关应立即反映到 UI').toBe(!before)
    await modal.getByRole('button', { name: /取\s*消/ }).click()
    await expect(modal).toHaveCount(0)

    await row.getByRole('button', { name: '消费配置' }).click()
    expect(await modal.locator('.ant-switch').nth(1).isChecked(), '取消不应把未保存的改动写回').toBe(before)
    await modal.getByRole('button', { name: /取\s*消/ }).click()
    await expect(modal).toHaveCount(0)
    await expect(diag.pageErrors).toEqual([])
  })

  test('应用管理：队列状态抽屉展示队列参数', async ({ page, diag }) => {
    await page.goto('/monitor/app')
    await settle(page)

    const row = page.locator('.ant-table-row', { hasText: E2E_APP.appName })
    await row.getByRole('button', { name: '队列状态' }).click()
    const drawer = page.getByRole('dialog')
    await expect(drawer.getByText('队列参数')).toBeVisible()
    await expect(drawer.getByText('各优先级队列大小')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(diag.pageErrors).toEqual([])
  })

  test('预警记录：切换筛选会重新请求后端', async ({ page, diag }) => {
    await page.goto('/monitor/analysis/alert-history')
    await selectApp(page)
    await settle(page)

    const typeSelect = page.locator('span', { hasText: /^预警类型$/ })
      .locator('xpath=following-sibling::div[contains(@class, "ant-select")][1]')
    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/monitor/alerts/history'))
        requests.push(request.url())
    })

    await typeSelect.click()
    await pickOption(page, '接口报错实时预警')
    await expectDropdownClosed(page)
    await settle(page)
    const afterFilter = requests.length
    expect(afterFilter, '切换筛选应触发一次历史查询').toBeGreaterThan(0)
    expect(requests[afterFilter - 1]).toContain('alertType=')

    await typeSelect.click()
    await pickOption(page, '全部类型')
    await settle(page)
    expect(requests.length, '切回全部类型应再次查询').toBeGreaterThan(afterFilter)

    // antd Empty 的 SVG 里也有个 <title>暂无数据</title>，必须认描述节点
    await expect(page.locator('.ant-empty-description', { hasText: '暂无数据' })).toBeVisible()
    await expect(page.getByRole('button', { name: /重\s*发/ })).toHaveCount(0)
    await expect(diag.pageErrors).toEqual([])
  })

  test('工作台：刷新按钮会重新拉取统计', async ({ page, diag }) => {
    await page.goto('/monitor/workbench')
    await selectApp(page)
    await settle(page)

    let hits = 0
    page.on('request', (request) => {
      if (request.url().includes('/monitor/stats/workbench'))
        hits += 1
    })
    await page.getByRole('button', { name: /刷\s*新/ }).click()
    await settle(page)
    expect(hits, '点刷新应至少再发一次统计请求').toBeGreaterThanOrEqual(1)
    await expect(diag.pageErrors).toEqual([])
  })
})