import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    emptyOutDir: true,
    copyPublicDir: false,
    outDir: './packages/metadata/dist',
    lib: {
      entry: './packages/metadata/index.ts',
      name: '@zealous-admin/metadata',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['@ant-design/icons', 'antd', 'react', 'react/jsx-runtime'],
      input: {
        index: './packages/metadata/index.ts',
      },
      output: {
        preserveModules: true,
        exports: 'named',
        entryFileNames: chunkInfo => `${chunkInfo.name.replace(/^packages\/metadata\//, '')}.js`,
        chunkFileNames: chunkInfo => `${chunkInfo.name.replace(/^packages\/metadata\//, '')}.js`,
      },
    },
  },
})
