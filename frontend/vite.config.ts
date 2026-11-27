import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { existsSync } from 'fs'

const sharedPath = existsSync(path.resolve(__dirname, 'shared'))
    ? path.resolve(__dirname, 'shared')
    : path.resolve(__dirname, '../shared')

const devGateway = new URL(process.env.PICONSTRUCT_DEV_GATEWAY_URL || 'https://127.0.0.1')
const isLocalGateway = ['127.0.0.1', 'localhost', '[::1]'].includes(devGateway.hostname)
const gatewayProxy = { target: devGateway.origin, changeOrigin: true, secure: !isLocalGateway }

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
      '/api': gatewayProxy,
      '/chat': { ...gatewayProxy, ws: true },
      '/build-image': gatewayProxy,
    },
  },
})
