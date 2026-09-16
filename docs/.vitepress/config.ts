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
        '@zealous-admin/locales': path.resolve(__dirname, '../../packages/locales'),
      },
    },
    ssr: {
      noExternal: ['@zealous-admin/components', '@zealous-admin/locales'],
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
      { text: '工具函数', link: '/utils/' },
      { text: '表单设计器', link: '/form-designer/' },
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
            { text: 'ZaIframe 外链嵌入', link: '/components/z-iframe' },
            { text: 'ZaLinkPreview 链接预览', link: '/components/z-link-preview' },
            { text: 'ZaMarkdown Markdown 渲染', link: '/components/z-markdown' },
            { text: 'ZaMarquee 跑马灯', link: '/components/z-marquee' },
            { text: 'ZaPatternBg 图案背景', link: '/components/z-pattern-bg' },
            { text: 'ZaRichTextEditor 富文本编辑器', link: '/components/z-rich-text-editor' },
            { text: 'ZaShinyText 流光文字', link: '/components/z-shiny-text' },
            { text: 'ZaSignaturePad 签名板', link: '/components/z-signature-pad' },
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
            { text: 'useCartoonTheme', link: '/theme/use-cartoon-theme' },
            { text: 'useGlassTheme', link: '/theme/use-glass-theme' },
            { text: 'useHackerTheme', link: '/theme/use-hacker-theme' },
            { text: 'useIllustrationTheme', link: '/theme/use-illustration-theme' },
            { text: 'useMuiTheme', link: '/theme/use-mui-theme' },
            { text: 'useShadcnTheme', link: '/theme/use-shadcn-theme' },
          ],
        },
      ],
      '/utils/': [
        {
          text: '工具函数',
          link: '/utils/',
        },
        {
          text: '模块文档',
          collapsed: false,
          items: [
            { text: 'data 数据操作', link: '/utils/data' },
            { text: 'env 环境检测', link: '/utils/env' },
            { text: 'file 文件处理', link: '/utils/file' },
            { text: 'parse 解析工具', link: '/utils/parse' },
            { text: 'time 日期时间', link: '/utils/time' },
          ],
        },
      ],
      '/form-designer/': [
        {
          text: '表单设计器',
          link: '/form-designer/',
        },
        {
          text: '深入',
          collapsed: false,
          items: [
            { text: 'Schema 结构', link: '/form-designer/schema' },
            { text: '渲染项配置', link: '/form-designer/render-config' },
            { text: '事件钩子', link: '/form-designer/events' },
            { text: '组件清单', link: '/form-designer/components' },
            { text: '设计器与渲染器', link: '/form-designer/designer' },
            { text: '数据落库与查询', link: '/form-designer/data' },
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
