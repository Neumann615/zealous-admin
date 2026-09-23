import { AuthGuard, configureAuthClient, convertMenus, useUserStore } from '@zealous-admin/auth'
import { registerFormDataApis } from '@zealous-admin/form-designer/index'
import { http, LayoutProvider } from '@zealous-admin/layout/index'
import { configureMetadataClient, getOptionSetByCodeAPI, normalizeOptionSet } from '@zealous-admin/metadata/index'
import { monitor } from '@zealous-admin/monitor-sdk/index'
import { configureMonitorClient } from '@zealous-admin/monitor/index'
import { useEffect, useMemo } from 'react'
import { useRoutes } from 'react-router'
import routes from '~react-pages'
import { renderFormAPI } from './apis/form'
import './App.css'

/** 访问令牌默认 2h 有效，页面开着时每 25 分钟静默续期一次 */
const SESSION_REFRESH_INTERVAL_MS = 25 * 60 * 1000

configureAuthClient(async config => http({
  url: config.url,
  method: (config.method || 'GET').toLowerCase() as 'get' | 'post',
  data: config.data,
  params: config.params,
}))

configureMetadataClient(async config => http({
  url: config.url,
  method: (config.method || 'GET').toLowerCase() as 'get' | 'post',
  data: config.data,
  params: config.params,
  signal: config.signal,
}))

configureMonitorClient(async config => http({
  url: config.url,
  method: (config.method || 'GET').toLowerCase() as 'get' | 'post',
  data: config.data,
  params: config.params,
  signal: config.signal,
}))

registerFormDataApis({
  metadata: async (params, signal) => {
    const metadataParams = params as {
      setCode?: string
      onlyValid?: boolean
      shape?: 'flat' | 'tree' | 'path'
    }
    if (!metadataParams.setCode)
      throw new Error('元数据来源缺少 setCode')
    const detail = await getOptionSetByCodeAPI(metadataParams.setCode, {
      onlyValid: metadataParams.onlyValid,
      signal,
    })
    return normalizeOptionSet(detail, { shape: metadataParams.shape })
  },
  __render: async (params, signal) => {
    const res = await renderFormAPI(params, signal)
    return res.data.renderContract
  },
})

// 路由守卫
// 为需要权限的路由添加守卫
for (let i = 0; i < routes.length; i++) {
  if ((routes[i] as any).meta?.auth) {
    routes[i].element = <AuthGuard>{routes[i].element}</AuthGuard>
  }
}

export default function App() {
  // 页面初始化时同步用户数据（刷新页面/已有 token 时）
  useEffect(() => {
    if (window.location.pathname === '/login') {
      return
    }
    if (!useUserStore.getState().token) {
      return
    }
    // 启动即续期并拉取最新用户信息：令牌过期或账号被禁用时由 http 拦截器统一走重新登录
    useUserStore.getState().refreshSession().catch(() => {})
    const timer = window.setInterval(() => {
      useUserStore.getState().refreshSession().catch(() => {})
    }, SESSION_REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

  // 响应式订阅 menus，登录后 menus 变化时自动重新生成菜单
  const userInfo = useUserStore(state => state.userInfo)

  // 登录态同步到监控 SDK：日志与统计按 nickname/uid 归因
  useEffect(() => {
    if (!userInfo) {
      return
    }
    monitor.setUser({ nickname: userInfo.nickName || userInfo.username, uid: String(userInfo.id) })
  }, [userInfo])
  const menuData = useMemo(() => {
    const menus = userInfo?.menus ?? []
    if (menus.length === 0)
      return []
    return convertMenus(menus as any[])
  }, [userInfo])

  return (
    <LayoutProvider
      menuData={menuData}
      cachedPages={['/demo/keepalive']}
    >
      {useRoutes(routes)}
    </LayoutProvider>
  )
}

// 将后端菜单转换为前端菜单格式（根据 parentId 和 sort 生成树结构）
