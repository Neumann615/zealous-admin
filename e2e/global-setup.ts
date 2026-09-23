import { chromium } from '@playwright/test'
import { FRONTEND } from './helpers/config'
import { seed } from './helpers/seed'

/** webServer 起来之后、用例之前执行：清库 → 灌确定性数据 → 落盘后端期望值 → 预热前端编译缓存 */
export default async function globalSetup(): Promise<void> {
  await seed()
  await warmUpFrontend()
}

/**
 * 登录页依赖 antd 全量模块，冷启动时 Vite 要现场编译上百个文件，
 * 会顶穿用例的 actionTimeout。先空跑一次把编译产物焐热。
 */
async function warmUpFrontend(): Promise<void> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#app-loading').waitFor({ state: 'detached', timeout: 120_000 }).catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
  }
  finally {
    await browser.close()
  }
}