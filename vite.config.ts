import path from 'node:path'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [
    react(),
    svgr({
      // svgr options: https://react-svgr.com/docs/options/
      svgrOptions: {
        exportType: 'default',
        ref: true,
        svgo: false,
        titleProp: true,
      },
      include: '**/*.svg',
    }),
    Pages({
      importMode: 'sync',
      extendRoute(route) {
        if (route.path === 'login' || route.path === '*') {
          // Index is unauthenticated.
          return route
        }
        // Augment the route with meta that indicates that the route requires authentication.
        return {
          ...route,
          meta: { auth: true },
        }
      },
    }),
    visualizer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@zealous-admin': path.resolve(__dirname, './packages'),
    },
  },
  server: {
    port: 3509,
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const reactIconsMatch = id.match(/node_modules\/react-icons\/([^/]+)/)
            if (reactIconsMatch) {
              return `vendors/react-icons/react-icons-${reactIconsMatch[1]}`
            }
            const match = id.match(/node_modules\/\.pnpm\/([^/]+)@[^/]+\/node_modules\/(@[^/]+\/[^/]+|[^/]+)|node_modules\/(@[^/]+\/[^/]+|[^/]+)/)
            if (match) {
              const packageName = match[2] || match[3] || match[1]
              if (packageName.startsWith('@ant-design')) {
                return `vendors/@ant-design/${packageName.replace('@ant-design/', '')}`
              }
              if (packageName.startsWith('antd')) {
                return `vendors/antd/${packageName}`
              }
              return `vendors/${packageName}`
            }
            return 'vendors/others'
          }
          return undefined
        },
      },
    },
  },
})
