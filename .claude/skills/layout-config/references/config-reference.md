# 配置参考文档

## 概述

本文档详细描述 zealous-admin 框架的所有配置项，对应 `packages/layout/types/config.d.ts` 中的 `LayoutConfig` 接口。

---

## 应用配置 (app)

### 基础配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `name` | string | 'zealous-admin' | 项目名称，显示在标题栏和 Logo 旁边 |
| `version` | string | '1.0.0' | 版本号 |
| `logo` | string | '' | Logo 图片地址 |
| `storagePrefix` | string | 'zealous-admin-' | 本地存储键名前缀 |
| `storageType` | 'local' \| 'session' | 'local' | 存储类型：localStorage 或 sessionStorage |
| `styleClassNamePrefix` | string | 'zealous-admin' | CSS 类名前缀 |

### 功能开关

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isEnableMemory` | boolean | true | 是否启用内存缓存（持久化） |
| `isEnableMobileAccess` | boolean | true | 是否启用移动端访问支持 |
| `isEnableDynamicTitle` | boolean | true | 是否启用动态标题（根据当前页面自动更新） |
| `isEnableMourningMode` | boolean | false | 是否启用哀悼模式（全站灰色） |
| `isEnableWatermark` | boolean | false | 是否启用水印功能 |

### 账号配置 (app.account)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isEnablePermission` | boolean | true | 是否启用权限验证 |
| `isEnableMultiAccount` | boolean | false | 是否支持多账号管理 |
| `expireMode` | 'logout' \| 'prompt' | 'logout' | 登录过期处理模式：自动退出或弹窗提示 |

### 布局配置 (app.layout)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isCenter` | boolean | false | 是否居中布局 |
| `layoutScope` | 'outside' \| 'inside' | 'outside' | 布局作用范围：外部（全屏）或内部（容器内） |
| `width` | number | 1200 | 居中布局时的宽度 |

### 主页配置 (app.homePage)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isEnableHomePage` | boolean | true | 是否启用主页 |
| `title` | string | '主页' | 主页标题 |

### 版权配置 (app.copyright)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isEnableCopyright` | boolean | true | 是否显示版权信息 |
| `date` | string | '2024' | 版权年份 |
| `company` | string | 'zealous-admin' | 公司/项目名称 |
| `website` | string | 'https://github.com/zealous-admin' | 网站地址 |

---

## 主题配置 (theme)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `themeColor` | string | '#1677ff' | 主题色（十六进制颜色值） |
| `darkMode` | '0' \| '1' \| 'auto' | '0' | 暗色模式：'0'=亮色，'1'=暗色，'auto'=跟随系统 |
| `compactMode` | boolean | false | 是否启用紧凑模式 |
| `colorWeak` | boolean | false | 是否启用色弱模式 |
| `happyEffect` | boolean | false | 是否启用快乐特效（节日装饰） |

---

## 菜单配置 (menu)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `menuType` | MenuType | 'head' | 菜单布局类型 |
| `menuFillStyle` | 'none' \| 'radius' | 'radius' | 菜单填充样式 |
| `menuActiveStyle` | 'none' \| 'arrow' \| 'line' \| 'dot' | 'dot' | 菜单激活样式 |
| `subMenuUniqueOpened` | boolean | true | 次导航是否只保持展开一个 |
| `subMenuCollapse` | boolean | false | 菜单默认折叠状态 |
| `isEnableSubMenuCollapse` | boolean | true | 是否启用菜单折叠功能 |

### MenuType 菜单类型

| 值 | 说明 |
|----|------|
| 'side' | 侧边栏菜单 |
| 'only-side' | 仅侧边栏菜单 |
| 'head' | 顶部菜单 |
| 'only-head' | 仅顶部菜单 |
| 'simple' | 精简菜单模式 |

---

## 页面配置 (page)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isEnableTransition` | boolean | true | 是否开启页面切换过渡动画 |
| `transitionType` | TransitionType | 'fade-in' | 过渡动画类型 |
| `isEnablePageLoadProgress` | boolean | true | 是否显示页面加载进度条 |

### TransitionType 动画类型

| 值 | 说明 |
|----|------|
| 'slide-right' | 右侧滑入 |
| 'fade-in' | 淡入 |
| 'fade-up' | 向上淡入 |
| 'lightspeed-left' | 光速左移 |
| 'roll' | 滚动 |

---

