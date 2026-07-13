import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), svgr()],
  build: {
    emptyOutDir: true,
    copyPublicDir: false,
    outDir: './packages/layout/dist',
    lib: {
      entry: './packages/layout/index.ts',
      name: '@zealous-admin/layout',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        /^react\//,
        'react-dom',
        'antd',
        /^antd\//,
        'antd-style',
        '@ant-design/colors',
        '@ant-design/happy-work-theme',
        '@ant-design/icons',
        '@tanem/react-nprogress',
        'ahooks',
        'react-router',
        'react-router-dom',
        'react-transition-group',
        '@hello-pangea/dnd',
        'zustand',
        /^zustand\//,
        '@zealous-admin/components',
        /^@zealous-admin\/components\//,
      ],
      input: {
        index: './packages/layout/index.ts',
      },
      output: {
        preserveModules: true,
        exports: 'named',
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name || ''
          const relativePath = name.replace(/^packages\/layout\//, '')
          return `${relativePath}.js`
        },
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name || ''
          const relativePath = name.replace(/^packages\/layout\//, '')
          return `${relativePath}.js`
        },
      },
    },
  },
})