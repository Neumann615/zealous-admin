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
    title: 4 套精美主题
    details: Bootstrap 经典 · Glass 毛玻璃 · Illustration 插画风 · MUI Material Design 3，切换主题就像换皮肤一样简单。
    link: /theme/
  - icon: 📐
    title: 5 种布局 + 移动端响应式
    details: side / only-side / head / only-head / simple + 移动端自动 Drawer 抽屉菜单，窄屏自动切换，桌面端面包屑自动隐藏。
    link: /layout/layout-modes
  - icon: 🖼️
    title: 菜单激活图标系统
    details: 选中菜单时图标自动切换为 activeIcon，父节点链路级联高亮，标签页同步切换，视觉反馈清晰直观。
    link: /layout/menu-system
  - icon: 🧩
    title: 9 个业务组件
    details: 图标选择器（32 个图标库）· 链接预览 · Markdown 渲染 · 跑马灯 · 图案背景 · 流光文字 · 滑块验证码 · 闪烁文字
    link: /components/
  - icon: 🔧
    title: 50+ 可视化配置
    details: 覆盖 App · Theme · Menu · Page · TopBar 五维度，居中布局（inside/outside）、所见即所得，实时预览。
    link: /layout/layout-config
  - icon: 🏷️
    title: 多标签页导航
    details: 拖拽排序 · 右键菜单 · 固定标签 · 图标激活态切换 · 三种风格 (default / card / block)，像浏览器一样管理页面。
    link: /layout/tab-bar
  - icon: 🗄️
    title: 内置后端服务
    details: Express + node:sqlite，用户/角色/导航/字典完整 CRUD，JWT 认证，菜单 path 自动计算。
    link: /guide/
  - icon: ⚡
    title: 最新技术栈
    details: React 19 + Vite 8 + TypeScript 5 + Ant Design 6 + Zustand 5 + React Router 7
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
