# 快速开始

本指南将帮助你在本地启动 zealous-admin 开发环境，并了解三个核心包的基本用法。

## 前置要求

- [Node.js](https://nodejs.org/) >= 22.14.0
- [pnpm](https://pnpm.io/) >= 11.8.0

## 克隆项目

```bash
git clone https://github.com/Neumann615/zealous-admin.git
cd zealous-admin
```

## 安装依赖

```bash
pnpm install
```

## 启动开发服务器

```bash
# 前端开发服务器（端口 3509）
pnpm dev

# 后端服务（端口 3508）
cd service && pnpm dev
```

项目前端默认运行在 `http://localhost:3509`，后端 API 在 `http://localhost:3508`。

## 快速使用

### 使用布局系统

```tsx
import type { LayoutConfig } from '@zealous-admin/layout'
import { Layout, LayoutProvider, Logo } from '@zealous-admin/layout'

const config: LayoutConfig = {
  app: {
    name: 'zealous-admin',
    logo: '/logo.svg',
  },
  theme: {
    themeColor: '#1677ff',
    darkMode: '0',
  },
  menu: {
    menuType: 'side',
  },
  topBar: {
    tabBar: { isEnableTabBar: true },
    toolbar: { isEnableToolbar: true },
  },
}

const menuData = [
  {
    id: '1',
    key: '/dashboard',
    label: '仪表盘',
    icon: 'ai:DashboardOutlined',
  },
]

function App() {
  return (
    <LayoutProvider
      menuData={menuData}
      defaultSetting={config}
    >
      <Layout />
    </LayoutProvider>
  )
}
```

### 使用组件

```tsx
import { ZaMarquee, ZaShinyText, ZaSparklesText } from '@zealous-admin/components'

// 跑马灯
<ZaMarquee pauseOnHover gradient>
  <span>重要通知：系统将于今晚进行维护升级</span>
</ZaMarquee>

// 流光文字
<ZaShinyText text="zealous-admin" speed="fast" />

// 闪烁文字
<ZaSparklesText text="欢迎回来" shapes={['star', 'four-point-star']} />

// Logo 组件
<Logo size={32} />
```

### 使用主题

```tsx
import { useGlassTheme } from '@zealous-admin/theme'
import { ConfigProvider } from 'antd'

function App() {
  const themeConfig = useGlassTheme()
  return <ConfigProvider {...themeConfig}>{/* 你的应用 */}</ConfigProvider>
}
```

## 下一步

- 查看 [组件文档](/components/) 了解所有可用组件及其 API
- 查看 [布局配置](/layout/layout-config) 了解完整的配置选项
- 查看 [主题系统](/theme/) 了解 4 套内置主题
