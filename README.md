# Zealous-admin

一个基于 React + Vite + Ant Design 构建的现代化后台管理系统模板。

## 功能特性

- 🎨 **8 套主题** — default 支持亮色/暗色/跟随系统 + 主题色自由切换；MUI/Bootstrap/Glass/Illustration/Cartoon/Shadcn/Hacker 七种定制主题一键应用
- 📐 **5 种布局 + 移动端响应式** — side / only-side / head / only-head / simple + 居中显示（inside/outside），窄屏自动切换 Drawer 抽屉菜单
- � **自包含权限体系** — 登录/登出/用户信息全部封装在 layout 包，401 过期自动分流（logout / prompt），HTTP 拦截器内置 token 注入
- 🔧 **可视化配置面板** — 50+ 配置项实时预览，风格实验室一键随机切换所有视觉配置，支持复制配置导出为 TypeScript 代码
- 🏷️ **多标签页导航** — 拖拽排序、右键菜单、固定标签、图标激活态切换、3 种风格，支持上下布局适配
- 🧩 **8 个业务组件** — 图标选择器（32 个图标库）、链接预览、Markdown 渲染、跑马灯、图案背景、流光文字、滑块验证码、闪烁文字
- 🧠 **页面 KeepAlive** — 双层渲染架构，缓存页保持组件状态不丢失，非缓存页保留过渡动画，外部配置缓存列表
- 🗄️ **内置后端服务** — Express + SQLite，用户/角色/菜单/字典完整 CRUD，JWT 认证，菜单 path 自动计算

## 技术栈

