# Changelog

## 2026-07-19

- ✨ **AppMessageProvider 组件**（`layout` 包）：新增独立组件统一注入 antd 的 message/modal 实例，在 `LayoutProvider` 中应用扩大影响范围
- 📦 **全局消息工具迁移至 layout 包**：`useAppMessage`、`getGlobalMessage`、`getGlobalModal` 从 `@zealous-admin/layout` 导出
- 🗑️ **删除 AppMessageInit 组件**：移除 `src/components/AppMessageInit.tsx`，用户无需手动初始化
- 🔧 **http.ts 错误处理优化**：错误信息改为 `new Error(res.message)`，移除冗余 console.log

## 2026-07-18

- 🔧 **组件命名统一改为 Za 前缀**（约 40 个文件）：`ZIcon`→`ZaIcon`、`ZIconPicker`→`ZaIconPicker`、`ZLinkPreview`→`ZaLinkPreview`、`ZMarquee`→`ZaMarquee`、`ZPatternBg`→`ZaPatternBg` 等所有组件
- 📝 **文档同步更新**（10 个文件）：README.md、docs/ 下所有组件文档、配置文件
- ✨ **MobileBlock 组件**：新增移动端访问控制，不支持时显示图案背景提示页
- 🗑️ **删除 createMenuIconMap 函数**（`utils/index.ts`）：移除约 38 行的 SVG 图标映射工具函数

## 2026-07-17

- 🗑️ **移除快乐模式和紧凑模式**（`LayoutProvider.tsx`、`Toolbar.tsx`、`ConfigPanel.tsx`、`useLayoutSetting.ts`）：移除 `HappyProvider`、`compactAlgorithm`、下拉菜单项、配置面板开关和随机样式生成，配置项保留
- ✨ **工具栏页面刷新功能**（`page.ts`、`Content.tsx`、`Toolbar.tsx`）：点击刷新图标触发内容区域页面重新渲染初始化，整体页面不刷新

## 2026-07-15

- ✨ **动态网站标题**（`Layout.tsx`）：切换路由时 `document.title` 自动更新为 `菜单名称 - app.name`
- ✨ **菜单图标悬停放大**（`MenuIcon.tsx`）：悬停菜单条目时图标 `scale(1.25)` 过渡放大，移走恢复；新增 `gap` prop 控制右侧间距
- 🔧 **菜单图标间距**（`Menu.tsx`、`MainNav.tsx`）：MenuIcon 传入 `gap={theme.marginSM}` 防止放大后遮盖文本

## 2026-07-14

- ✨ **路由搜索功能**（`Search.tsx`、`Toolbar.tsx`）：工具栏新增搜索按钮；弹窗无标题三区域（搜索框 + 结果列表 + 操作提示），支持标题/URL模糊匹配；↑↓ 切换选中（循环滚动）+ 鼠标悬停切换，Enter/点击跳转，ESC关闭；空状态 SmileOutlined"输入你要搜索的导航"，无结果 FrownOutlined"没有找到你想要的"

## 2026-07-13

- 📝 **README.md 全面更新**：组件 7→9（补充 ZaIcon/ZaMarkdown/ZaPatternBg），技术栈新增图表/图标分类，pnpm 命令 `run` 统一简写，Git 分支 master→main，国际化描述修正
- 📝 **docs/ 文档整理**（6 个文件）：guide/index.md 移除后端引用（Hono/Drizzle/service）；components/index.md 组件 7→9 补全 ZaMarkdown/ZaPatternBg；index.md 首页同步；layout/index.md 新增居中布局特性
- 🐛 **layout-config.md 类型修正**：`ToolBar`→`Toolbar`（与 `TopBarOrder` 定义一致）
- 🐛 **layout-modes.md width 类型修正**：`"1200px"`→`1200`（string→number）

## 2026-07-12

