# 布局总览

`@zealous-admin/layout` 是 zealous-admin 的布局核心，提供完整的后台管理界面框架。

## 核心组成

| 模块 | 说明 |
|------|------|
| `LayoutProvider` | 上下文提供者，初始化主题、菜单、页面等状态 |
| `Layout` | 布局外壳组件，渲染完整的页面结构 |
| `LayoutConfig` | 完整的 TypeScript 配置接口（50+ 选项） |

## 导出列表

```tsx
import {
  Layout, // 布局外壳组件
  LayoutConfig, // TypeScript 配置类型
  LayoutProvider, // 布局上下文提供者
  Logo, // 项目 Logo 组件（内置 ZA 图标 SVG）
  useControlTab, // 标签页/导航控制 Hook
  useLayoutSetting, // 布局配置读写 Hook
  useAppMessage, // antd message/modal 上下文
} from '@zealous-admin/layout'
```

## 特性一览

- **5 种布局模式** — side / only-side / head / only-head / simple
- **菜单系统** — 多级嵌套、图标映射、激活图标（activeIcon）选中切换 + 父节点链路级联、4 种激活指示风格
- **多标签页** — default / card / block 三种样式，拖拽排序，图标激活态切换
- **面包屑** — default / modern 两种样式
- **工具栏** — 可配置工具项、拖拽排序
- **布局居中显示** — outside（全局）/ inside（内容区）两种作用范围，自定义宽度
- **Logo 组件** — 内置 ZA 图标 SVG，支持点击跳转首页
- **设置面板** — 可视化配置所有选项，实时预览
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
