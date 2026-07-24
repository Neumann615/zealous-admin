# 介绍

zealous-admin 是一个基于 **React 19 + Vite 8 + Ant Design 6** 构建的现代化后台管理系统模板。它采用 pnpm monorepo 架构，将核心功能拆分为多个独立包。

## 核心包

| 包名 | 说明 |
|------|------|
| `@zealous-admin/layout` | 布局核心包：21 个组件（Layout/ConfigPanel/TabBar/Menu/Toolbar/KeepAlive/Search 等）、7 个 Store、7 个 Hooks、HTTP 实例、用户/权限体系 |
| `@zealous-admin/theme` | 8 套主题：default（支持主题色/暗色自定义）+ MUI / Bootstrap / Glass / Illustration / Cartoon / Shadcn / Hacker |
| `@zealous-admin/components` | 8 个通用业务组件：图标选择器、链接预览、Markdown 渲染、跑马灯、图案背景、流光文字、滑块验证码、闪烁文字 |

## 特性

- **🎨 8 套主题** — default 支持亮色/暗色/跟随系统 + 主题色自由切换；7 种定制主题一键应用
- **📐 多种布局** — side / only-side / head / only-head / simple 五种布局 + 移动端 Drawer 抽屉
- **📱 移动端响应式** — 窄屏自动切换汉堡菜单 + 抽屉导航，可配置移动端访问开关
- **🖼️ 菜单激活图标** — 选中菜单项时自动切换 activeIcon，父节点链路级联高亮
- **🧩 业务组件** — 图标选择器（32 个图标库）、链接预览、跑马灯、流光文字、滑块验证码等
- **🔧 可视化配置** — 50+ 配置项（含主题类型选择），复制配置导出为 TypeScript 代码
- **🏷️ 多标签页** — 拖拽排序、右键菜单、固定标签、图标激活态切换，3 种风格
- **✳️ 全局路由搜索** — 工具栏搜索按钮，模糊匹配标题/URL，键盘导航
- **🧠 页面 KeepAlive** — 双层渲染架构，缓存页保持组件状态不丢失
- **📦 Monorepo** — pnpm workspace，包独立发布
- **🗄️ 内置后端** — Express + SQLite，RBAC 完整 CRUD

## 项目结构

```
zealous-admin/
├── packages/
│   ├── components/     # @zealous-admin/components
│   ├── layout/         # @zealous-admin/layout
│   └── theme/          # @zealous-admin/theme
├── service/            # 后端服务（Express + node:sqlite，用户/角色/菜单/字典管理）
├── src/                # 主应用入口（路由、页面）
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