- 🔧 **全局背景色层级统一**（16个文件）：`colorBgContainer` → `colorBgBase`（Layout/Menu/MainNav/TabBar/Toolbar/Footer/Content + 8个Demo页面），增强视觉层次感
- 🔧 **Demo 页面样式规范化**（8个 `*Demo.tsx`）：统一容器/头部背景色，新增 header 分割线，内容区新增 flex 列布局 + gap 间距
- 🔧 **Footer 样式优化**（`Footer.tsx`）：高度 40→50px，新增上分割线，flex 居中，font-weight 加强
- 🔧 **Menu 组件微调**（`Menu.tsx`）：新增右侧分割线，`overflow` 拆分为 `overflowX: hidden; overflowY: auto`，修复重复 `overflow: hidden` 声明
- 🔧 **TabBar 上下布局适配**（`TabBar.tsx`）：容器背景改为 `colorBgContainerDisabled`；根据 `order` 判断 TabBar 位置，动态调整标签圆角方向和右键菜单弹出方向
- 🔧 **defaultSetting 更新**（`defaultSetting.ts`）：GitHub 地址更新为 `Neumann615/zealous-admin`
- ✨ **布局居中显示**（`Layout.tsx`、`Content.tsx`、`ConfigPanel.tsx`）：实现 `layoutScope` outside/inside 两种居中模式 — outside 包裹整个布局容器（含侧边栏+内容区），inside 仅包裹页面内容区；根据 `width` 配置动态调整 `maxWidth`；两侧 `border` + `boxShadow` 分隔视觉层次
- 🐛 **ConfigPanel 居中显示开关修复**（`ConfigPanel.tsx`）："居中显示" Switch 从错误绑定 `isEnableHomePage` 修复为 `layout.isCenter`
- 🐛 **mergeAttribute 数据污染修复**（`utils/index.ts`）：从逐 key 赋值改为 `{ ...obj1, ...obj2 }` spread，缺失 key 保留默认值而非设为 `undefined`，解决随机切换后配置面板值与 store 不一致、面包屑消失等数据错乱
- 🔧 **randomStyle 新增布局配置**（`useLayoutSetting.ts`）：`app.layout`（isCenter / layoutScope / width）纳入随机切换覆盖范围
- 🔧 **外部居中样式微调**（`Layout.tsx`）：背景色 `colorBgLayout` → `colorBgBase`，容器高度 `100vh` → `100%`，移除 `boxShadow`
- 📝 **文档全面更新**（`README.md`、`docs/` 7个文件）：README 重写功能特性（新增居中布局、风格实验室），修正配置示例，React 18→19；stores 文档补全 `app.layout` 和 `usePageStore` API；layout-config 修正 `width` 类型；TechMarquee 更新技术栈列表；GitHub 链接统一为 `Neumann615/zealous-admin`；修复 clone URL 格式

## 2026-07-11

- 🐛 **风格实验室随机数据修复**（`useLayoutSetting.ts`）：修复 `'ToolBar'` → `'Toolbar'` 拼写错误导致 order 值不匹配；扩充 `randomStyle` 覆盖 ConfigPanel 中除 app/色弱模式 外的全部配置项（主题快乐特效、菜单手风琴/折叠、页面进度条、标签栏开关/图标/宽度/双击事件、工具栏面包屑开关/5个功能按钮），解决随机切换后数据对不上的问题

## 2026-07-10

- 🔧 **ConfigPanel 工具栏配置简化**（`ConfigPanel.tsx`）：移除拖拽排序逻辑，保留开关配置，简化为 Row + Switch 形式
- 🔧 **ESLint 规则调整**（`eslint.config.js`）：关闭 `jsx-wrap-multilines` 和 `jsx-curly-brace-presence` 规则
- 🔧 **SliderCaptcha 样式优化**（`SliderCaptcha.tsx`）：新增 `--rcsc-button-bg-color` CSS 变量，移除注释导入
- 🔧 **UserInfo 组件布局兼容**（`UserInfo.tsx`）：根据 `menuType` 区分渲染方式
- ✨ **ConfigPanel 复制配置功能**（`ConfigPanel.tsx`）：点击"复制配置"按钮，将当前配置导出为完整 TypeScript 文件格式并复制到剪贴板

