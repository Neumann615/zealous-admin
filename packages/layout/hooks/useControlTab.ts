import { useNavigate } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore, useMenuStore, useTopBarStore } from '../store/index'

// 标记导航是否由 openTab 发起，避免浏览器 popstate 同步时重复处理
let isProgrammaticNav = false

export function useControlTab() {
  const { mainNavData, setMenuCurrentKeys, setMainNavCurrentKeys, menuType } = useMenuStore()
  const { isEnableHomePage, homePageTitle } = useAppStore(
    useShallow((state: any) => ({
      isEnableHomePage: state.homePage.isEnableHomePage,
      homePageTitle: state.homePage.title,
    })),
  )
  const { tabs, setTabs, setNowTab, nowTab, setBreadcrumbList } = useTopBarStore()
  const navigate = useNavigate()

  function getPathByKey(curKey: string, data: any) {
    let result: any = [] // 记录路径结果
    const traverse = (curKey: string, path: any, data: any) => {
      if (data.length === 0) {
        return
      }
      for (const item of data) {
        path.push(item)
        if (item.key === curKey) {
          result = JSON.parse(JSON.stringify(path))
          return
        }
        const children = Array.isArray(item.children) ? item.children : []
        traverse(curKey, path, children) // 遍历
        path.pop() // 回溯
      }
    }
    traverse(curKey, [], data)
    return result
  }

  // 从 URL 路径推导页面标题（用于不在菜单树中的页面）
  function deriveTitleFromKey(key: string): string {
    // 去掉查询参数
    const path = key.split('?')[0]
    // 取最后一段路径
    const segments = path.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1] || path
    // 将驼峰命名转为可读标题
    return lastSegment
      .replace(/([A-Z])/g, ' $1')
      .replace(/^[a-z]/, s => s.toUpperCase())
      .trim()
  }

  // 打开页面
  function openTab(v: any) {
    console.log('wxx-openTab', v)
    let pathList = getPathByKey(v.key, mainNavData)

    if (v.key === '/') {
      pathList = [{
        icon: 'Home',
        id: '/',
        key: '/',
        label: homePageTitle,
      }]
    }
    else if (pathList?.length) {
      // 在菜单树中找到了路径，直接使用
      if (isEnableHomePage) {
        pathList.unshift({
          icon: 'Home',
          id: '/',
          key: '/',
          label: homePageTitle,
        })
      }
    }
    else {
      // 页面不在菜单树中（隐藏页面/子页面）
      // 面包屑：从当前状态累积追加，保留完整导航上下文
      const { breadcrumbList: currentBreadcrumb } = useTopBarStore.getState()
      const keyWithoutQuery = v.key.split('?')[0]

      // 检查当前面包屑中是否已有同路径项（不含查询参数），有则截断到该位置
      const existIndex = currentBreadcrumb.findIndex(
        (item: any) => (item.key || '').split('?')[0] === keyWithoutQuery,
      )

      if (existIndex >= 0) {
        // 已存在，截断到该位置
        pathList = currentBreadcrumb.slice(0, existIndex + 1)
      }
      else {
        // 不存在，在当前面包屑基础上追加
        const newItem = {
          icon: v.icon || '',
          id: v.key,
          key: v.key,
          label: v.label || deriveTitleFromKey(v.key),
        }
        pathList = [...currentBreadcrumb, newItem]
      }

      // 确保首页在最前面
      if (isEnableHomePage && pathList[0]?.key !== '/') {
        pathList.unshift({
          icon: 'Home',
          id: '/',
          key: '/',
          label: homePageTitle,
        })
      }
    }

    if (pathList?.length) {
      // 设置面包屑导航
      setBreadcrumbList(pathList)

      // 菜单选中：从面包屑中筛选菜单树中真实存在的 key
      // 这样能精确高亮到具体的页面节点（如"商品列表"），而非仅结构节点
      const menuKeys = pathList
        .filter((item: any) => {
          const k = (item.key || '').split('?')[0]
          return k === '/' || getPathByKey(k, mainNavData).length > 0
        })
        .map((item: any) => item.key)
      setMainNavCurrentKeys(menuKeys)
      setMenuCurrentKeys(menuKeys)
      if (['side', 'head'].includes(menuType)) {
        for (let i = 0; i < mainNavData.length; i++) {
          if (mainNavData[i].key === menuKeys[1]) {
            useMenuStore.setState((store: any) => ({
              menuData: mainNavData[i].children,
            }))
          }
        }
      }
      const targetRoute = pathList[pathList.length - 1]
      const tabData = {
        tabId: targetRoute.key,
        title: targetRoute.label,
        icon: targetRoute.icon,
        menuData: targetRoute,
      }
      if (tabs.findIndex((tab: any) => tab.tabId === targetRoute.key) === -1) {
        tabs.push(tabData)
        setTabs(tabs)
      }
      if (tabData.tabId === nowTab.tabId) {
        // 即使 tab 相同也要 navigate，防止浏览器后退导致 URL 与 tab 状态不同步
        isProgrammaticNav = true
        navigate(v.key)
        return
      }
      setNowTab(tabData)
      isProgrammaticNav = true
      navigate(v.key)
    }
  }

  type closeTabAction = 'left' | 'right' | 'other' | 'default'

  // 关闭页面
  function closeTab(tabId: string, action: closeTabAction = 'default') {
    let delIndex: number = -1
    let nowTabIndex: number = -1
    tabs.forEach((tabItem: any, index: number) => {
      if (tabItem.tabId === tabId) {
        delIndex = index
      }
      if (tabItem.tabId === nowTab.tabId) {
        nowTabIndex = index
      }
    })
    if (delIndex === -1)
      return
    if (action === 'default') {
      let openIndex: number = 0
      // 打开新页面,移动tab
      if (nowTab.tabId === tabId) {
        // 最左边
        if (delIndex === 0) {
          openIndex = 1
        }
        // 最右边
        else if (delIndex === tabs.length - 1) {
          openIndex = delIndex - 1
        }
        // 中间
        else if (delIndex > 0 && delIndex < tabs.length - 1) {
          openIndex = delIndex + 1
        }
        openTab(tabs[openIndex].menuData)
      }
      setTabs(tabs.filter((item: any) => item.tabId !== tabId))
    }
    else if (action === 'left') {
      // 直接删除左侧的tab
      if (nowTab.tabId !== tabId) {
        if (nowTabIndex < delIndex) {
          openTab(tabs[delIndex].menuData)
        }
      }
      setTabs(tabs.filter((item: any, index: number) => index >= delIndex))
    }
    else if (action === 'right') {
      if (nowTab.tabId !== tabId) {
        if (nowTabIndex > delIndex) {
          openTab(tabs[delIndex].menuData)
        }
      }
      setTabs(tabs.filter((item: any, index: number) => index <= delIndex))
    }
    else if (action === 'other') {
      if (nowTab.tabId !== tabId) {
        openTab(tabs[delIndex].menuData)
      }
      setTabs(tabs.filter((item: any) => item.tabId === tabId))
    }
  }

  // 切换页面顺序
  function swapTab(index1: number, index2: number) {
    const arr = JSON.parse(JSON.stringify(tabs))
    const temp = arr[index1]
    arr[index1] = arr[index2]
    arr[index2] = temp
    setTabs(arr)
  }

  // 固定tab页面
  function fixedTab(tabId: string) {
    const _tabs = JSON.parse(JSON.stringify(tabs))
    _tabs.forEach((tabItem: any) => {
      if (tabItem.tabId === tabId) {
        tabItem.isFixed = !tabItem.isFixed
      }
    })
    _tabs.sort((a: any, b: any) => {
      if (a.isFixed === b.isFixed) {
        return 0
      }
      return a.isFixed ? -1 : 1
    })
    setTabs(_tabs)
  }

  // 浏览器后退/前进时同步 tab 与面包屑状态
  // 在 Layout 中通过 useEffect + location 调用
  function syncTabFromUrl(pathname: string) {
    if (isProgrammaticNav) {
      isProgrammaticNav = false
      return
    }

    // 去掉查询参数匹配 tab
    const currentPath = pathname.startsWith('/') ? pathname : `/${pathname}`
    const matchingTab = tabs.find((tab: any) => {
      const tabPath = (tab.tabId || '').split('?')[0]
      return tabPath === currentPath
    })

    if (!matchingTab)
      return

    // 同步 nowTab
    if (matchingTab.tabId !== nowTab.tabId) {
      setNowTab(matchingTab)
    }

    // 同步面包屑：从菜单树中重建路径
    const pathList = getPathByKey(matchingTab.tabId.split('?')[0], mainNavData)
    if (pathList?.length) {
      if (isEnableHomePage && pathList[0]?.key !== '/') {
        pathList.unshift({
          icon: 'Home',
          id: '/',
          key: '/',
          label: homePageTitle,
        })
      }
      setBreadcrumbList(pathList)
    }
    else if (matchingTab.tabId === '/') {
      setBreadcrumbList([{
        icon: 'Home',
        id: '/',
        key: '/',
        label: homePageTitle,
      }])
    }
  }

  return {
    openTab,
    closeTab,
    swapTab,
    fixedTab,
    syncTabFromUrl,
  }
}
