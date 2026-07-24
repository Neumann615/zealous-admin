<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onMounted } from 'vue'

const { Layout } = DefaultTheme

// Inject full-screen sparkle particles on every page
onMounted(() => {
  if (typeof window === 'undefined')
    return

  const container = document.createElement('div')
  container.className = 'fullscreen-sparkles'

  // More particles for full-screen coverage, varied shapes
  const shapes = [
    'star',
    'star',
    'star',
    'star',
    'diamond',
    'diamond',
    'diamond',
    'dot',
    'dot',
    'dot',
    'dot',
    'dot',
    'flower',
    'flower',
  ]

  for (let i = 0; i < 60; i++) {
    const sparkle = document.createElement('span')
    sparkle.className = `sparkle-particle ${shapes[i % shapes.length]}`
    // Randomize vertical start position for natural distribution
    sparkle.style.setProperty('--start-y', `${Math.random() * 100}%`)
    sparkle.style.setProperty('--start-x', `${Math.random() * 100}%`)
    sparkle.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 200}px`)
    sparkle.style.setProperty('--drift-y', `${-(Math.random() * 60 + 80)}px`)
    sparkle.style.setProperty('--delay', `${Math.random() * 5}s`)
    sparkle.style.setProperty('--duration', `${2.5 + Math.random() * 4}s`)
    sparkle.style.setProperty('--size', `${0.6 + Math.random() * 1.2}`)
    container.appendChild(sparkle)
  }

  document.body.appendChild(container)
})
</script>

<template>
  <Layout />
</template>
