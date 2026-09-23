import { expect } from '@playwright/test'
import { AUTH_FILE, LOGIN, MONITOR_ROUTES } from './helpers/config'
import { settle, test } from './helpers/fixtures'

test('登录并保存会话', async ({ page }) => {
  test.setTimeout(300_000) // 含 9 条监控路由的冷编译预热

  await page.goto('/login')
  await page.getByLabel('用户名').fill(LOGIN.username)
  await page.getByLabel('密码').fill(LOGIN.password)
  await page.getByRole('button', { name: /登\s*录/ }).click({ timeout: 60_000 })
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 60_000 })
  await expect(page.getByText('监控中心').first()).toBeVisible({ timeout: 60_000 })
  await page.context().storageState({ path: AUTH_FILE })

  // 预热：rolldown-vite 不预打包 antd/echarts，首次进入监控页要现场编译大量模块，
  // 这里先把 9 个路由走一遍，避免正式用例卡在冷编译上
  for (const route of MONITOR_ROUTES) {
    await page.goto(route.path)
    await settle(page)
  }
})