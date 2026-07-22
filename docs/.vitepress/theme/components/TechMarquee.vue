<script setup lang="ts">
import type { Root } from 'react-dom/client'
import { ZaMarquee } from '@zealous-admin/components/index'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const mountEl = ref<HTMLDivElement>()
let root: Root | null = null

const techItems = [
  '⚛️ React 19',
  '⚡ Vite 8',
  '🔷 TypeScript 5',
  '🐜 Ant Design 6',
  '🐻 Zustand 5',
  '🔀 React Router 7',
  '📦 pnpm',
  '🎨 antd-style',
  '🪝 ahooks',
  '🎯 @hello-pangea/dnd',
  '📝 react-markdown',
  '✨ Animate.css',
  '🔄 React Transition Group',
  '🌐 View Transitions API',
  '🖥️ CodeMirror',
  '🌬️ Tailwind CSS',
  '📝 react-syntax-highlighter',
]

const reactEl = createElement(
  ZaMarquee,
  { gap: 32, duration: 25, gradient: false, repeat: 2 },
  ...techItems.map(item =>
    createElement(
      'span',
      {
        key: item,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 20px',
          borderRadius: '50px',
          background: 'var(--z-card-bg, rgba(255,255,255,0.7))',
          border: '1px solid var(--z-card-border, rgba(22,119,255,0.1))',
          fontSize: '14px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(8px)',
        },
      },
      item,
    ),
  ),
)

onMounted(() => {
  if (mountEl.value) {
    root = createRoot(mountEl.value)
    root.render(reactEl)
  }
})

onBeforeUnmount(() => {
  if (root) {
    root.unmount()
  }
})
</script>

<template>
  <div ref="mountEl" class="tech-marquee-react" />
</template>
