import { configureAuthClient, convertMenus, useUserStore } from '@zealous-admin/auth'
import { registerFormDataApis } from '@zealous-admin/form-designer/index'
import { http, LayoutProvider } from '@zealous-admin/layout/index'
import { configureMetadataClient, getOptionSetByCodeAPI, normalizeOptionSet } from '@zealous-admin/metadata/index'
import { monitor } from '@zealous-admin/monitor-sdk/index'
import { configureMonitorClient } from '@zealous-admin/monitor/index'
import { Spin } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useRoutes } from 'react-router'
import { renderFormAPI } from './apis/form'
import { buildRoutes } from './registry/routes'
import './App.css'

/** 访问令牌默认 2h 有效，页面开着时每 25 分钟静默续期一次 */
const SESSION_REFRESH_INTERVAL_MS = 25 * 60 * 1000

/** 路由表来自菜单接口，已有令牌且不在登录页时需要先把会话拉回来才能渲染路由 */
function needSessionBootstrap() {
  const { token } = useUserStore.getState()
  return Boolean(token) && window.location.pathname !== '/login'
}

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

export default function App() {
  const userInfo = useUserStore(state => state.userInfo)
  const [booted, setBooted] = useState(() => !needSessionBootstrap())

  useEffect(() => {
    if (!needSessionBootstrap())
      return
    // 令牌过期/账号被禁用由 http 拦截器统一走重新登录
    useUserStore.getState().refreshSession().catch(() => {}).finally(() => setBooted(true))
    const timer = window.setInterval(() => {
      useUserStore.getState().refreshSession().catch(() => {})
    }, SESSION_REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

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

  const routes = useMemo(() => buildRoutes((userInfo?.menus ?? []) as any), [userInfo])
  const element = useRoutes(routes)

  if (!booted) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <LayoutProvider
      menuData={menuData}
      cachedPages={['/demo/keepalive']}
    >
      {element}
    </LayoutProvider>
  )
}