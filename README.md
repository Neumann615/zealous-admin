# Zealous-admin

基于 React 19 + Vite + Ant Design 6 的现代化后台管理系统模板，开箱即用。

## 功能特性

- 🎨 **8 套主题** — 默认主题支持亮色/暗色/主题色自由切换，另含 MUI、Bootstrap、Glass、Illustration、Cartoon、Shadcn、Hacker 七种定制主题
- 📐 **5 种布局 + 响应式** — side / only-side / head / only-head / simple，支持居中布局，窄屏自动切换 Drawer 抽屉菜单
- 🔐 **自包含权限体系** — 登录/登出/用户信息封装在 layout 包，401 过期自动分流，HTTP 拦截器内置 token 注入
- 🔧 **可视化配置面板** — 50+ 配置项实时预览，风格实验室一键随机切换，支持复制导出为 TypeScript 代码
- 🏷️ **多标签页导航** — 拖拽排序、右键菜单、固定标签、图标激活态切换
- 🧩 **12 个业务组件** — 图标选择器（32 个图标库）、Iframe 外链、链接预览、Markdown 渲染、富文本编辑器、签名板、跑马灯、图案背景、流光文字、滑块验证码等
- 🧠 **页面 KeepAlive** — 双层渲染架构，缓存页保持组件状态，支持外部配置缓存列表
- 🗄️ **内置后端服务** — Express + SQLite，用户/角色/菜单/字典完整 CRUD，JWT 认证

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19、Vite、React Router、Zustand |
| UI | Ant Design 6、antd-style（CSS-in-JS）、Tailwind CSS |
| 图标 | react-icons（32+ 图标库）、@ant-design/icons |
| 图表/动画 | ECharts、Three.js、Animate.css、View Transitions API |
| 后端 | Express、node:sqlite、JWT（jose）、Zod |

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动前端（端口 3509）
pnpm dev

