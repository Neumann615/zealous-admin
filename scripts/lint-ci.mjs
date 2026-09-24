import { spawnSync } from 'node:child_process'
import process from 'node:process'

const paths = [
  'e2e',
  'playwright.config.ts',
  'scripts',
  'docs/.vitepress/config.ts',
  'packages/auth/api/auth.ts',
  'packages/auth/api/menu.ts',
  'packages/auth/hooks/useAuth.ts',
  'packages/auth/package.json',
  'packages/auth/pages/MenuManager.tsx',
  'packages/auth/types/user.ts',
  'packages/components/PatternBg/PatternBg.tsx',
  'packages/components/SliderCaptcha/SliderCaptcha.tsx',
  'packages/layout/components/TabBar/TabBar.tsx',
  'packages/layout/hooks/useControlTab.ts',
  'packages/layout/store/menu.ts',
  'packages/layout/utils/data.ts',
  'packages/metadata',
  'packages/monitor/package.json',
  'packages/monitor/views/AlertHistory.tsx',
  'packages/monitor/views/AppManager.tsx',
  'service/src/app.ts',
  'service/src/db/index.ts',
  'service/src/lib/errors.ts',
  'service/src/lib/response.ts',
  'service/src/middleware',
  'service/src/modules/auth/auth.routes.ts',
  'service/src/modules/auth/auth.schema.ts',
  'service/src/modules/auth/captcha.ts',
  'service/src/modules/auth/captcha.test.ts',
  'service/src/modules/auth/login-guard.ts',
  'service/src/modules/auth/login-guard.test.ts',
  'service/src/modules/auth/menu.routes.ts',
  'service/src/modules/auth/menu.service.ts',
  'service/src/modules/auth/menu.service.test.ts',
  'service/src/modules/auth/permission.test.ts',
  'service/src/modules/metadata',
  'service/src/modules/monitor/audit.ts',
  'src/pages/login.tsx',
  'src/pages/index/form',
]

const eslintArguments = [...process.argv.slice(2), ...paths]
const result = spawnSync(
  process.execPath,
  ['node_modules/eslint/bin/eslint.js', ...eslintArguments],
  { stdio: 'inherit' },
)

if (result.error) {
  console.error(result.error)
  process.exit(1)
}
process.exit(result.status ?? 0)
