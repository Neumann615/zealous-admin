import type { ComponentType } from 'react'

export type PageLoader = () => Promise<{ default: ComponentType<any> }>

/** 包内页面：菜单 component 列配置的 key → 懒加载器；新增页面在这里注册后即可被菜单绑定 */
const packagePages: Record<string, PageLoader> = {
  'auth/admin': () => import('@zealous-admin/auth/pages/AdminManager'),
  'auth/role': () => import('@zealous-admin/auth/pages/RoleManager'),
  'auth/menu': () => import('@zealous-admin/auth/pages/MenuManager'),
  'system/architecture': () => import('../pages/index/system/architecture'),
  'metadata/manager': () => import('@zealous-admin/metadata/index').then(m => ({ default: m.MetadataManager })),
  'monitor/workbench': () => import('@zealous-admin/monitor/index').then(m => ({ default: m.Workbench })),
  'monitor/log': () => import('@zealous-admin/monitor/index').then(m => ({ default: m.LogStream })),
  'monitor/app': () => import('@zealous-admin/monitor/index').then(m => ({ default: m.AppManager })),
  'monitor/perf': () => import('@zealous-admin/monitor/index').then(m => ({ default: m.PerfAnalysis })),
  'monitor/api': () => import('@zealous-admin/monitor/index').then(m => ({ default: m.ApiAnalysis })),
  'monitor/behavior': () => import('@zealous-admin/monitor/index').then(m => ({ default: m.BehaviorAnalysis })),
  'monitor/js-error': () => import('@zealous-admin/monitor/index').then(m => ({ default: () => <m.ErrorAnalysis kind="js" /> })),
  'monitor/biz-error': () => import('@zealous-admin/monitor/index').then(m => ({ default: () => <m.ErrorAnalysis kind="biz" /> })),
  'monitor/alert-history': () => import('@zealous-admin/monitor/index').then(m => ({ default: m.AlertHistory })),
}

/** 约定式回落：菜单未配置 component 时，按 path 找 src/pages/index 下的同名页面文件 */
const filePages = import.meta.glob('../pages/**/*.tsx') as Record<string, PageLoader>

export function knownPageKeys(): string[] {
  return Object.keys(packagePages)
}

export function resolvePageLoader(component: string | null | undefined, path: string): PageLoader | null {
  if (component)
    return packagePages[component] ?? null

  const base = path === '/' ? '../pages/index/index' : `../pages/index${path}`
  return filePages[`${base}.tsx`] ?? filePages[`${base}/index.tsx`] ?? null
}
