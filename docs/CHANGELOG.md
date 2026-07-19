# 更新日志

## 2026-07-20

- ✨ 新增移动端响应式布局，宽度 < 700px 自动切换 Drawer 抽屉菜单
- 🔧 移动端汉堡图标移至工具栏，面包屑自动隐藏
- 📝 文档更新，新增移动端模式章节

## 2026-07-19

- ✨ 新增 AppMessageProvider 组件，统一注入 antd message/modal 实例
- 📦 全局消息工具迁移至 layout 包
- 🗑️ 删除 AppMessageInit 组件
- 🔧 http.ts 错误处理优化

## 2026-07-18

- 🔧 组件命名统一改为 Za 前缀（约 40 个文件）
- ✨ 新增 MobileBlock 组件，移动端访问控制
- 🗑️ 删除 createMenuIconMap 函数
- 📝 文档同步更新

## 2026-07-17

- 🗑️ 移除快乐模式和紧凑模式
- ✨ 工具栏新增页面刷新功能

## 2026-07-15

- ✨ 新增动态网站标题功能
- ✨ 菜单图标悬停放大效果

## 2026-07-14

- ✨ 新增路由搜索功能，支持标题/URL 模糊匹配、键盘导航

## 2026-07-13

- 📝 README.md 全面更新，docs/ 文档整理
- 🐛 修复 layout-config 和 layout-modes 类型错误

## 2026-07-12

- ✨ 实现布局居中显示（outside/inside 两种作用范围）
- 🐛 修复 ConfigPanel 居中显示开关绑定错误、mergeAttribute 数据污染
- 🔧 全局背景色层级统一、Demo 页面样式规范化、Footer/Menu/TabBar 样式微调
- 📝 文档全面更新

## 2026-07-11

- 🐛 修复风格实验室随机数据拼写错误，扩充配置覆盖范围

## 2026-07-10

- ✨ ConfigPanel 新增复制配置功能
- 🔧 工具栏配置简化、SliderCaptcha 样式优化、UserInfo 布局兼容

## 2026-07-09

- 🔧 Header 组件动态渲染、Toolbar 按钮可配置化
- 🐛 修复拼写错误、菜单数据空值处理
- 🔧 上级菜单选择改为树形组件

## 2026-07-08

- 🔧 清理调试日志、类型定义更新
- 🐛 TabBar 标签关闭交互优化

## 2026-07-06

- 🐛 浏览器后退路由同步修复
- ✨ 菜单分配弹窗化、UserInfo 信息完善
- 🔧 全局 message/modal 主题同步（41 个组件）
- 📝 文档更新，默认配置调整

## 2026-07-05

- ✨ 菜单弹窗化、图标系统重构
- 🐛 修复 convertMenus 空数组、路径双重前缀、ZaIcon 样式不更新等问题
- 🔧 LayoutProvider 响应式菜单、菜单全后端驱动

## 2026-07-04

- 🔧 修复 7 个后端路由 INSERT 逻辑，路由重新排序
- 🔄 面包屑导航重构
- 🎨 搜索表单 UI 统一（19 个页面）
- 🔄 项目重命名为 zealous-admin

## 2026-07-03

- ✨ 新增 service/ 后端服务（Hono + Drizzle ORM + MySQL）
- ✨ 新增 PatternBg 组件
- 📦 配置文件迁移至各 packages/

## 2026-07-02

- 🔧 Header 组件重构（819→21 行），新增 TabBar/Breadcrumb/ConfigPanel 组件
- 🐛 修复面包屑 clip-path 与 view-transition 冲突

## 2026-07-01

- ✨ 新增 useLayoutSetting Hook、风格实验室页面
- 🔄 Markdown 组件库化迁移
- 🎨 首页重构、Tailwind CSS 集成

## 2026-06-30

- ✨ 新增 Logo 组件，重构加载页面
- ⚙️ 默认配置调整

## 2026-06-29

- 🎨 全项目代码格式化，ESLint 升级到 v10
- 📦 核心依赖更新，Vite 构建优化

## 2026-06-26

- ✨ 新增 IconPicker 图标选择器组件（32+ 图标库）

## 2026-06-25

- ✨ 新增 UserInfo 用户信息组件
- 🎨 菜单布局优化，组件尺寸统一调整

## 2026-06-24

- ✨ 新增 ShinyText 流光文字组件
- 📁 目录结构重构

## 2026-06-23

- ✨ 新增 LinkPreview、SliderCaptcha 组件
- 🔄 react-beautiful-dnd 升级为 @hello-pangea/dnd

## 2026-06-21

- 🔧 类型声明生成、包名导入统一

## 2026-06-17

- 🔧 子包构建优化，修复 preserveModulesRoot 问题

## 2026-06-15

- ✨ 新增 createMenuIconMap 工具函数

## 2026-06-14

- 🔧 创建 AppLayout 组件，职责分离

## 2026-06-12

- ✨ 暗色模式支持跟随系统自动切换

## 2024-03-10

- ✨ 项目初始化，布局/主题/工具栏/登录/首页/国际化等核心模块
