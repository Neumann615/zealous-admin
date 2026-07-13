# LayoutConfig 配置参考

`LayoutConfig` 是布局系统的核心配置接口，包含 50+ 个选项，分为五大板块。

## 配置结构

```
LayoutConfig
├── app?      应用设置
├── theme?    主题设置
├── menu?     菜单设置
├── page?     页面设置
└── topBar?   顶栏设置
```

---

## app — 应用设置

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| name | 应用名称 | `string` | - |
| version | 应用版本 | `string` | - |
| logo | Logo 路径 | `string` | - |
| storagePrefix | 存储键名前缀 | `string` | - |
| storageType | 存储类型 | `'local' \| 'session'` | `'local'` |
| isEnableMemory | 是否启用状态持久化 | `boolean` | `true` |
| isEnableMobileAccess | 是否允许移动端访问 | `boolean` | `true` |
| isEnableDynamicTitle | 是否启用动态标题 | `boolean` | `true` |
| isEnableMourningMode | 是否启用哀悼模式（页面变灰） | `boolean` | `false` |
| isEnableWatermark | 是否启用水印 | `boolean` | `false` |

### app.account — 账户设置

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| isEnablePermission | 是否启用权限控制 | `boolean` | `false` |
| isEnableMultiAccount | 是否启用多账户切换 | `boolean` | `false` |
| expireMode | 登录过期处理方式 | `'logout' \| 'prompt'` | `'logout'` |

### app.layout — 布局居中设置

控制布局容器的居中显示效果，搭配 ConfigPanel 的"布局"模块实时预览。

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| isCenter | 是否启用居中显示 | `boolean` | `false` |
| layoutScope | 居中作用范围 — `'outside'` 全局（含侧边栏）居中，`'inside'` 仅内容区居中 | `'outside' \| 'inside'` | `'outside'` |
| width | 居中最大宽度，范围 1200–1600 | `number` | `1200` |

### app.homePage — 首页设置

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| isEnableHomePage | 是否启用首页 | `boolean` | `false` |
| title | 首页标题 | `string` | - |

### app.copyright — 版权设置

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| isEnableCopyright | 是否显示版权信息 | `boolean` | `false` |
| date | 版权年份 | `string` | - |
| company | 公司名称 | `string` | - |
| website | 公司网站 | `string` | - |

---

## theme — 主题设置

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| themeColor | 主题色（HEX） | `string` | `'#1677ff'` |
| darkMode | 暗色模式 | `'1'` (开) \| `'0'` (关) \| `'auto'` (跟随系统) | `'0'` |
| compactMode | 紧凑模式（减小间距） | `boolean` | `false` |
| colorWeak | 色弱模式 | `boolean` | `false` |
| happyEffect | 快乐效果（@ant-design/happy-work-theme） | `boolean` | `false` |

---

## menu — 菜单设置

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| menuType | 菜单/布局模式 | `'side' \| 'only-side' \| 'head' \| 'only-head' \| 'simple'` | `'side'` |
| menuFillStyle | 菜单项填充风格 | `'none' \| 'radius'` | `'none'` |
| menuActiveStyle | 菜单激活指示风格 | `'none' \| 'arrow' \| 'line' \| 'dot'` | `'none'` |
| subMenuUniqueOpened | 子菜单手风琴模式 | `boolean` | `false` |
| subMenuCollapse | 侧边栏是否折叠 | `boolean` | `false` |
| isEnableSubMenuCollapse | 是否显示折叠切换按钮 | `boolean` | `true` |

---

## page — 页面设置

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| isEnableTransition | 是否启用页面过渡动画 | `boolean` | `false` |
| transitionType | 过渡动画类型 | `'slide-right' \| 'fade-in' \| 'fade-up' \| 'lightspeed-left' \| 'roll'` | `'fade-in'` |
| isEnablePageLoadProgress | 是否显示页面加载进度条 | `boolean` | `true` |

---

## topBar — 顶栏设置

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| order | 顶栏元素排序 | `['TabBar', 'Toolbar'] \| ['Toolbar', 'TabBar']` | `['TabBar', 'Toolbar']` |
| position | 顶栏定位方式 | `'static' \| 'fixed' \| 'sticky'` | `'static'` |

### topBar.tabBar — 标签栏

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| isEnableTabBar | 是否启用标签栏 | `boolean` | `false` |
| style | 标签栏样式 | `'default' \| 'card' \| 'block'` | `'default'` |
| widthType | 标签宽度模式 | `'auto' \| 'fixed' \| 'auto-min' \| 'auto-max'` | `'auto'` |
| width | 标签固定宽度（px） | `number` | - |
| showIcon | 是否显示标签图标 | `boolean` | `false` |
| dblClickEvent | 双击标签行为 | `'refresh' \| 'close' \| 'fixed' \| 'max' \| 'open'` | `'refresh'` |

### topBar.toolbar — 工具栏

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| isEnableToolbar | 是否启用工具栏 | `boolean` | `false` |
| toolbarOrder | 工具项排序 | `string[]` | `['Breadcrumb', 'Search', 'I18n', 'PageReload', 'Fullscreen', 'Theme']` |
| isEnableSearch | 是否启用全局搜索 | `boolean` | `false` |
| isEnableI18n | 是否启用国际化切换 | `boolean` | `false` |
| isEnablePageReload | 是否启用页面刷新 | `boolean` | `false` |
| isEnableFullscreen | 是否启用全屏切换 | `boolean` | `false` |
| isEnableTheme | 是否启用主题切换 | `boolean` | `false` |

### topBar.toolbar.breadcrumb — 面包屑

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| isEnableBreadcrumb | 是否启用面包屑 | `boolean` | `false` |
| style | 面包屑样式 | `'default' \| 'modern'` | `'default'` |
| isEnableMainNav | 是否在主面包屑中显示主导航 | `boolean` | `false` |
