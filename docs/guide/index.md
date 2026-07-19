# 介绍

zealous-admin 是一个基于 **React 19 + Vite 8 + Ant Design 6** 构建的现代化后台管理系统模板。它采用 pnpm monorepo 架构，将核心功能拆分为多个独立包。

## 核心包

| 包名 | 说明 |
|------|------|
| `@zealous-admin/components` | 业务组件库：图标选择器、链接预览、跑马灯、流光文字、滑块验证码、闪烁文字等 |
| `@zealous-admin/layout` | 完整的后台布局系统：5 种布局模式、菜单/标签栏/面包屑/工具栏、可视化设置面板 |
| `@zealous-admin/theme` | 4 套内置主题：Bootstrap、Glass（毛玻璃）、Illustration（插画风）、MUI（Material Design 3） |

## 特性

- **🎨 主题系统** — 亮色/暗色/自动模式、自定义主题色、紧凑模式、色弱模式
- **📐 多种布局** — side / only-side / head / only-head / simple 五种布局 + 移动端 Drawer 抽屉
- **📱 移动端响应式** — 窄屏自动切换汉堡菜单 + 抽屉导航，可配置移动端访问开关
- **🧩 业务组件** — 图标选择器（32 个图标库）、链接预览、跑马灯、流光文字、滑块验证码等
- **🔧 可视化配置** — 50+ 配置项，实时预览
- **🏷️ 多标签页** — 拖拽排序、右键菜单、固定标签，3 种风格
- **📦 Monorepo** — pnpm workspace，包独立发布

## 项目结构

```
zealous-admin/
├── packages/
│   ├── components/     # @zealous-admin/components
│   ├── layout/         # @zealous-admin/layout
│   └── theme/          # @zealous-admin/theme
├── src/                # 主应用入口（路由、状态管理、页面）
├── docs/               # 文档站（VitePress）
└── public/             # 静态资源
```

## 技术栈

| 技术 | 版本 |
|------|------|
| React | 19.x |
| Vite | 8.x |
| TypeScript | 5.x |
| Ant Design | 6.x |
| Zustand | 5.x |
| React Router | 7.x |
| pnpm | 11.x |

## 浏览器支持

现代浏览器（Chrome、Firefox、Safari、Edge），不支持 IE。
