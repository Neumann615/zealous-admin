import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), svgr()],
  build: {
    emptyOutDir: true,
    copyPublicDir: false,
    outDir: './packages/components/dist',
    lib: {
      entry: './packages/components/index.ts',
      name: '@zealous-admin/components',
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
        'ahooks',
        'rc-slider-captcha',
        'create-puzzle',
        'react-icons',
        /^react-icons\//,
        'react-markdown',
        'react-syntax-highlighter',
        'remark-gfm',
      ],
      input: {
        index: './packages/components/index.ts',
      },
      output: {
        preserveModules: true,
        exports: 'named',
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name || ''
          const relativePath = name.replace(/^packages\/components\//, '')
          return `${relativePath}.js`
        },
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name || ''
          const relativePath = name.replace(/^packages\/components\//, '')
          return `${relativePath}.js`
        },
      },
    },
  },
})