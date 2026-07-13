import { LayoutProvider } from '@zealous-admin/layout/index'
import { useEffect, useMemo } from 'react'
import { Navigate, useRoutes } from 'react-router'
import routes from '~react-pages'
import { AppMessageInit } from '@/components/AppMessageInit'
import { useMallUserStore } from '@/store/mall/user'
import './App.css'

// 路由守卫
function RouteGuard(props: { children: React.ReactNode }) {
  const userStore = useMallUserStore.getState()
  const token = userStore.userInfo.token
  if (token?.length) {
    return props.children
  }
  else {
    return <Navigate to="/login" />
  }
}
// 为需要权限的路由添加守卫
for (let i = 0; i < routes.length; i++) {
  if (routes[i].meta?.auth) {
    routes[i].element = <RouteGuard>{routes[i].element}</RouteGuard>
  }
}

export default function App() {
  // 页面初始化时同步用户数据（刷新页面/已有 token 时）
  useEffect(() => {
    const { token } = useMallUserStore.getState().userInfo
    if (token) {
      useMallUserStore.getState().getUserInfo().catch((err) => {
        console.error('初始化用户数据失败:', err)
      })
    }
  }, [])

  // 响应式订阅 menus，登录后 menus 变化时自动重新生成菜单
  const menus = useMallUserStore(state => state.userInfo.menus)
  const menuData = useMemo(() => {
    const { menus } = useMallUserStore.getState().userInfo
    let _menuData = []
    // 如果有菜单权限且动态路由未生成，则生成菜单
    if (menus?.length) {
    // 将后端返回的菜单转换为前端菜单格式
      _menuData = convertMenus(menus)
    }
    return _menuData
  }, [menus])

  return (
    <LayoutProvider
      menuData={menuData}
      // defaultSetting={defaultSetting as LayoutConfig}
    >
      <AppMessageInit>
        {useRoutes(routes)}
      </AppMessageInit>
    </LayoutProvider>
  )
}

// 将后端菜单转换为前端菜单格式（根据 parentId 和 sort 生成树结构）
function convertMenus(menus: any[]) {
  if (!menus || menus.length === 0)
    return []

  // 根据 parentId 分组菜单
  const menuMap = new Map<number, any[]>()
  menus.forEach((menu) => {
    const parentId = Number(menu.parentId) || 0
    if (!menuMap.has(parentId)) {
      menuMap.set(parentId, [])
    }
    menuMap.get(parentId)!.push(menu)
  })

  // 递归构建树结构
  const buildTree = (parentId: number, parentKey: string = ''): any[] => {
    const children = menuMap.get(parentId) || []

    // 根据 sort 字段排序
    children.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0))

    return children
      .map((menu) => {
        // 拼接父节点的 key 到当前节点的 key
        const currentPath = menu.path || `/${menu.name}`
        const currentKey = parentKey
          ? `${parentKey}${currentPath}`
          : currentPath

        const childTree = buildTree(Number(menu.id) || 0, currentKey).filter(
          (item: any) => item !== null,
        )

        // 过滤隐藏的菜单
        if (Number(menu.hidden) === 1) {
          return null
        }

        // 如果没有子节点则不添加 children 属性
        const result: any = {
          id: menu.id?.toString() || menu.name,
          label: menu.title || menu.name,
          icon: menu.icon || '',
          key: currentKey,
        }

        if (childTree.length > 0) {
          result.children = childTree
        }

        return result
      })
      .filter((item: any) => item !== null)
  }

  // 从根节点（parentId = 0）开始构建
  return buildTree(0)
}