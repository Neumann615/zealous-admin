import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Zealous-admin',
  description: '一个基于 React + Vite + Ant Design 构建的现代化后台管理系统模板',
  lang: 'zh-CN',
  base: '/',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/logo.svg' }],
  ],

  vite: {
    plugins: [react()],
    resolve: {
      alias: {
        '@zealous-admin/components': path.resolve(__dirname, '../../packages/components'),
      },
    },
    ssr: {
      noExternal: ['@zealous-admin/components'],
    },
  },

  themeConfig: {
    logo: '/logo.svg',

    search: {
      provider: 'local',
    },

    // ---- Navbar ----
    nav: [
      { text: '指南', link: '/guide/' },
      { text: '组件', link: '/components/' },
      { text: '布局', link: '/layout/' },
      { text: '主题', link: '/theme/' },
      { text: '🔗 在线演示', link: 'https://admin.zzzpupu.xin/' },
      {
        text: 'v1.0.0',
        items: [
          { text: '更新日志', link: '/CHANGELOG' },
        ],
      },
    ],

    // ---- Sidebar ----
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '介绍', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' },
          ],
        },
      ],
      '/components/': [
        {
          text: '组件总览',
          link: '/components/',
        },
        {
          text: '基础组件',
          collapsed: false,
          items: [
            { text: 'ZaIcon 图标', link: '/components/z-icon' },
            { text: 'ZaIconPicker 图标选择器', link: '/components/z-icon' },
            { text: 'ZaLinkPreview 链接预览', link: '/components/z-link-preview' },
            { text: 'ZaMarquee 跑马灯', link: '/components/z-marquee' },
            { text: 'ZaShinyText 流光文字', link: '/components/z-shiny-text' },
            { text: 'ZaSliderCaptcha 滑块验证码', link: '/components/z-slider-captcha' },
            { text: 'ZaSparklesText 闪烁文字', link: '/components/z-sparkles-text' },
          ],
        },
      ],
      '/layout/': [
        {
          text: '布局总览',
          link: '/layout/',
        },
        {
          text: '核心',
          collapsed: false,
          items: [
            { text: 'LayoutProvider 布局提供者', link: '/layout/layout-provider' },
            { text: 'LayoutConfig 配置参考', link: '/layout/layout-config' },
          ],
        },
        {
          text: '布局模式',
          collapsed: false,
          items: [
            { text: '5 种布局模式', link: '/layout/layout-modes' },
          ],
        },
        {
          text: '功能模块',
          collapsed: false,
          items: [
            { text: '菜单系统', link: '/layout/menu-system' },
            { text: '标签栏', link: '/layout/tab-bar' },
            { text: '面包屑', link: '/layout/breadcrumb' },
            { text: '工具栏', link: '/layout/toolbar' },
          ],
        },
        {
          text: '状态管理',
          collapsed: false,
          items: [
            { text: 'Zustand 状态管理', link: '/layout/stores' },
          ],
        },
      ],
      '/theme/': [
        {
          text: '主题总览',
          link: '/theme/',
        },
        {
          text: '主题 Hook',
          collapsed: false,
          items: [
            { text: 'useBootstrapTheme', link: '/theme/use-bootstrap-theme' },
            { text: 'useGlassTheme', link: '/theme/use-glass-theme' },
            { text: 'useIllustrationTheme', link: '/theme/use-illustration-theme' },
            { text: 'useMuiTheme', link: '/theme/use-mui-theme' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Neumann615/zealous-admin' },
    ],

    editLink: {
      pattern: 'https://github.com/Neumann615/zealous-admin/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新于',
    },

    footer: {
      message: '',
      copyright: 'Copyright © 2024-present Zealous-admin',
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    outline: {
      label: '页面导航',
      level: [2, 3],
    },
  },
})
