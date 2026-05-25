import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { existsSync } from 'fs'

const sharedPath = existsSync(path.resolve(__dirname, 'shared'))
    ? path.resolve(__dirname, 'shared')
    : path.resolve(__dirname, '../../shared')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': sharedPath,
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8083',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})