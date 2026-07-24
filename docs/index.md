---
layout: home

hero:
  name: "Zealous-admin"
  text: "现代化后台管理系统"
  tagline: 基于 React + Vite + Ant Design 构建 · 开箱即用 · 极致体验
  image:
    src: /logo.svg
    alt: zealous-admin
  actions:
    - theme: brand
      text: 🚀 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 📖 组件文档
      link: /components/
    - theme: alt
      text: 🔗 在线演示
      link: https://admin.zzzpupu.xin/

features:
  - icon: 🎨
    title: 8 套精美主题
    details: Default 支持主题色/暗色自定义 + MUI / Bootstrap / Glass / Illustration / Cartoon / Shadcn / Hacker 七种定制主题一键切换。
    link: /theme/
  - icon: 📐
    title: 5 种布局 + 移动端响应式
    details: side / only-side / head / only-head / simple + 居中显示（inside/outside），窄屏自动 Drawer 抽屉，菜单 activeIcon 链路级联高亮。
    link: /layout/layout-modes
  - icon: 🔐
    title: 自包含权限体系
    details: 登录/登出/用户状态全部封装在 layout 包，401 过期自动分流（logout / prompt），HTTP 拦截器内置 token 注入。
    link: /layout/
  - icon: 🔧
    title: 50+ 可视化配置
    details: 覆盖 App · Theme · Menu · Page · TopBar 五维度，主题类型切换、风格实验室一键随机，所见即所得，复制配置导出为 TypeScript 代码。
    link: /layout/layout-config
  - icon: 🏷️
    title: 多标签页导航
    details: 拖拽排序 · 右键菜单 · 固定标签 · 图标激活态切换 · 三种风格 (default / card / block)，像浏览器一样管理页面。
    link: /layout/tab-bar
  - icon: 🧩
    title: 8 个业务组件
    details: 图标选择器（32 个图标库）· 链接预览 · Markdown 渲染 · 跑马灯 · 图案背景 · 流光文字 · 滑块验证码 · 闪烁文字
    link: /components/
  - icon: 🧠
    title: 页面 KeepAlive 缓存
    details: 双层渲染架构，缓存页保持组件状态不丢失，非缓存页保留过渡动画，外部配置缓存列表。
    link: /layout/
  - icon: 🗄️
    title: 内置后端服务
    details: Express + node:sqlite，用户/角色/导航/字典完整 CRUD，JWT 认证，菜单 path 自动计算。
    link: /guide/
---

<style>
/* ---------- Demo link in hero actions ---------- */
.VPHero .VPButton.alt[href*="zzzpupu"] {
  position: relative;
  border-color: #52c41a !important;
  color: #52c41a !important;
  background: rgba(82, 196, 26, 0.05) !important;
}
.VPHero .VPButton.alt[href*="zzzpupu"]:hover {
  border-color: #73d13d !important;
  color: #73d13d !important;
  background: rgba(82, 196, 26, 0.1) !important;
}
.VPHero .VPButton.alt[href*="zzzpupu"]::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  background: #52c41a;
  border-radius: 50%;
  margin-right: 6px;
  animation: dot-pulse 2s ease-in-out infinite;
}

/* ---------- Section divider ---------- */
.section-divider {
  text-align: center;
  margin: 64px auto 32px;
  max-width: 640px;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, var(--vp-c-brand-1), #61DAFB);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.section-subtitle {
  color: var(--vp-c-text-2);
  font-size: 15px;
  margin-top: 8px;
}

/* ---------- Responsive ---------- */
@media (max-width: 640px) {
  .section-title {
    font-size: 22px;
  }
}
</style>

<!-- Customer Feedback Panel -->
<ClientOnly>
  <FeedbackPanel />
</ClientOnly>


<!-- Tech Stack Marquee (powered by @zealous-admin/components ZaMarquee) -->
<ClientOnly>
  <TechMarquee />
</ClientOnly>