### 核心框架
- [React 19](https://react.dev/) - UI 框架
- [Vite](https://vitejs.dev/) - 构建工具
- [React Router](https://reactrouter.com/) - 路由管理
- [Zustand](https://zustand-demo.pmnd.rs/) - 状态管理

### UI 组件
- [Ant Design 6](https://ant-design.antgroup.com/index-cn) - UI 组件库
- [Ant Design Pro Components](https://procomponents.ant.design/) - 业务组件
- [Ant Design Charts](https://ant-design-charts.antgroup.com/) - 图表组件
- [Ant Design Style](https://ant-design.github.io/antd-style/) - CSS-in-JS 样式方案

### 图标
- [react-icons](https://react-icons.github.io/react-icons/) - 32+ 图标库集合
- [@icon-park/react](https://iconpark.oceanengine.com/) - IconPark 图标
- [@ant-design/icons](https://ant.design/components/icon-cn) - Ant Design 图标

### 工具库
- [ahooks](https://ahooks.js.org/) - React Hooks 工具库
- [axios](https://axios-http.com/) - HTTP 请求库
- [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) - 拖拽功能
- [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) - 代码高亮

### 图表与图形
- [@antv/g6](https://g6.antv.antgroup.com/) - 图可视化引擎
- [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) - 可拖拽网格布局
- [ECharts](https://echarts.apache.org/) - 数据可视化图表
- [Three.js](https://threejs.org/) - 3D 图形渲染

### 动画效果
- [Animate.css](https://animate.style/) - CSS 动画库
- [React Transition Group](https://github.com/reactjs/react-transition-group) - React 过渡动画
- View Transitions API - 视图过渡动画

### 其他
- [React Markdown](https://github.com/remarkjs/react-markdown) - Markdown 渲染
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先 CSS 框架

### 后端
- [Express](https://expressjs.com/) - Node.js Web 框架
- [node:sqlite](https://nodejs.org/api/sqlite.html) - 内置 SQLite 数据库
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - JWT 认证

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
# 前端（端口 3509）
pnpm dev

# 后端服务（端口 3508）
cd service && pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

### 构建子包（库模式）

```bash
pnpm build:lib
```

## 项目结构

```
zealous-admin/
├── docs/                        # 文档站（VitePress）
│   ├── components/              # 组件文档
│   ├── guide/                   # 指南文档
│   ├── layout/                  # 布局文档
│   └── theme/                   # 主题文档
├── packages/                    # 子包（Monorepo）
│   ├── components/              # 通用组件库
│   │   ├── IconPicker/          # 图标选择器 + 渲染器
│   │   ├── LinkPreview/         # 链接悬停预览
│   │   ├── Markdown/            # Markdown 渲染
│   │   ├── Marquee/             # 跑马灯滚动
│   │   ├── PatternBg/           # 图案背景
│   │   ├── ShinyText/           # 流光文字
│   │   ├── SliderCaptcha/       # 滑块验证码
│   │   └── SparklesText/        # 闪烁粒子文字
│   ├── layout/                  # 布局核心包
│   │   ├── components/          # 21 个布局组件
│   │   ├── hooks/               # 7 个自定义 Hooks
│   │   ├── store/               # 7 个 Zustand Store
│   │   ├── types/               # 6 个类型定义
│   │   ├── utils/               # HTTP 实例 + 工具函数
│   │   ├── themeMap.ts          # 主题类型映射
│   │   └── defaultSetting.ts    # 默认布局配置
│   └── theme/                   # 主题包（7 套预设主题）
│       ├── bootstrapTheme.ts    # Bootstrap 经典
│       ├── cartoonTheme.ts      # 卡通漫画风
│       ├── glassTheme.ts        # 毛玻璃
│       ├── hackerTheme.ts       # 黑客终端
│       ├── illustrationTheme.ts # 手绘插画
│       ├── muiTheme.ts          # Material Design 3
│       └── shadcnTheme.ts       # shadcn/ui
├── service/                     # 后端 API 服务
│   └── src/
│       ├── db/                  # SQLite 数据库
│       ├── lib/                 # JWT、日期、响应格式
│       ├── middleware/          # 认证中间件
│       └── routes/              # admin/dict/menu/role 路由
├── src/                         # 主应用
│   ├── apis/                    # API 请求层（admin/dict/menu/role）
│   ├── pages/                   # 页面
│   │   ├── login.tsx            # 登录页
│   │   ├── index.tsx            # 主入口路由
│   │   └── index/
│   │       ├── demo/            # 演示页面（组件/Dashboard/功能）
│   │       └── system/          # 系统管理（用户/角色/菜单/字典）
│   ├── App.tsx                  # 应用入口
│   └── main.tsx                 # 启动文件
├── public/                      # 静态资源
├── pnpm-workspace.yaml          # pnpm 工作区配置
└── package.json                 # 根目录依赖
```

## 子包说明

### @zealous-admin/layout

布局核心包，提供完整的后台管理系统骨架。是一个**自包含**的基础设施层，外部只需关注页面逻辑本身。

| 模块 | 说明 |
|------|------|
| **Layout** | 零参数渲染的布局外壳，UserInfo 内部闭环获取用户信息/登出 |
| **LayoutProvider** | 上下文提供者，初始化主题/菜单/页面等全部状态 |
| **http** | Axios 实例，内置 token 注入、401 过期分流（logout/prompt） |
| **user store** | 用户信息 + 登录/登出/获取用户信息 API |
| **useAuth** | 登录/登出 Hook + 命令式方法（loginAction/logoutAction） |
| **ReLoginModal** | 401 过期重新登录弹窗 |
| **ConfigPanel** | 可视化配置面板，支持主题类型切换 |
| **KeepAlive** | 页面缓存保持组件状态 |
| **Search** | 全局路由搜索 |

**导出清单**：

```tsx
// 组件
import { Layout, LayoutProvider, Logo } from '@zealous-admin/layout'

// Hooks
import {
  useAppMessage, useControlTab, useFireworks,
  useLayoutSetting, useMaximize,
  useLogin, useLogout, useThemeByType,
} from '@zealous-admin/layout'

// 命令式方法
import { loginAction, logoutAction } from '@zealous-admin/layout'

// 状态
import { useAppStore, useUserStore, useThemeStore, useMenuStore, usePageStore, useTopBarStore } from '@zealous-admin/layout'

// 类型（type-only export）
import type { Admin, CommonResult, CommonPage, LoginParam, UserInfo, Menu, Role, DictType, DictData, LayoutConfig } from '@zealous-admin/layout'

// HTTP 实例
import { http } from '@zealous-admin/layout'
```

### @zealous-admin/theme

提供 7 套独立主题 Hook + default 默认主题，通过 `useThemeByType` 自动映射，在 ConfigPanel 中一键切换。

| 主题 | Hook | 设计风格 |
|------|------|----------|
| Default | — | 默认主题，支持主题色/暗色自定义 |
| MUI | `useMuiTheme` | Material Design 3，波纹动效 |
| Bootstrap | `useBootstrapTheme` | Bootstrap 经典，渐变按钮 |
| Glass | `useGlassTheme` | 毛玻璃拟态，半透明模糊 |
| Illustration | `useIllustrationTheme` | 手绘插画风，粗描边 |
| Cartoon | `useCartoonTheme` | 卡通漫画风，珊瑚红 + 偏移投影 |
| Shadcn | `useShadcnTheme` | shadcn/ui 极简风格 |
| Hacker | `useHackerTheme` | 黑客终端，绿色矩阵 |

### @zealous-admin/components

提供 8 个通用业务组件：

- **ZaIcon** — 动态图标渲染器，支持 32+ 个图标库
- **ZaIconPicker** — 图标选择器，侧边栏搜索 + 网格浏览
- **ZaLinkPreview** — 链接悬停预览卡片
- **ZaMarkdown** — Markdown 渲染组件
- **ZaMarquee** — 跑马灯/无限滚动
- **ZaPatternBg** — 图案背景（grid/dot）
- **ZaShinyText** — 流光文字动效
- **ZaSliderCaptcha** — 滑块验证码（3 种模式）
- **ZaSparklesText** — 闪烁粒子文字动效

## 配置说明

### 布局配置

在 `packages/layout/defaultSetting.ts` 中修改默认配置，共计 50+ 配置项：

```typescript
const defaultSetting: LayoutConfig = {
  app: {
    name: 'zealous-admin',
    layout: { isCenter: false, layoutScope: 'outside', width: 1200 },
    account: { isEnablePermission: false, expireMode: 'logout' },
    isEnableDynamicTitle: true,
    isEnableMobileAccess: true,
  },
  theme: {
    themeType: 'default',      // 主题类型（default 支持主题色/暗色切换）
    themeColor: '#2f54eb',     // 仅 default 主题生效
    darkMode: 'auto',          // '0' | '1' | 'auto'
    compactMode: false,
    happyEffect: false,
  },
  menu: {
    menuType: 'side',
    menuActiveStyle: 'dot',
    subMenuUniqueOpened: false,
    isEnableSubMenuCollapse: true,
  },
  page: {
    transitionType: 'fade-in',
    isEnablePageLoadProgress: true,
  },
  topBar: {
    order: ['TabBar', 'Toolbar'],
    tabBar: { isEnableTabBar: true, style: 'card', showIcon: true },
    toolbar: {
      isEnableToolbar: true,
      breadcrumb: { isEnableBreadcrumb: true, style: 'modern' },
    },
  },
}
```

## 后端服务

项目内置 Express + SQLite 后端，提供完整的 RBAC API：

| 模块 | 路由 | 说明 |
|------|------|------|
| 认证 | `POST /admin/login`、`/admin/logout`、`GET /admin/info` | JWT 登录/登出/获取用户信息 |
| 管理员 | `GET/POST/PUT/DELETE /admin/:id` | 用户 CRUD |
| 角色 | `GET/POST/PUT/DELETE /role/:id` | 角色 CRUD + 菜单分配 |
| 菜单 | `GET/POST/PUT/DELETE /menu/:id` | 菜单 CRUD + path 自动计算 |
| 字典 | `GET/POST/PUT/DELETE /dict-type/:id`、`/dict-data/:id` | 字典类型 + 字典数据管理 |

```bash
# 启动后端
cd service && pnpm dev

# 默认账号
# admin / admin123（管理员）
# test / test123（测试用户）
```

## 开发指南

### Git 提交规范

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `refactor` | 代码重构 |
| `docs` | 文档更新 |
| `chore` | 构建/工具相关 |

## 浏览器支持

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## License

[MIT](LICENSE)