## 2026-07-09

- 🔧 **Header 组件动态渲染**（`Header.tsx`）：根据 `topBarStore.order` 配置动态渲染 TabBar 和 Toolbar，支持自定义顺序
- 🔧 **Toolbar 按钮可配置化**（`Toolbar.tsx`）：全屏、主题切换、页面刷新按钮改为根据 `topBarStore.toolbar` 配置控制显示
- 🐛 **修复拼写错误**（`defaultSetting.ts`、`config.d.ts`）：`ToolBar` → `Toolbar`，保持命名一致性
- 🔧 **哀悼模式数据源迁移**（`LayoutProvider.tsx`）：从 `themeStore.mourningMode` 改为 `appStore.isEnableMourningMode`，合并色弱/哀悼模式的 useEffect
- 🐛 **菜单数据安全处理**（`LayoutProvider.tsx`）：`setMainNavData(menuData)` → `setMainNavData(menuData || [])`，避免空值报错
- 🔧 **上级菜单选择改为树形**（`menu.tsx`）：`Select` → `TreeSelect`，支持层级展示和自动计算 level

## 2026-07-08

- 🔧 **类型定义更新**（`package.json`）：`@types/react` ^18.2.15→^19.2.17，`@types/react-dom` ^18.2.7→^19.2.3
- 🔧 **清理调试日志**（`Layout.tsx`）：注释掉 `menuCurrentKeys`/`openKeys`/`mainNavCurrentKeys` 的 console.log
- 🗑️ **删除旧文件**（`keep-alive.tsx`）：删除 7 行旧版 KeepAlive 演示页面
- 🔧 **TabBar 标签关闭交互优化**（`TabBar.tsx`）：点击关闭按钮区域统一处理，固定标签切换状态，普通标签关闭，添加 `stopPropagation` 防止事件冒泡

## 2026-07-06

- 🐛 **浏览器后退路由同步**（`useControlTab.ts`、`Layout.tsx`）：新增 `syncTabFromUrl` 方法，监听 `popstate` 自动同步 tab 高亮与面包屑；修复同 tab 重复点击不导航的问题
- 🔧 **菜单分配弹窗化**（`allocMenu.tsx`、`role.tsx`）：从路由页面改为 `Modal` 弹窗，修复 antd v5 `Tree.checkedNodes` 废弃 API 报错；保存时向上追溯完整祖先链，避免只勾叶子节点导致 `mainNav` 为空
- 🔧 **操作栏布局优化**（`role.tsx`）：改为单行 flex + `whiteSpace: nowrap` 防止按钮换行，列宽 200→260
- 🔧 **用户信息补全**（`admin.ts`）：`/admin/info` 返回全部字段（email/nickName/note/loginTime 等），仅排除 password
- 🔧 **移除 seed 脚本**（`service/package.json`）：删除 `db:generate`/`db:push`
- 🐛 **datetime 修复**（`menu.ts`、`role.ts`）：`createTime` 改用 `Date` 对象，修复 MySQL strict 模式不兼容
- ✨ **UserInfo 信息完善**（`UserInfo.tsx`、`index.tsx`）：展示真实昵称/邮箱/头像，新增退出登录按钮（清除全部 localStorage 配置后硬刷新跳转）
- 🔧 **全局 message/modal 主题同步**（`LayoutProvider.tsx`、全站 41 个组件 + `http.ts`）：`<App>` 包裹提供上下文，`message.xxx()` → `App.useApp().message`，`Modal.confirm()` → `modal.confirm()`
- 🔧 **退出登录配置清除**（`index.tsx`）：`window.location.replace('/login')` 清除所有 `zealous-admin-` prefix 持久化数据
- 🔧 **userInfo store 扩展**（`user.ts`、`admin.d.ts`）：新增 `nickName` 字段，loginTime/status/email 持久化
- 🐛 **simple 模式手风琴异常**（`Menu.tsx`）：`onOpenChange` 增加 `menuType !== 'simple'` 判断，精简模式下主导航不受手风琴限制
- 📝 **文档更新**（`docs/`）：同步项目最新架构（React 19、Hono、Drizzle ORM），修正端口号 3509，更新 stores 文档字段名，移除已删除的 `vite-config/`/`ts-config/` 目录引用
- 🔧 **默认配置调整**（`defaultSetting.ts`）：主题色 `#1677ff` → `#2f54eb`，暗色模式默认 `'auto'`（跟随系统）
- 🔧 **登录页清理**（`login.tsx`）：移除未使用的 `App` 导入
- ✨ **useMaximize 页面全屏 hook**（`useMaximize.ts`、`maximize-page.tsx`）：导出 `{ isMaximize, enterMaximize, exitMaximize, toggleMaximize }`，demo 页面演示三种操作方式
- 🐛 **全局进度条状态修正**（`Layout.tsx`）：`isAnimating` 从配置开关 `isEnablePageLoadProgress` 改为实际加载状态 `globalProgressLoading`，解决进度条一直不消失的问题
- 📝 **CLM.md**：新增项目级 Claude Code 指引文件，覆盖架构分层、关键模式、常用命令

