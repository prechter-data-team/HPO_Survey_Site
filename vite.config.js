
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/airtable': {
        target: 'https://api.airtable.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/airtable/, '')
      }
    }
  }
})