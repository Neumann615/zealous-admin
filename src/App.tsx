import { convertMenus, useUserStore } from '@zealous-admin/auth'
import { registerFormDataApis } from '@zealous-admin/form-designer/index'
import { http, LayoutProvider } from '@zealous-admin/layout/index'
import { configureMetadataClient, getEnumValueByCodeAPI, getMockEnumValueOptions, MOCK_METADATA_SYSTEM_NAME, normalizeEnumValueDetail } from '@zealous-admin/metadata/index'
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

const useMockMetadata = import.meta.env.VITE_METADATA_USE_MOCK_DATA === 'true'

registerFormDataApis({
  metadata: async (params, signal) => {
    const metadataParams = params as {
      enumCode?: string
      systemName?: string
      onlyValid?: boolean
      shape?: 'flat' | 'tree' | 'path'
    }
    if (!metadataParams.enumCode)
      throw new Error('元数据来源缺少 enumCode')
    const systemName = metadataParams.systemName
      || import.meta.env.VITE_METADATA_DEFAULT_SYSTEM_NAME
      || (useMockMetadata ? MOCK_METADATA_SYSTEM_NAME : '')
    if (!systemName)
      throw new Error('元数据来源缺少 systemName，请配置 VITE_METADATA_DEFAULT_SYSTEM_NAME')
    if (useMockMetadata) {
      return getMockEnumValueOptions({
        enumCode: metadataParams.enumCode,
        onlyValid: metadataParams.onlyValid,
        shape: metadataParams.shape,
      }, signal)
    }
    const detail = await getEnumValueByCodeAPI(
      metadataParams.enumCode,
      systemName,
      metadataParams.onlyValid ?? false,
      signal,
    )
    return normalizeEnumValueDetail(detail, { shape: metadataParams.shape })
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
