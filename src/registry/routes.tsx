import type { MenuRecord } from '@zealous-admin/auth'
import type { ComponentType, LazyExoticComponent } from 'react'
import type { RouteObject } from 'react-router'
import type { PageLoader } from './pages'
import { AuthGuard } from '@zealous-admin/auth'
import { Layout } from '@zealous-admin/layout/index'
import { Spin } from 'antd'
import { lazy, Suspense } from 'react'
import NoMatch from '../pages/[...all]'
import Login from '../pages/login'
import { resolvePageLoader } from './pages'

const lazyCache = new Map<PageLoader, LazyExoticComponent<ComponentType<any>>>()

/** 懒加载页面的占位骨架；模块级元素即可，无需再声明组件 */
const pageFallback = (
  <div className="flex-center" style={{ minHeight: 320 }}>
    <Spin />
  </div>
)

function pageElement(loader: PageLoader) {
  let Component = lazyCache.get(loader)
  if (!Component) {
    Component = lazy(loader)
    lazyCache.set(loader, Component)
  }
  return (
    <Suspense fallback={pageFallback}>
      <Component />
    </Suspense>
  )
}

/** 路由表完全由菜单配置驱动：菜单行决定路由存在性，component 列决定页面组件 */
export function buildRoutes(menus: MenuRecord[]): RouteObject[] {
  const children: RouteObject[] = []

  const home = resolvePageLoader(null, '/')
  if (home)
    children.push({ index: true, element: pageElement(home) })

  for (const menu of menus) {
    if (!menu.path || menu.path === '/')
      continue
    const loader = resolvePageLoader(menu.component, menu.path)
    if (!loader)
      continue
    children.push({ path: menu.path, element: pageElement(loader) })
  }

  return [
    { path: '/login', element: <Login /> },
    {
      path: '/',
      element: (
        <AuthGuard>
          <Layout />
        </AuthGuard>
      ),
      children,
    },
    { path: '*', element: <NoMatch /> },
  ]
}