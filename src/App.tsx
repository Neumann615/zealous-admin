import { convertMenus, useUserStore } from '@zealous-admin/auth'
import { registerFormDataApis } from '@zealous-admin/form-designer/index'
import { http, LayoutProvider } from '@zealous-admin/layout/index'
import { configureMetadataClient, getOptionSetByCodeAPI, normalizeOptionSet } from '@zealous-admin/metadata/index'
import { useEffect, useMemo } from 'react'
import { Navigate, useRoutes } from 'react-router'
import routes from '~react-pages'
import { renderFormAPI } from './apis/form'
import './App.css'

configureMetadataClient(async config => http({
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
function RouteGuard(props: { children: React.ReactNode }) {
  const token = useUserStore.getState().token
  if (token?.length) {
    return props.children
  }
  else {
    return <Navigate to="/login" />
  }
}
// 为需要权限的路由添加守卫
for (let i = 0; i < routes.length; i++) {
  if ((routes[i] as any).meta?.auth) {
    routes[i].element = <RouteGuard>{routes[i].element}</RouteGuard>
  }
}

export default function App() {
  // 页面初始化时同步用户数据（刷新页面/已有 token 时）
  useEffect(() => {
    if (window.location.pathname === '/login') {
      return
    }
    const token = useUserStore.getState().token
    if (token) {
      useUserStore.getState().fetchUserInfo()
    }
  }, [])

  // 响应式订阅 menus，登录后 menus 变化时自动重新生成菜单
  const userInfo = useUserStore(state => state.userInfo)
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
