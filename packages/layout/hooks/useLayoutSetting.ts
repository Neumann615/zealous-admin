import type { DarkMode, LayoutConfig, LayoutScope, TabBarDblClickEventType, TabBarWidthType } from '../types/config'
import _defaultSetting from '../defaultSetting'
import { useAppStore, useMenuStore, usePageStore, useThemeStore, useTopBarStore } from '../store/index'
import {
  breadcrumbStyleList,
  layoutScopeList,
  menuActiveStyleList,
  menuFillStyleList,
  menuTypeList,
  mergeAttribute,
  tabBarDblClickEventTypeList,
  tabBarStyleList,
  tabBarWidthTypeList,
  themeColorList,
  topBarPositionList,
  transitionTypeList,
} from '../utils/index'

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickRandomValue(arr: Array<{ value: string }>): string {
  return pickRandom(arr).value
}

export function useLayoutSetting() {
  const appStore = useAppStore()
  const themeStore = useThemeStore()
  const menuStore = useMenuStore()
  const pageStore = usePageStore()
  const topBarStore = useTopBarStore()

  const getSetting = () => ({
    app: appStore,
    theme: themeStore,
    menu: menuStore,
    page: pageStore,
    topBar: topBarStore,
  })

  const updateSetting = (partial: DeepPartial<LayoutConfig>) => {
    if (partial.app) {
      const merged = mergeAttribute(_defaultSetting.app, { ...appStore, ...partial.app })
      useAppStore.setState(merged)
    }
    if (partial.theme) {
      const merged = mergeAttribute(_defaultSetting.theme, { ...themeStore, ...partial.theme })
      useThemeStore.setState(merged)
    }
    if (partial.menu) {
      const merged = mergeAttribute(_defaultSetting.menu, { ...menuStore, ...partial.menu })
      useMenuStore.setState(merged)
    }
    if (partial.page) {
      const merged = mergeAttribute(_defaultSetting.page, { ...pageStore, ...partial.page })
      usePageStore.setState(merged)
    }
    if (partial.topBar) {
      const merged = mergeAttribute(_defaultSetting.topBar, { ...topBarStore, ...partial.topBar })
      merged.toolbar = {
        ..._defaultSetting.topBar.toolbar,
        ...(topBarStore.toolbar || {}),
        ...(partial.topBar.toolbar || {}),
      }
      useTopBarStore.setState(merged)
    }
  }

  const randomStyle = () => {
    // ===== theme 主题 =====
    const randomColor = pickRandom(themeColorList)
    const randomDarkMode: DarkMode = pickRandom(['0', '1', 'auto'])

    // ===== menu 菜单 =====
    const randomMenuType = pickRandomValue(menuTypeList)
    const randomMenuFillStyle = pickRandom(menuFillStyleList)
    const randomMenuActiveStyle = pickRandom(menuActiveStyleList)
    const randomSubMenuUniqueOpened = Math.random() > 0.5
    const randomSubMenuCollapse = Math.random() > 0.8
    const randomIsEnableSubMenuCollapse = Math.random() > 0.3

    // ===== page 页面 =====
    const randomTransitionType = pickRandomValue(transitionTypeList)
    const randomIsEnablePageLoadProgress = Math.random() > 0.5

    // ===== topBar 顶栏 =====
    const randomTopBarPosition = pickRandomValue(topBarPositionList)
    const randomOrder = Math.random() > 0.5
      ? ['TabBar', 'Toolbar'] as const
      : ['Toolbar', 'TabBar'] as const

    // ===== topBar.tabBar 标签栏 =====
    const randomIsEnableTabBar = Math.random() > 0.15
    const randomTabBarStyle = pickRandomValue(tabBarStyleList)
    const randomShowIcon = Math.random() > 0.3
    const randomTabBarWidthType = pickRandom(tabBarWidthTypeList).value as TabBarWidthType
    const randomDblClickEvent = pickRandom(tabBarDblClickEventTypeList).value as TabBarDblClickEventType

    // ===== topBar.toolbar 工具栏 =====
    const randomBreadcrumbStyle = pickRandomValue(breadcrumbStyleList)
    const randomIsEnableBreadcrumb = Math.random() > 0.15
    const randomIsEnableMainNav = Math.random() > 0.5
    const randomIsEnableSearch = Math.random() > 0.5
    const randomIsEnableI18n = Math.random() > 0.5
    const randomIsEnablePageReload = Math.random() > 0.5
    const randomIsEnableFullscreen = Math.random() > 0.5
    const randomIsEnableTheme = Math.random() > 0.5

    // ===== app.layout 布局居中 =====
    const randomIsCenter = Math.random() > 0.6
    const randomLayoutScope = pickRandom(layoutScopeList).value as LayoutScope
    const randomLayoutWidth = Math.floor(Math.random() * (1600 - 1200 + 1)) + 1200

    updateSetting({
      app: {
        layout: {
          isCenter: randomIsCenter,
          layoutScope: randomLayoutScope,
          width: randomLayoutWidth,
        },
      },
      theme: {
        themeColor: randomColor,
        darkMode: randomDarkMode,
      },
      menu: {
        menuType: randomMenuType as any,
        menuFillStyle: randomMenuFillStyle as any,
        menuActiveStyle: randomMenuActiveStyle as any,
        subMenuUniqueOpened: randomSubMenuUniqueOpened,
        subMenuCollapse: randomSubMenuCollapse,
        isEnableSubMenuCollapse: randomIsEnableSubMenuCollapse,
      },
      page: {
        transitionType: randomTransitionType as any,
        isEnablePageLoadProgress: randomIsEnablePageLoadProgress,
      },
      topBar: {
        position: randomTopBarPosition as any,
        order: randomOrder as any,
        tabBar: {
          isEnableTabBar: randomIsEnableTabBar,
          style: randomTabBarStyle as any,
          showIcon: randomShowIcon,
          widthType: randomTabBarWidthType,
          dblClickEvent: randomDblClickEvent,
        },
        toolbar: {
          breadcrumb: {
            style: randomBreadcrumbStyle as any,
            isEnableBreadcrumb: randomIsEnableBreadcrumb,
            isEnableMainNav: randomIsEnableMainNav,
          },
          isEnableSearch: randomIsEnableSearch,
          isEnableI18n: randomIsEnableI18n,
          isEnablePageReload: randomIsEnablePageReload,
          isEnableFullscreen: randomIsEnableFullscreen,
          isEnableTheme: randomIsEnableTheme,
        },
      },
    })
  }

  return {
    setting: getSetting(),
    updateSetting,
    randomStyle,
  }
}
