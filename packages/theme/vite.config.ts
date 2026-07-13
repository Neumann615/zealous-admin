import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), svgr()],
  build: {
    emptyOutDir: true,
    copyPublicDir: false,
    outDir: './packages/theme/dist',
    lib: {
      entry: './packages/theme/index.ts',
      name: '@zealous-admin/theme',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'antd', 'antd-style', '@rc-component/util', 'clsx'],
      input: {
        index: './packages/theme/index.ts',
      },
      output: {
        preserveModules: true,
        exports: 'named',
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name || ''
          const relativePath = name.replace(/^packages\/theme\//, '')
          return `${relativePath}.js`
        },
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name || ''
          const relativePath = name.replace(/^packages\/theme\//, '')
          return `${relativePath}.js`
        },
      },
    },
  },
})