# Zealous-admin

一个基于 React + Vite + Ant Design 构建的现代化后台管理系统模板。

## 功能特性

- 🎨 **主题系统** - 支持亮色/暗色/跟随系统模式切换，12 种主题色，紧凑模式，色弱模式，快乐特效
- 📐 **5 种布局模式** - side / only-side / head / only-head / simple，适配不同业务场景
- 📏 **布局居中显示** - 支持 inside（仅内容区）/ outside（全局）两种居中作用范围，自定义居中宽度
- 🎲 **风格实验室** - 一键随机切换所有视觉配置，快速探索框架风格组合
- 🔧 **可视化配置面板** - 实时预览效果，支持复制配置导出
- 🏷️ **多标签页导航** - 拖拽排序、右键菜单、固定标签、3 种风格，支持上下布局适配
- 🌐 **语言切换** - 工具栏支持多语言切换入口
- 📦 **状态管理** - 基于 Zustand 的轻量级状态管理，支持 localStorage 持久化
- 🎯 **权限控制** - 路由权限与菜单权限控制
- 🧩 **组件库** - 内置 9 个自定义组件（图标选择器、跑马灯、流光文字、滑块验证码、图案背景等）

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

### 工具库
- [ahooks](https://ahooks.js.org/) - React Hooks 工具库
- [axios](https://axios-http.com/) - HTTP 请求库
- [classnames](https://github.com/JedWatson/classnames) - 样式类名拼接
- [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) - 拖拽功能
- [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) - 代码高亮

### 图表与图形
- [@antv/g6](https://g6.antv.antgroup.com/) - 图可视化引擎
- [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) - 可拖拽网格布局

### 图标
- [react-icons](https://react-icons.github.io/react-icons/) - 32+ 图标库集合
- [@icon-park/react](https://iconpark.oceanengine.com/) - IconPark 图标
- [@ant-design/icons](https://ant.design/components/icon-cn) - Ant Design 图标

### 动画效果
- [Animate.css](https://animate.style/) - CSS 动画库
- [React Transition Group](https://github.com/reactjs/react-transition-group) - React 过渡动画
- View Transitions API - 视图过渡动画

### 其他
- [React Markdown](https://github.com/remarkjs/react-markdown) - Markdown 渲染
- [CodeMirror](https://codemirror.net/) - 代码编辑器
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先 CSS 框架

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

### 代码检查

```bash
pnpm lint
```

## 项目结构

```
zealous-admin/
├── docs/                        # 文档
│   ├── components/              # 组件文档
│   ├── guide/                   # 指南文档
│   ├── layout/                  # 布局文档
│   └── theme/                   # 主题文档
├── packages/                    # 子包（Monorepo）
│   ├── components/              # 组件库
│   │   ├── IconPicker/          # 图标选择器
│   │   ├── LinkPreview/         # 链接预览
│   │   ├── Markdown/            # Markdown 渲染
│   │   ├── Marquee/             # 跑马灯
│   │   ├── PatternBg/           # 图案背景
│   │   ├── ShinyText/           # 流光文字
│   │   ├── SliderCaptcha/       # 滑块验证码
│   │   └── SparklesText/        # 闪烁文字
│   ├── layout/                  # 布局包
│   │   ├── components/          # 布局组件
│   │   │   ├── Breadcrumb/      # 面包屑
│   │   │   ├── ConfigPanel/     # 配置面板
│   │   │   ├── Header/          # 头部
│   │   │   ├── TabBar/          # 标签栏
│   │   │   ├── Toolbar/         # 工具栏
│   │   │   ├── UserInfo/        # 用户信息
│   │   │   └── ...
│   │   ├── hooks/               # 自定义 Hooks
│   │   ├── store/               # 状态管理
│   │   └── utils/               # 工具函数
│   └── theme/                   # 主题包
│       ├── bootstrapTheme.ts    # Bootstrap 主题
│       ├── glassTheme.ts        # 玻璃拟态主题
│       ├── illustrationTheme.ts # 插画主题
│       └── muiTheme.ts          # Material UI 主题
├── src/                         # 主应用
│   ├── apis/                    # API 接口
│   ├── assets/                  # 静态资源
│   ├── pages/                   # 页面组件
│   │   ├── index/               # 首页
│   │   └── mall/                # 商城管理
│   ├── store/                   # 应用状态
│   ├── types/                   # TypeScript 类型定义
│   ├── utils/                   # 工具函数
│   ├── App.tsx                  # 应用入口
│   └── main.tsx                 # 入口文件
├── public/                      # 静态资源
├── pnpm-workspace.yaml          # pnpm 工作区配置
├── vite.config.ts               # Vite 主配置
├── tsconfig.json                # TypeScript 配置
└── package.json                 # 根目录依赖
```

## 子包说明

### @zealous-admin/components

提供丰富的自定义 UI 组件：

- **ZaIcon** - 动态图标渲染器，支持 32+ 个主流图标库
- **ZaIconPicker** - 图标选择器，带侧边栏搜索和网格浏览
- **ZaLinkPreview** - 链接悬停预览卡片
- **ZaMarkdown** - Markdown 渲染组件
- **ZaMarquee** - 跑马灯/无限滚动
- **ZaPatternBg** - 图案背景（grid/dot 两种图案）
- **ZaShinyText** - 流光文字动效
- **ZaSliderCaptcha** - 滑块验证码（3 种模式）
- **ZaSparklesText** - 闪烁粒子文字动效

### @zealous-admin/layout

提供完整的布局系统：

- **Layout** - 主布局组件
- **LayoutProvider** - 布局配置提供者
- **Header** - 头部组件（集成 TabBar 和 Toolbar）
- **TabBar** - 标签栏管理
- **Toolbar** - 工具栏（面包屑、全屏、主题切换）
- **Breadcrumb** - 面包屑导航
- **UserInfo** - 用户信息组件

### @zealous-admin/theme

提供多种预设主题风格：

- **useBootstrapTheme** - Bootstrap 风格主题
- **useGlassTheme** - 玻璃拟态主题
- **useIllustrationTheme** - 插画风格主题
- **useMuiTheme** - Material UI 风格主题

## 配置说明

### 布局配置

在 `packages/layout/defaultSetting.ts` 中可以修改默认配置，共计 50+ 配置项：

```typescript
// 常用配置示例
const defaultSetting: LayoutConfig = {
  app: {
    layout: {
      isCenter: false, // 是否居中显示
      layoutScope: 'outside', // 居中作用范围: 'outside' | 'inside'
      width: 1200, // 居中宽度 (px)
    },
  },
  theme: {
    themeColor: '#2f54eb',
    darkMode: 'auto', // '0' | '1' | 'auto'
    compactMode: false,
    happyEffect: false,
  },
  menu: {
    menuType: 'side', // 布局模式
    menuActiveStyle: 'dot', // 激活指示: 'none' | 'arrow' | 'line' | 'dot'
    subMenuUniqueOpened: false,
  },
  page: {
    transitionType: 'fade-in',
    isEnablePageLoadProgress: true,
  },
  topBar: {
    toolbar: {
      breadcrumb: {
        isEnableBreadcrumb: true,
        style: 'modern',
      },
    },
  },
}
```

### 路由配置

基于文件系统的路由，在 `src/pages/` 目录下创建文件即可自动生成路由。

## 开发指南

### Git 提交规范

```bash
git add .
git commit -m "feat: 添加新功能"
git push origin main
```

### Commit 类型

- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

## 浏览器支持

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## License

[MIT](LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request。