## 2026-07-05

- ✨ **菜单弹窗化**（`menu.tsx`）：添加/编辑改用 `Modal`+`Form`，集成 `ZaIconPicker`，表格 `ZaIcon` 回显，删除 `addMenu.tsx`(141行) 和 `updateMenu.tsx`(146行)
- ✨ **图标系统重构**：`MenuIcon` 改为 `ZaIcon` 渲染，`size`/`color` 转 `style` 透传，两组件均 `React.memo` 包裹，移除 `menuIconMap`/`createMenuIconMap`/`svgModules`
- ✨ **登录优化**（`login.tsx`）：`message.success` 提示后延时 1.5s 跳转首页
- 🐛 **`convertMenus` 空数组**（`App.tsx`）：`Number()` 包裹 `parentId`/`id`/`hidden`/`sort`，解决字符串 `"0"` 与数字 `0` 的 Map 匹配失败
- 🐛 **路径双重 `/mall` 前缀**（`App.tsx`）：移除硬编码，由 `menu.name` 驱动
- 🐛 **`ZaIcon` 样式不更新**（`Icon.tsx`）：`style` 补入 `useMemo` 依赖数组
- 🐛 **"查看下级"误禁用**（`menu.tsx`）：`level !== 0` → `level >= 2`
- 🔧 **`LayoutProvider` 响应式菜单**：`menuData` 加入 effect 依赖，登录后自动刷新
- 🔧 **启动同步数据**（`App.tsx`）：mount 时有 token 则调用 `getUserInfo()`
- 🔧 **菜单全后端驱动**（`App.tsx`）：移除硬编码演示菜单，全部来自 `/admin/info`
- 🔧 **`ums_menu` 图标初始化**：按 `title` 语义分配 `ai:AiOutline*` 图标

## 2026-07-04

- 🔧 修复 7 个后端路由文件中的 INSERT 操作逻辑
- 🛣️ 重新排序 4 个路由模块中的路由定义
- 🎨 修正 13 个前端组件的导航路径
- 🔄 **面包屑导航重构** - 从基于URL的导航改为基于状态累积的导航，支持精确的菜单高亮
- 🎨 **搜索表单UI统一** - 19个页面的搜索表单统一采用Flexbox布局和Card extra按钮
- 🆕 **商品管理重构** - 新增 `ProductDetail.tsx` 组件，整合添加/编辑商品逻辑
- 🔧 **类型安全增强** - 修正Table多选回调函数签名，移除未使用的路由依赖
- 📍 **菜单/分类导航优化** - 从URL参数改为状态管理，添加"返回上级"功能
- 🔄 **项目重命名**：将项目从 `z-admin` 重命名为 `zealous-admin`，包括包名、路径别名、localStorage key、文档引用等

## 2026-07-03

