<script setup lang="ts">
import type { Root } from 'react-dom/client'
import { ZaMarquee } from '@zealous-admin/components/index'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const mountEl = ref<HTMLDivElement>()
let root: Root | null = null

const reviews = [
  { name: 'w***@qq.com', content: '这套组件库的设计风格非常现代化，API 设计清晰易懂，文档详细，上手非常快。大大提升了开发效率！' },
  { name: 'z***@163.com', content: '组件质量很高，性能优化做得很好，在复杂场景下依然保持流畅。特别是表格和表单组件，功能强大。' },
  { name: 'l***@gmail.com', content: '主题定制能力很强，暗色模式和亮色模式切换流畅，动画效果精致，用户体验非常好。' },
  { name: 'm***@126.com', content: '团队协作效率提升很多，组件复用性强，减少了重复开发工作量。代码结构清晰易于维护。' },
  { name: 'k***@aliyun.com', content: '技术支持响应及时，社区活跃，遇到问题能很快找到解决方案。是一个值得信赖的开源项目。' },
  { name: 's***@msn.com', content: 'TypeScript 类型定义完善，开发体验很好。智能提示准确，类型安全有保障，强烈推荐。' },
  { name: 'h***@qq.com', content: '移动端适配很棒，响应式设计让应用在各种设备上都有很好的表现，提供一致的用户体验。' },
  { name: 'g***@hotmail.com', content: '组件可访问性做得很好，符合 WCAG 标准。键盘导航、屏幕阅读器支持都很完善。' },
]

const cardStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '12px',
  width: '260px',
  flexShrink: 0,
  background: 'var(--vp-c-bg-soft)',
  border: '1px solid var(--vp-c-divider)',
  boxSizing: 'border-box',
  height: '140px',
  cursor: 'default',
}

const avatarStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: 'var(--vp-c-brand-2)',
}

const nameStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--vp-c-text-1)',
}

const contentStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--vp-c-text-2)',
  marginTop: '8px',
  lineHeight: 1.6,
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

function ReviewCard({ review }: { review: typeof reviews[0] }) {
  return createElement(
    'div',
    { style: cardStyle },
    createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
      createElement('img', {
        src: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${review.name}`,
        style: avatarStyle,
        alt: '',
      }),
      createElement('span', { style: nameStyle }, review.name),
    ),
    createElement('p', { style: contentStyle }, review.content),
  )
}

// 4 rows: alternating direction, half the reviews each
const rows = [
  { reviews: reviews.slice(0, 4), reverse: false },
  { reviews: reviews.slice(4), reverse: true },
  { reviews: reviews.slice(0, 4), reverse: false },
  { reviews: reviews.slice(4), reverse: true },
]

const reactEl = createElement(
  'div',
  {
    style: {
      width: '100%',
      height: '380px',
      overflow: 'hidden',
      position: 'relative',
    },
  },
  createElement(
    'div',
    null,
    ...rows.map((row, i) =>
      createElement(
        ZaMarquee,
        {
          key: i,
          pauseOnHover: false,
          reverse: row.reverse,
          repeat: 4,
          duration: 110,
          gradient: false,
          style: {
            transform: `translateY(${(i - 1) * 4.5 - 10}rem) rotate(-16deg)`,
            width: '150%',
            margin: '-48px',
          } as React.CSSProperties,
        },
        ...row.reviews.map((review, j) =>
          createElement(ReviewCard, { key: `${i}-${j}`, review }),
        ),
      ),
    ),
  ),
  createElement('div', {
    style: {
      pointerEvents: 'none',
      position: 'absolute',
      inset: 0,
      background: `linear-gradient(to bottom, transparent 0%, transparent 20%, var(--vp-c-bg) 100%)`,
    },
  }),
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
  <div ref="mountEl" class="feedback-panel-react" />
</template>
