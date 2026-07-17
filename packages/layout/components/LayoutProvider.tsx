import type { LayoutConfig, MenuData } from '../types/config'
import type { UserInfoData } from './UserInfo/UserInfo'
import { theme as antdTheme, App, ConfigProvider } from 'antd'
import { StyleProvider } from 'antd-style'
import zhCN from 'antd/locale/zh_CN'
import { Suspense, useEffect, useMemo, useState } from 'react'
import {
  useAppStore,
  useMenuStore,
  usePageStore,
  useThemeStore,
  useTopBarStore,
} from '../store/index'

interface AppLayoutProps {
  children: React.ReactNode
  menuData?: MenuData
  defaultSetting?: LayoutConfig
  userInfo?: UserInfoData
  onLogout?: () => void
}

export function LayoutProvider({
  children,
  menuData,
  defaultSetting,
}: AppLayoutProps) {
  const themeStore = useThemeStore()
  const menuStore = useMenuStore()
  const appStore = useAppStore()

  // 监听系统深色/浅色模式
  const [systemDarkMode, setSystemDarkMode] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  // 计算全局主题算法
  const globalAlgorithm = useMemo(() => {
    const algorithmData = []
    if (
      themeStore.darkMode === '1'
      || (themeStore.darkMode === 'auto' && systemDarkMode)
    ) {
      algorithmData.push(antdTheme.darkAlgorithm)
    }
    return algorithmData
  }, [themeStore.darkMode, systemDarkMode])

  // 哀悼模式 色弱模式
  useEffect(() => {
    if (themeStore.colorWeak) {
      document.documentElement.style.filter = 'invert(0.8) hue-rotate(180deg)'
    }
    else if (appStore.isEnableMourningMode) {
      document.documentElement.style.filter = 'grayscale(100%)'
    }
    else {
      document.documentElement.style.filter = ''
    }
  }, [themeStore.colorWeak, appStore.isEnableMourningMode])

  // 初始配置仅执行一次
  useEffect(() => {
    if (defaultSetting) {
      useAppStore.setState({ ...defaultSetting.app })
      useMenuStore.setState({ ...defaultSetting.menu })
      usePageStore.setState({ ...defaultSetting.page })
      useTopBarStore.setState({ ...defaultSetting.topBar })
      useThemeStore.setState({ ...defaultSetting.theme })
    }
  }, [])

  // menuData 变化时更新菜单数据（登录后 menus 从空变为有值时触发）
  useEffect(() => {
    menuStore.setMainNavData(menuData || [])
    if (!menuStore?.mainNavCurrentKeys?.length && menuData?.length) {
      menuStore.setMainNavCurrentKeys([menuData[0].key])
      menuStore.setMenuData(menuData[0].children || [])
    }
  }, [menuData])

  // 监听系统深色模式
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemDarkMode(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <StyleProvider>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: globalAlgorithm,
          token: { colorPrimary: themeStore.themeColor },
        }}
      >
        <App>
          <Suspense fallback={<p>Loading...</p>}>{children}</Suspense>
        </App>
      </ConfigProvider>
    </StyleProvider>
  )
}
