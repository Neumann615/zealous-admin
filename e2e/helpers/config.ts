/** E2E 共享配置：地址、账号、专用测试应用 */

/** E2E 专用前端端口：与本地开发的 3509 隔离，避免复用长期运行、依赖预构建缓存已过期的 dev server */
export const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 3510)
export const FRONTEND = process.env.E2E_BASE_URL || `http://localhost:${FRONTEND_PORT}`
export const BACKEND = process.env.E2E_API_URL || 'http://localhost:3508'
/** 预警链路 E2E 的 webhook 接收器 */
export const SINK = process.env.E2E_SINK_URL || 'http://localhost:3999'

export const LOGIN = { username: 'admin', password: 'admin123' }

/** 专用测试应用：与 SDK 上报的 zealous-admin 完全隔离，跑测试不会污染真实数据 */
export const E2E_APP = {
  appId: 'za-e2e',
  appName: 'E2E 演示应用',
  type: 'realTimeLog' as const,
  content: 'Playwright E2E 专用应用，数据由 e2e/helpers/seed.ts 确定性生成',
}

/** 预警链路专用应用：alert 用例会往里灌 ERROR 日志并产生预警记录，必须与 E2E_APP 隔离，否则污染其它用例基线 */
export const E2E_ALERT_APP = {
  appId: 'za-e2e-alert',
  appName: 'E2E 预警演示',
  type: 'realTimeLog' as const,
  content: 'Playwright 预警链路专用应用，数据由 e2e/monitor-alert.spec.ts 生成',
}

export const AUTH_FILE = 'e2e/.auth/user.json'
export const EXPECTED_FILE = 'e2e/.cache/expected.json'
export const SCREENSHOT_DIR = 'e2e/screenshots'

/** 种子数据全部落在最近 20 分钟内，保证「最近1小时」档位一定覆盖 */
export const SEED_WINDOW_MS = 20 * 60 * 1000

export const PAGES = [
  '/dashboard',
  '/system/admin',
  '/system/role',
  '/metadata',
  '/form/list',
  '/monitor/log',
] as const

export const USERS = [
  { uid: 'u-1', nickname: '张三' },
  { uid: 'u-2', nickname: '李四' },
  { uid: 'u-3', nickname: '王五' },
  { uid: 'u-4', nickname: '赵六' },
  { uid: 'u-5', nickname: '孙七' },
] as const

export const API_URLS = [
  '/admin/info',
  '/admin/list',
  '/role/all',
  '/metadata/set/page',
  '/form/data/render',
  '/monitor/logs',
] as const

export const CLICK_LABELS = ['检索', '新增', '编辑', '删除', '导出'] as const

export const JS_ERROR_TITLES = [
  'Cannot read properties of undefined (reading id)',
  'TypeError: list.map is not a function',
  'Uncaught (in promise) AxiosError: timeout of 5000ms exceeded',
] as const

export const BIZ_OP_TITLES = ['保存表单', '提交审批', '导出数据', '批量删除'] as const

/** 监控中心 9 个页面：路径必须与 src/pages/index/monitor/** 文件路由一致 */
/** marker：每个页面必然渲染的标识文案，用于确认路由确实挂载（不依赖是否有数据） */
export const MONITOR_ROUTES = [
  { path: '/monitor/workbench', name: 'workbench', marker: '数据看板', title: '工作台' },
  { path: '/monitor/log', name: 'log', marker: '重新检索', title: '实时日志' },
  { path: '/monitor/app', name: 'app', marker: '创建应用', title: '应用管理' },
  { path: '/monitor/analysis/perf', name: 'perf', marker: '刷新应用', title: '性能统计' },
  { path: '/monitor/analysis/api', name: 'api', marker: '刷新应用', title: '接口分析' },
  { path: '/monitor/analysis/behavior', name: 'behavior', marker: '刷新应用', title: '行为分析' },
  { path: '/monitor/analysis/js-error', name: 'js-error', marker: '刷新应用', title: 'JS错误分析' },
  { path: '/monitor/analysis/biz-error', name: 'biz-error', marker: '刷新应用', title: '业务错误分析' },
  { path: '/monitor/analysis/alert-history', name: 'alert-history', marker: '预警配置', title: '预警记录' },
] as const
