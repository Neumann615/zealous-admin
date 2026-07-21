/* 布局配置接口 */
export interface LayoutConfig {
  /* 应用配置 */
  app: {
    /* 项目名称 */
    name: string
    /* 版本号 */
    version: string
    /* Logo 地址 */
    logo: string
    /* 本地存储前缀 */
    storagePrefix: string
    /* 客户端存储方式 */
    storageType: StorageType
    /* 样式类名前缀 */
    styleClassNamePrefix: string
    /* 是否启用内存缓存 */
    isEnableMemory: boolean
    /* 是否启用移动端访问 */
    isEnableMobileAccess: boolean
    /* 是否启用动态标题 */
    isEnableDynamicTitle: boolean
    /* 是否启用水印 */
    isEnableWatermark: boolean
    /* 是否启用哀悼模式 */
    isEnableMourningMode: boolean
    /* 账号管理 */
    account: {
      /* 权限验证 */
      isEnablePermission: boolean
      /* 多账号管理 */
      isEnableMultiAccount: boolean
      /* 过期模式 */
      expireMode: ExpireMode
    }
    /* 布局配置 */
    layout: {
      /* 居中显示 */
      isCenter: boolean
      /* 作用范围 */
      layoutScope: LayoutScope
      /* 布局宽度 */
      width: number
    }
    /* 主页配置 */
    homePage: {
      /* 是否启用主页 */
      isEnableHomePage: boolean
      /* 主页标题 */
      title: string
    }
    /* 版权配置 */
    copyright: {
      /* 是否启用版权 */
      isEnableCopyright: boolean
      /* 版权年份 */
      date: string
      /* 公司/项目名称 */
      company: string
      /* 网站地址 */
      website: string
    }
  }
  /* 主题配置 */
  theme: {
    /* 主题色 */
    themeColor: string
    /* 暗色模式 */
    darkMode: DarkMode
    /* 紧凑模式 */
    compactMode: boolean
    /* 色弱模式 */
    colorWeak: boolean
    /* 快乐特效 */
    happyEffect: boolean
  }
  /* 菜单配置 */
  menu: {
    /* 菜单布局类型 */
    menuType: MenuType
    /* 菜单填充样式 */
    menuFillStyle: MenuFillStyle
    /* 菜单激活样式 */
    menuActiveStyle: MenuActiveStyle
    /* 次导航只保持展开一个 */
    subMenuUniqueOpened: boolean
    /* 菜单默认折叠状态 */
    subMenuCollapse: boolean
    /* 启用菜单折叠功能 */
    isEnableSubMenuCollapse: boolean
  }
  /* 主内容区配置 */
  page: {
    /* 开启页面切换过渡动画 */
    isEnableTransition: boolean
    /* 过渡动画类型 */
    transitionType: TransitionType
    /* 载入进度条 */
    isEnablePageLoadProgress: boolean
  }
  /* 顶部工具栏配置 */
  topBar: {
    /* 控制标签栏和工具栏的展示顺序 */
    order: TopBarOrder
    /* 定位方式 */
    position: TopBarPositionType
    /* 标签栏配置 */
    tabBar: {
      /* 启用标签栏 */
      isEnableTabBar: boolean
      /* 标签页样式 */
      style: TabBarStyle
      /* 标签栏宽度模式 */
      widthType: TabBarWidthType
      /* 标签栏宽度 */
      width: string
      /* 显示图标 */
      showIcon: boolean
      /* 双击标签栏事件类型 */
      dblClickEvent: TabBarDblClickEventType
    }
    /* 工具栏配置 */
    toolbar: {
      /* 启用工具栏  */
      isEnableToolbar: boolean
      /* 面包屑配置 */
      breadcrumb: {
        /* 启用面包屑功能 */
        isEnableBreadcrumb: boolean
        /* 面包屑样式 */
        style: BreadcrumbStyle
        /* 是否显示主导航 */
        isEnableMainNav: boolean
      }
      /* 启用搜索功能 */
      isEnableSearch: boolean
      /* 启用国际化功能 */
      isEnableI18n: boolean
      /* 启用页面重载功能 */
      isEnablePageReload: boolean
      /* 启用全屏功能 */
      isEnableFullscreen: boolean
      /* 启用主题编辑器 */
      isEnableTheme: boolean
      toolbarOrder: ToolbarOrder
    }
  }
}

/* 过渡动画类型 */
export type TransitionType
  = | 'slide-right'
    | 'fade-in'
    | 'fade-up'
    | 'lightspeed-left'
    | 'roll'

/* 过期模式 退出到登录页 | 弹窗提示  */
export type ExpireMode = 'logout' | 'prompt'

/* 布局作用范围 */
export type LayoutScope = 'outside' | 'inside'

/* 菜单布局类型 */
export type MenuType = 'side' | 'only-side' | 'head' | 'only-head' | 'simple'

/* 暗色模式 */
export type DarkMode = '1' | '0' | 'auto'

/* 菜单填充样式 */
export type MenuFillStyle = 'none' | 'radius'

/* 菜单激活样式 */
export type MenuActiveStyle = 'none' | 'arrow' | 'line' | 'dot'

/* 面包屑样式 */
export type BreadcrumbStyle = 'default' | 'modern'

/* 顶栏定位类型 */
export type TopBarPositionType = 'static' | 'fixed' | 'sticky'

/* 顶栏渲染顺序 */
export type TopBarOrder = ['TabBar', 'Toolbar'] | ['Toolbar', 'TabBar']

/* 标签页样式 */
export type TabBarStyle = 'default' | 'card' | 'block'

/* 标签栏点击事件 */
export type TabBarDblClickEventType
  = | 'refresh'
    | 'close'
    | 'fixed'
    | 'max'
    | 'open'

/* 标签栏宽度 */
export type TabBarWidthType = 'auto' | 'fixed' | 'auto-min' | 'auto-max'

/* 存储类型 */
export type StorageType = 'local' | 'session'

export interface MenuItem {
  icon: string
  selectIcon?: string
  id: string
  key: string
  label: string
  children?: MenuData
}

export type MenuData = Array<MenuItem>

export type ToolbarOrderItem = 'Breadcrumb' | 'Search' | 'I18n' | 'PageReload' | 'Fullscreen' | 'Theme'

export type ToolbarOrder = Array<ToolbarOrderItem>