- ✨ 新增 **service/** 后端服务模块，使用 Hono + Drizzle ORM + MySQL
- 📦 更新 **pnpm-workspace.yaml**，集成后端服务到 Monorepo
- 🔧 调整环境配置，API 地址指向本地开发服务器
- 🌐 前端添加中文语言包支持
- 🛠️ 优化 TypeScript 配置和包管理配置
- 📁 **配置文件迁移**：将 `ts-config/` 和 `vite-config/` 目录下的配置文件移动到对应的 `packages/` 包目录中：
  - `tsconfig.components.lib.json` → `packages/components/tsconfig.lib.json`
  - `tsconfig.layout.lib.json` → `packages/layout/tsconfig.lib.json`
  - `tsconfig.theme.lib.json` → `packages/theme/tsconfig.lib.json`
  - `vite.components.config.ts` → `packages/components/vite.config.ts`
  - `vite.layout.config.ts` → `packages/layout/vite.config.ts`
  - `vite.theme.config.ts` → `packages/theme/vite.config.ts`
- 📦 **更新构建脚本**：修改 `package.json` 中 `build:lib:*` 脚本路径指向新配置位置
- 🗑️ **删除旧目录**：移除 `ts-config/` 和 `vite-config/` 目录
- 🐛 **修复类型错误**：`useLayoutSetting` 的 `updateSetting` 函数参数类型从 `Partial<LayoutConfig>` 改为 `DeepPartial<LayoutConfig>`，解决嵌套对象部分更新时的类型检查问题
- ✨ **新增 PatternBg 组件**：支持 grid/dot 图案、尺寸、动画方向和遮罩方向配置，包含 `PatternBg.tsx` 核心组件和 `PatternBgDemo.tsx` 演示页面

## 2026-07-02

- 🔧 **Header 组件彻底重构**：从 819 行精简至 21 行，仅负责渲染 TabBar 和 Toolbar 的布局结构，移除所有业务逻辑
- ✨ **新增 TabBar 组件**：接管所有标签页相关逻辑（标签渲染、拖拽排序、右键菜单、标签管理），完整集成 `@hello-pangea/dnd` 拖拽功能
- ✨ **新增 Breadcrumb 组件**：独立的面包屑组件，支持 modern/default 两种模式，使用 `clip-path` 实现三角形切角效果
- ✨ **新增 ConfigPanel 组件**：从 Setting 中抽离配置面板内容，供 Setting 和 UserInfo 复用
- 🔧 **Toolbar 组件重构**：集成面包屑渲染，布局改为左右两列（左侧面包屑、右侧工具按钮）
- 🐛 **修复面包屑样式问题**：主题切换时全局视图过渡动画（`::view-transition-old/new(root)` 的 clip-path 动画）覆盖了面包屑的 `clip-path` 切角样式，解决方案包括：
  - 为面包屑容器添加 `isolation: isolate` 和 `viewTransitionName: none`
  - 为面包屑芯片的 `clip-path` 样式添加 `!important` 优先级
- 📱 **UserInfo 组件增强**：点击"偏好设置"时显示 ConfigPanel 配置面板
- 🔧 **ESLint 配置调整**：关闭 `style/eol-last` 和 `react/exhaustive-deps` 规则
- 📝 **README.md 更新**：按照当前 Monorepo 项目结构重新生成文档

## 2026-07-01

- ✨ **新增** **`useLayoutSetting`** **Hook**：封装布局配置的读取、更新与随机风格切换能力，并从 `@zealous-admin/layout` 导出。
- ✨ **新增「风格实验室」页面**（`style.tsx`）：一键随机切换框架的所有视觉风格组合，并接入主菜单路由。
- 🔄 **Markdown 组件库化迁移**：将 `src/components/Markdown` 下的本地实现迁移至 `packages/components/Markdown`，以 `ZaMarkdown` / `ZaMarkdownDemo` 形式从组件库统一导出。
- 🗑️ **清理** **`src/components`** **旧组件**：移除 `Icon`、`PluginsDemo`、`Result` 及 6 个插件演示页面，减少冗余代码。
- 🔧 **Setting 面包屑配置重构**：将独立的「面包屑配置卡片」合并进「工具栏功能配置」区域；同时修复菜单 store 持久化逻辑。
- 🎨 **全局代码风格统一**：文档与源码中的 import 排序、对齐空格、自闭合标签等大规模格式化。
- 🎨 **首页重构**：使用 Ant Design 组件和主题样式重新设计首页，适配亮/暗色模式。
- ✨ **Tailwind CSS 集成**：添加 `tailwind.config.js` 和 `postcss.config.js` 配置，首页实现响应式布局。
- 🎨 **加载动画主题同步**：修改 `index.html`，页面加载时读取 localStorage 主题配置，确保加载遮罩与用户设置的主题一致。
- 🔧 **Vite 打包优化**：修复 pnpm 路径识别问题，统一打包目录结构为 `vendors/包名/包名`。

## 2026-06-30

- ✨ 新增专用的 `Logo` 组件，替代原有的 `Avatar` 方案
- 🎨 重构加载页面，使用新 Logo + 进度条设计
- ⚙️ 调整默认配置：关闭持久化、启用自动深色模式
- 🐛 修复菜单状态管理回调参数问题
- 🖱️ 优化菜单点击事件和交互动画

## 2026-06-29

- 🎨 全项目统一代码格式化（单引号、尾随逗号、import 排序）
- 🔧 ESLint 升级到 v10，采用 `@antfu/eslint-config` 规范
- 📦 核心依赖更新（ahooks、antd、eslint 等）
- 🚀 Vite 构建优化：改进代码分割策略和文件命名
- 🔄 TypeScript 类型定义从 `type` 统一改为 `interface`
- 🗑️ 删除未使用的 `hover.css` 文件

## 2026-06-26

- ✨ 新增 `IconPicker` 图标选择器组件，支持 32+ 个主流图标库（Ant Design、FontAwesome、Material Design 等）
- ✨ 新增 `Icon` 图标渲染组件，支持动态加载和缓存机制
- 📦 添加 `react-icons` 依赖并配置 Vite externals

## 2026-06-25

- ✨ 新增完整的 **UserInfo** 用户信息组件，支持弹出菜单
- 🎨 菜单布局模式从 `side` 切换为 `simple`，优化视觉效果
- 📐 统一调整各组件尺寸（Footer高度、MainNav宽度等）

## 2026-06-24

- ✨ 新增 **ShinyText（流光文字）** 组件及其演示页面
- 📁 重构目录结构：`demo/component` → `demo/components`（复数形式）
- 🗑️ 清理废弃页面：删除 information、abnormal、status 相关页面
- 🎨 优化菜单样式：引入流光文字效果，调整高度和样式

## 2026-06-23

- ✨ 新增 **LinkPreview** 组件：通过 Microlink API 实现链接悬停预览功能
- ✨ 新增 **SliderCaptcha** 组件：支持三种模式的滑块验证码（纯滑块、拼图、触发式拼图）

## 2026-06-23

- ✅ 将 `react-beautiful-dnd` 升级为 `@hello-pangea/dnd`（维护中的 fork）
- 🏗️ 重构菜单初始化逻辑，从页面组件移至应用入口
- 🎨 增强 `SparklesTextDemo` 组件，支持交互式配置
- ⚙️ 新增 `defaultSetting.ts` 配置文件，支持外部传入布局配置

## 2026-06-21

- ✅ 为 layout 和 theme 包添加了 TypeScript 类型声明生成步骤
- 🔄 将相对路径导入改为包名导入（`@zealous-admin/*`）
- 📦 扩展了构建配置中的外部依赖（external）列表
- 🛠️ 新增了专用的 TypeScript 配置文件用于类型生成

## 2026-06-17

### 子包构建优化
- 为 components、layout、theme 创建独立的 Vite 配置文件
- 修复 `preserveModulesRoot` 不生效问题，使用函数方式动态处理输出路径
- 实现相对子包目录的结构输出，避免多余的 `packages/layout/` 前缀

## 2026-06-15

### 图标系统重构
- 新增 `createMenuIconMap` 工具函数，简化外部 SVG 图标导入

## 2026-06-14

### 架构优化
- **创建 AppLayout 组件**：将全局配置提升到路由层面
- **组件职责分离**：
  - `App.tsx`：最精简的路由配置，只保留路由守卫和路由生成
  - `AppLayout.tsx`：包含所有全局配置（StyleProvider、ConfigProvider、HappyProvider、Suspense）
  - `Layout.tsx`：只负责页面布局结构（侧边栏、顶部导航等）
- **主题全局生效**：修复因 Layout 只在首页使用导致其他页面主题配置不生效的问题
- **为独立包做准备**：AppLayout 组件可独立打包，方便在其他项目中复用

## 2026-06-12

### 新增
- 暗色模式支持跟随系统自动切换（亮色/暗色/跟随系统三种模式）
- 系统主题模式监听，自动响应系统深色/浅色模式变化

### 优化
- 配置面板模块统一改写成卡片渲染函数形式，使用 Card 组件包裹
- 自定义 Modal 的 header 和 footer，复制配置按钮移至 footer
- 主题色列表改为三列 grid 布局展示
- 复制配置按钮添加复制图标
- 状态切换添加平滑过渡动画（cubic-bezier 缓动曲线）
- 使用 @ant-design/colors 官方颜色定义主题色列表

### 修复
- 暗色模式分段控制器值类型兼容（支持 "false"、"true"、"auto"）

## 2024-03-10

### 新增
- 强大的 layout 组件，包含主题、布局、工具栏等相关信息
- 字体以及图标的标准解决方案
- 错误日志收集打印功能
- 国际化支持
- 基于 Plop.js 的代码文件自动生成
- 基于文件系统的路由
- 登录页面模板
- Dashboard 首页模板
- 工具栏模块
- 主题编辑器
- 页面过渡动画（多种效果）
- 全局加载进度条
- 状态页面、异常页面模板
- Markdown 预览组件
- 拖拽功能 Demo
- 虚拟列表 Demo

### 优化
- 完善菜单逻辑
- 完善全局加载进度条
- 完善页面过渡动画
- 图标渲染的异常处理判断
- 框架运行时数据本地缓存
- 调整 tab 栏只剩一个时不显示关闭按钮
- tab 栏数量过多时自动调整定位到合适位置
- 调整菜单缩放按钮位置

### 修复
- 修复设置面板修改配置对不上当前页面设置的情况
- 修复菜单手动拖动宽度后缩放不正常的问题
- 修复首次登录首页状态异常的问题


## 2024-03-10
- 整合 Markdown 预览 Demo 及完善组件逻辑

## 2024-02-25
- 整合拖动 Demo 以及虚拟列表 Demo
- 修复首次登录首页状态异常的问题
- 调整菜单缩放按钮位置

## 2024-01-21
- 调整 tab 栏只剩一个时不应该有关闭按钮
- tab 栏数量过多时需要调整定位到合适位置
- 完善登陆页模板
- 完成首页模板

## 2023-12-13
- 修复设置面板修改配置对不上当前页面设置的情况
- 修复菜单手动拖动宽度后缩放不正常的问题
- 优化菜单收缩展开动画

## 2023-11-15
- 框架运行时数据本地缓存

## 2023-11-09
- 完善页面模板里面的状态页面、异常页面模块
- 图标渲染的异常处理判断

## 2023-11-08
- 列举菜单基本页面
- 调整进度条以及全局设置界面样式

## 2023-11-07
- 完善全局加载进度条
- 完善页面过渡动画

## 2023-11-06
- 完善菜单逻辑

## 2023-10-23
- 新增工具栏模块
- 新增主题编辑器

## 2023-10-15
- 对接全局配置

## 2023-10-05
- 封装 layout 组件以及结合状态管理
- 制作登录页面以及 Dashboard 首页