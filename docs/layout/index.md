# 布局总览

`@zealous-admin/layout` 是 zealous-admin 的布局核心，提供完整的后台管理界面框架。是一个**自包含**的基础设施层，将 HTTP、用户认证、权限、主题、菜单等全部封装在内，外部只需关注页面逻辑。

## 核心组成

| 模块 | 说明 |
|------|------|
| `LayoutProvider` | 上下文提供者，初始化主题、菜单、页面、用户等全部状态 |
| `Layout` | 布局外壳组件，零参数渲染 |
| `LayoutConfig` | 完整的 TypeScript 配置接口（50+ 选项） |
| `http` | Axios 实例，内置 token 注入 + 401 过期分流 |
| `user store` | 用户状态管理，内置 login/logout/getInfo API |
| `useAuth` | 登录/登出 Hook + 命令式方法 |
| `themeMap` | 主题类型 → ConfigProviderProps 映射 |

## 导出清单

```tsx
// 组件
import { Layout, LayoutProvider, Logo } from '@zealous-admin/layout'

// Hooks
import {
  useAppMessage,    // antd message/modal 上下文
  useControlTab,    // 标签页/导航控制
  useFireworks,     // 彩带特效
  useLayoutSetting, // 布局配置读写
  useMaximize,      // 页面全屏
  useLogin,         // 登录 Hook（自动管理 loading）
  useLogout,        // 登出 Hook（自动清持久化 + 跳转）
  useThemeByType,   // 主题类型映射
} from '@zealous-admin/layout'

// 命令式方法（非组件场景使用）
import { loginAction, logoutAction } from '@zealous-admin/layout'

// 状态
import {
  useAppStore,
  useUserStore,     // 用户信息 + login/logout/getInfo
  useThemeStore,
  useMenuStore,
  usePageStore,
  useTopBarStore,
} from '@zealous-admin/layout'

// 类型（type-only export）
import type {
  Admin, CommonResult, CommonPage, LoginParam, UserInfo,
  Menu, Role, DictType, DictData, LayoutConfig,
} from '@zealous-admin/layout'

// HTTP 实例
import { http } from '@zealous-admin/layout'
```

## 特性一览

- **5 种布局模式** — side / only-side / head / only-head / simple
- **8 套主题** — default（支持主题色/暗色自定义）+ 7 种定制主题
- **菜单系统** — 多级嵌套、图标映射、激活图标（activeIcon）选中切换 + 父节点链路级联、4 种激活指示风格
- **多标签页** — default / card / block 三种样式，拖拽排序，图标激活态切换
- **面包屑** — default / modern 两种样式
- **工具栏** — 可配置工具项、拖拽排序、全局路由搜索
- **布局居中显示** — outside（全局）/ inside（内容区）两种作用范围，自定义宽度
- **Logo 组件** — 内置 ZA 图标 SVG，支持点击跳转首页
- **设置面板** — 50+ 配置项可视化配置，主题类型切换，复制配置导出
- **用户/权限** — 登录/登出/用户信息全部内置，401 过期自动分流（直接退出 / 弹窗重登）
- **页面 KeepAlive** — 双层渲染架构，缓存页保持组件状态
- **状态持久化** — 基于 Zustand + localStorage/sessionStorage
- **响应式** — 移动端自动切换 Drawer 抽屉菜单（< 700px），面包屑自动隐藏

## 安装使用

```bash
pnpm add @zealous-admin/layout
```

```tsx
import { Layout, LayoutProvider } from '@zealous-admin/layout'

function App() {
  return (
    <LayoutProvider menuData={[]} defaultSetting={{}}>
      <Layout />
    </LayoutProvider>
  )
}
```

详细了解请查看各模块文档。