## 顶部工具栏配置 (topBar)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `order` | TopBarOrder | ['TabBar', 'ToolBar'] | 标签栏和工具栏的展示顺序 |
| `position` | TopBarPositionType | 'static' | 定位方式 |

### TopBarPositionType 定位类型

| 值 | 说明 |
|----|------|
| 'static' | 静态定位 |
| 'fixed' | 固定定位 |
| 'sticky' | 粘性定位 |

### 标签栏配置 (topBar.tabBar)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isEnableTabBar` | boolean | true | 是否启用标签栏 |
| `style` | TabBarStyle | 'default' | 标签页样式 |
| `widthType` | TabBarWidthType | 'auto' | 标签栏宽度模式 |
| `width` | string | '100%' | 标签栏宽度 |
| `showIcon` | boolean | true | 是否显示图标 |
| `dblClickEvent` | TabBarDblClickEventType | 'refresh' | 双击标签栏事件类型 |

#### TabBarStyle 标签页样式

| 值 | 说明 |
|----|------|
| 'default' | 默认样式 |
| 'card' | 卡片样式 |
| 'block' | 块状样式 |

#### TabBarWidthType 宽度模式

| 值 | 说明 |
|----|------|
| 'auto' | 自动宽度 |
| 'fixed' | 固定宽度 |
| 'auto-min' | 自动最小宽度 |
| 'auto-max' | 自动最大宽度 |

#### TabBarDblClickEventType 双击事件

| 值 | 说明 |
|----|------|
| 'refresh' | 刷新页面 |
| 'close' | 关闭标签 |
| 'fixed' | 固定标签 |
| 'max' | 最大化 |
| 'open' | 新窗口打开 |

### 工具栏配置 (topBar.toolbar)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isEnableToolbar` | boolean | true | 是否启用工具栏 |
| `toolbarOrder` | ToolbarOrder | ['Breadcrumb', 'Search', 'I18n', 'PageReload', 'Fullscreen', 'Theme'] | 工具栏按钮顺序 |
| `isEnableSearch` | boolean | true | 是否启用搜索功能 |
| `isEnableI18n` | boolean | true | 是否启用国际化功能 |
| `isEnablePageReload` | boolean | true | 是否启用页面重载功能 |
| `isEnableFullscreen` | boolean | true | 是否启用全屏功能 |
| `isEnableTheme` | boolean | true | 是否启用主题编辑器 |

### 面包屑配置 (topBar.toolbar.breadcrumb)

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isEnableBreadcrumb` | boolean | true | 是否启用面包屑功能 |
| `style` | BreadcrumbStyle | 'modern' | 面包屑样式 |
| `isEnableMainNav` | boolean | true | 是否显示主导航 |

#### BreadcrumbStyle 面包屑样式

| 值 | 说明 |
|----|------|
| 'default' | 默认样式 |
| 'modern' | 现代样式（带切角效果） |

---

## ToolbarOrderItem 工具栏按钮类型

| 值 | 说明 |
|----|------|
| 'Breadcrumb' | 面包屑 |
| 'Search' | 搜索 |
| 'I18n' | 国际化 |
| 'PageReload' | 页面刷新 |
| 'Fullscreen' | 全屏 |
| 'Theme' | 主题切换 |

---

## 配置修改示例

### 示例 1: 开启暗色模式和水印

```typescript
theme: {
  darkMode: '1',
},
app: {
  isEnableWatermark: true,
}
```

### 示例 2: 修改菜单为侧边栏模式

```typescript
menu: {
  menuType: 'side',
}
```

### 示例 3: 禁用部分工具栏功能

```typescript
topBar: {
  toolbar: {
    isEnableSearch: false,
    isEnableI18n: false,
    breadcrumb: {
      isEnableBreadcrumb: false,
    },
  },
}
```

### 示例 4: 修改版权信息

```typescript
app: {
  copyright: {
    date: '2026',
    company: 'My Company',
    website: 'https://example.com',
  },
}
```

---

## 注意事项

1. **持久化存储**：配置修改后会自动保存到本地存储（localStorage 或 sessionStorage），下次打开应用时生效
2. **类型约束**：配置项的值必须符合对应的类型定义，否则可能导致运行时错误
3. **主题切换**：修改 `darkMode` 为 'auto' 时，会跟随系统主题自动切换
4. **布局影响**：修改 `menuType` 会影响整体布局结构，可能需要调整其他配置以达到最佳效果
5. **动态标题**：启用 `isEnableDynamicTitle` 后，页面标题会根据当前路由自动更新