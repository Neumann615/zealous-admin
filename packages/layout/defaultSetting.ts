import type { LayoutConfig } from './types/config'

const defaultSetting: LayoutConfig = {
  app: {
    name: 'Zealous-admin',
    version: '1.0.0',
    logo: '',
    storagePrefix: 'zealous-admin-',
    storageType: 'local',
    styleClassNamePrefix: 'zealous-admin',
    isEnableMemory: true,
    isEnableMobileAccess: true,
    isEnableDynamicTitle: true,
    isEnableMourningMode: false,
    isEnableWatermark: false,
    account: {
      isEnablePermission: true,
      isEnableMultiAccount: false,
      expireMode: 'logout',
    },
    layout: {
      isCenter: false,
      layoutScope: 'outside',
      width: 1200,
    },
    homePage: {
      isEnableHomePage: true,
      title: '主页',
    },
    copyright: {
      isEnableCopyright: true,
      date: '2024',
      company: 'Zealous-admin',
      website: 'https://github.com/Neumann615/zealous-admin',
    },
  },
  theme: {
    themeColor: '#2f54eb',
    darkMode: 'auto',
    compactMode: false,
    colorWeak: false,
    happyEffect: false,
  },
  menu: {
    menuType: 'side',
    menuFillStyle: 'radius',
    menuActiveStyle: 'dot',
    subMenuUniqueOpened: false,
    subMenuCollapse: false,
    isEnableSubMenuCollapse: true,
  },
  page: {
    isEnableTransition: true,
    transitionType: 'fade-in',
    isEnablePageLoadProgress: true,
  },
  topBar: {
    order: ['TabBar', 'Toolbar'],
    position: 'static',
    tabBar: {
      isEnableTabBar: true,
      style: 'default',
      widthType: 'auto',
      width: '100%',
      showIcon: true,
      dblClickEvent: 'refresh',
    },
    toolbar: {
      isEnableToolbar: true,
      breadcrumb: {
        isEnableBreadcrumb: true,
        style: 'modern',
        isEnableMainNav: true,
      },
      toolbarOrder: ['Breadcrumb', 'Search', 'I18n', 'PageReload', 'Fullscreen', 'Theme'],
      isEnableSearch: true,
      isEnableI18n: true,
      isEnablePageReload: true,
      isEnableFullscreen: true,
      isEnableTheme: true,
    },
  },
}

export default defaultSetting