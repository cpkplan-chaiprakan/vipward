import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = process.env.VITE_BASE_PATH || '/vipward/'
const apiProxy = process.env.VITE_API_PROXY || 'http://localhost'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    watch: {
      usePolling: true,
      interval: 400,
    },
    hmr: {
      clientPort: 3001,
    },
    proxy: {
      '/api': {
        target: apiProxy,
        changeOrigin: true,
      },
      '/vipward/api': {
        target: apiProxy,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vipward/, ''),
      },
    },
  },
})