# 启动后端（端口 3508）
cd service && pnpm dev
```

默认账号：`admin / admin123`（管理员）、`test / test123`（测试用户）

```bash
# 构建
pnpm build          # 前端生产构建
pnpm build:lib      # 子包库模式构建
pnpm docs:dev       # VitePress 文档站
```

## 项目结构

```
zealous-admin/
├── src/                          # 主应用
│   ├── main.tsx                  # 应用启动入口
│   ├── App.tsx                   # 会话门禁 + 路由装配 + LayoutProvider
│   ├── registry/                 # 路由装配层（路由表由后端菜单配置驱动）
│   │   ├── pages.tsx             #   component key → 页面懒加载器；未配置时按 path 回落 src/pages/index
│   │   └── routes.tsx            #   buildRoutes(menus)：菜单行决定路由，登录页与 404 固定挂载
│   ├── apis/                     # API 请求层（admin / dict / menu / role）
│   └── pages/                    # 页面组件（能否被访问取决于 za_menu 是否有对应行）
│       ├── login.tsx             # 登录页
│       ├── [...all].tsx          # 404 页
│       └── index/
│           ├── index.tsx         # 首页
│           ├── demo/             # 演示页面
│           │   ├── dashboard/    #   大屏演示（ECharts / Three.js / G6）
│           │   ├── components/   #   组件演示页
│           │   ├── func/         #   功能演示（烟花 / 最大化 / 登录过期）
│           │   ├── breadcrumb/   #   面包屑导航示例
│           │   ├── center-layout/#   居中布局演示
│           │   ├── link/         #   官网外链演示
│           │   ├── nav/          #   多级导航示例
│           │   ├── menu-active/  #   菜单图标激活态示例
│           │   ├── route-params/ #   路由传参示例
│           │   ├── keepalive.tsx #   页面保活演示
│           │   └── style.tsx     #   风格实验室
│           ├── form/             # 表单设计器示例（列表 / 设计 / 渲染 / 数据 / 预览）
│           └── ui/               # UI 展示页
├── packages/
│   ├── auth/                     # 权限包 @zealous-admin/auth
│   │   ├── api/                  #   auth / user / role / menu 接口
│   │   ├── guards/               #   AuthGuard（路由级）+ PermissionGuard（按钮级）
│   │   ├── hooks/                #   useAuth / useUser / usePermission
│   │   ├── pages/                #   用户管理 / 角色管理 / 菜单管理 / 分配菜单弹窗
│   │   ├── runtime/client.ts     #   HTTP 适配注入（由主应用配置）
│   │   ├── store/user.ts         #   token + userInfo + 菜单树转换
│   │   └── types/                #   类型定义
│   ├── layout/                   # 布局核心包 @zealous-admin/layout
│   │   ├── components/           #   19 个布局组件
│   │   │   ├── Breadcrumb/       #     面包屑导航
│   │   │   ├── ConfigPanel/      #     可视化配置面板
│   │   │   ├── Content/          #     内容区容器
│   │   │   ├── Footer/           #     页脚
│   │   │   ├── GlobalProgress/   #     页面加载进度条
│   │   │   ├── Header/           #     顶栏容器
│   │   │   ├── KeepAlive/        #     页面缓存（双层渲染）
│   │   │   ├── Logo/             #     Logo 组件
│   │   │   ├── MainNav/          #     主导航（一级菜单）
│   │   │   ├── Menu/             #     侧边栏菜单 / 子导航
│   │   │   ├── MenuIcon/         #     菜单图标渲染器
│   │   │   ├── MobileBlock/      #     移动端阻塞提示
│   │   │   ├── ReLoginModal/     #     登录过期重登弹窗
│   │   │   ├── Search/           #     全局路由搜索
│   │   │   ├── Setting/          #     配置抽屉面板
│   │   │   ├── TabBar/           #     多标签页栏
│   │   │   ├── Toolbar/          #     工具栏（面包屑 + 操作按钮）
│   │   │   └── UserInfo/         #     用户信息下拉
│   │   ├── hooks/                #   7 个自定义 Hook
│   │   │   ├── useAppMessage.ts  #     全局 message / modal
│   │   │   ├── useAuth.ts        #     登录 / 登出
│   │   │   ├── useControlTab.ts  #     标签页 / 面包屑 / 导航
│   │   │   ├── useFireworks.ts   #     庆祝烟花效果
│   │   │   ├── useLayoutSetting.ts#    布局配置读写
│   │   │   ├── useMaximize.ts    #     页面最大化
│   │   │   └── useMobileDetect.ts#     移动端检测
│   │   ├── store/                #   7 个 Zustand Store
│   │   │   ├── app.ts            #     应用配置
│   │   │   ├── menu.ts           #     菜单数据
│   │   │   ├── page.ts           #     页面状态（标签页 / 缓存）
│   │   │   ├── reLogin.ts        #     重新登录弹窗
│   │   │   ├── theme.ts          #     主题配置
│   │   │   ├── topBar.ts         #     顶栏配置
│   │   │   └── user.ts           #     用户信息 / token
│   │   ├── types/                #   类型定义
│   │   ├── utils/                #   HTTP 实例 + 工具函数
│   │   ├── themeMap.ts           #   主题类型映射表
│   │   └── defaultSetting.ts     #   默认布局配置（50+ 项）
│   ├── components/               # 通用组件库 @zealous-admin/components
│   │   ├── IconPicker/           #   图标选择器（32 个图标库）+ 渲染器
│   │   ├── Iframe/               #   Iframe 外链嵌入
│   │   ├── LinkPreview/          #   链接悬停预览卡片
│   │   ├── Markdown/             #   Markdown 渲染
│   │   ├── Marquee/              #   跑马灯滚动
│   │   ├── PatternBg/            #   图案背景（grid / dot）
│   │   ├── RichTextEditor/       #   富文本编辑器（Quill）
│   │   ├── ShinyText/            #   流光文字动效
│   │   ├── SignaturePad/         #   手写签名板
│   │   ├── SliderCaptcha/        #   滑块验证码
│   │   └── SparklesText/         #   闪烁粒子文字动效
│   ├── theme/                    # 主题包 @zealous-admin/theme
│   │   ├── bootstrapTheme.ts     #   Bootstrap 经典风格
│   │   ├── cartoonTheme.ts       #   卡通漫画风
│   │   ├── glassTheme.ts         #   毛玻璃拟态
│   │   ├── hackerTheme.ts        #   黑客终端
│   │   ├── illustrationTheme.ts  #   手绘插画风
│   │   ├── muiTheme.ts           #   Material Design 3
│   │   ├── shadcnTheme.ts        #   shadcn/ui 极简风
│   │   └── index.ts              #   主题入口 + useThemeByType
│   └── utils/                    # 工具函数库 @zealous-admin/utils
│       ├── data/index.ts         #   deepClone / groupBy / sortBy / unique 等
│       ├── env/index.ts          #   16 个环境检测函数（浏览器 / 设备 / 微信）
│       ├── file/index.ts         #   13 个文件处理函数（Base64 / Blob / MIME）
│       ├── parse/index.ts        #   身份证解析校验
│       ├── time/index.ts         #   formatDate / debounce / throttle 等
│       └── index.ts              #   统一导出入口
├── service/                      # 后端 API 服务
│   └── src/
│       ├── index.ts              #   服务启动入口（端口 3001）
│       ├── app.ts                #   Express 应用配置
│       ├── db/                   #   数据库
│       │   ├── index.ts          #     SQLite 初始化 + 种子数据
│       │   └── schema.ts         #     TypeScript 类型定义
│       ├── lib/                  #   工具库
│       │   ├── jwt.ts            #     JWT 签发 / 校验
│       │   ├── date.ts           #     日期格式化
│       │   ├── response.ts       #     统一响应格式
│       │   └── camel.ts          #     驼峰 / 下划线互转
│       ├── middleware/
│       │   └── auth.ts           #   JWT Bearer 认证中间件
│       └── routes/               #   路由处理
│           ├── admin.ts          #     管理员 CRUD
│           ├── role.ts           #     角色 CRUD + 菜单分配
│           ├── menu.ts           #     菜单 CRUD + path 计算
│           ├── dict.ts           #     字典类型 + 数据管理
│           └── mcp.ts            #     MCP 接口
├── docs/                         # VitePress 文档站
│   ├── components/               #   组件文档
│   ├── guide/                    #   使用指南
│   ├── layout/                   #   布局文档
│   └── theme/                    #   主题文档
├── public/                       # 静态资源
├── pnpm-workspace.yaml           # pnpm 工作区配置
└── package.json                  # 根目录脚本与依赖
```

## 子包概览

### @zealous-admin/layout

布局核心包，自包含的基础设施层，外部只需关注页面逻辑。

| 模块 | 内容 |
|------|------|
| **组件** | Layout、LayoutProvider、KeepAlive、ConfigPanel、TabBar、Breadcrumb、Search 等 19 个 |
| **Hooks** | useControlTab（标签页/面包屑/导航）、useAppMessage、useAuth、useFireworks 等 7 个 |
| **Store** | user、menu、app、theme、page、topBar、reLogin 等 7 个 Zustand Store |
| **HTTP** | Axios 实例，内置 token 注入、401 过期分流（logout / prompt）、全局消息提示 |

### @zealous-admin/theme

8 套主题（default + 7 套定制），通过 `useThemeByType` 自动映射，在配置面板中一键切换。

| 主题 | 风格 |
|------|------|
| Default | 默认主题，支持主题色 / 暗色自定义 |
| MUI | Material Design 3，波纹动效 |
| Bootstrap | Bootstrap 经典，渐变按钮 |
| Glass | 毛玻璃拟态，半透明模糊 |
| Illustration | 手绘插画风，粗描边 |
| Cartoon | 卡通漫画风，珊瑚红 + 偏移投影 |
| Shadcn | shadcn/ui 极简风格 |
| Hacker | 黑客终端，绿色矩阵 |

### @zealous-admin/components

12 个通用业务组件：

| 组件 | 说明 |
|------|------|
| `ZaIcon` / `ZaIconPicker` | 动态图标渲染器 + 图标选择器（32 个图标库） |
| `ZaIframe` | Iframe 外链嵌入，自动撑满 + 加载状态 |
| `ZaLinkPreview` | 链接悬停预览卡片 |
| `ZaMarkdown` | Markdown 渲染组件 |
| `ZaMarquee` | 跑马灯 / 无限滚动 |
| `ZaPatternBg` | 图案背景（grid / dot） |
| `ZaRichTextEditor` | Quill 富文本编辑器，支持自定义工具栏 / 只读 |
| `ZaShinyText` | 流光文字动效 |
| `ZaSignaturePad` | 手写签名板，支持生成 / 下载图片 |
| `ZaSliderCaptcha` | 滑块验证码 |
| `ZaSparklesText` | 闪烁粒子文字动效 |

### @zealous-admin/utils

零依赖工具函数库，涵盖 `data`（deepClone、groupBy、flatten 等）、`env`（16 个环境检测函数）、`file`（13 个文件处理函数）、`parse`（身份证解析）、`time`（formatDate、debounce、throttle 等）五大模块。

## 配置

默认布局配置位于 `packages/layout/defaultSetting.ts`，涵盖布局模式、主题类型/颜色/暗色模式、菜单样式、标签页风格、面包屑等 50+ 配置项，所有变更在配置面板实时预览。

## 后端 API

| 模块 | 路由 | 说明 |
|------|------|------|
| 认证 | `POST /admin/login`、`/logout`、`GET /admin/info` | JWT 登录/登出/用户信息 |
| 管理员 | `GET/POST/PUT/DELETE /admin/:id` | 用户 CRUD |
| 角色 | `GET/POST/PUT/DELETE /role/:id` | 角色 CRUD + 菜单分配 |
| 菜单 | `GET/POST/PUT/DELETE /menu/:id` | 菜单 CRUD + path 自动计算 |
| 字典 | `GET/POST/PUT/DELETE /dict-type/:id`、`/dict-data/:id` | 字典类型 + 数据管理 |

## 浏览器支持

Chrome ≥ 87、Firefox ≥ 78、Safari ≥ 14、Edge ≥ 88

## License

[MIT](LICENSE)
