import { defineConfig } from '@playwright/test'
import { BACKEND, FRONTEND, FRONTEND_PORT, SINK } from './e2e/helpers/config'

const reuse = !process.env.CI

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: FRONTEND,
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    actionTimeout: 30_000,
    navigationTimeout: 45_000,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'auth', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['auth'],
      use: { storageState: 'e2e/.auth/user.json' },
    },
  ],
  webServer: [
    {
      command: 'node ../node_modules/tsx/dist/cli.mjs src/index.ts',
      cwd: 'service',
      // 后端根路由需鉴权（401），用端口探测判断就绪
      port: Number(new URL(BACKEND).port),
      reuseExistingServer: reuse,
      timeout: 90_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `node node_modules/vite/bin/vite.js --port ${FRONTEND_PORT} --strictPort`,
      url: FRONTEND,
      reuseExistingServer: reuse,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'node node_modules/tsx/dist/cli.mjs e2e/helpers/sink.ts',
      port: Number(new URL(SINK).port),
      reuseExistingServer: reuse,
      timeout: 30_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
})
