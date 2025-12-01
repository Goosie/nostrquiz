import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 12000,
    cors: true,
    allowedHosts: ['work-1-vmjheokffesqyjko.prod-runtime.all-hands.dev'],
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Access-Control-Allow-Origin': '*',
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 12000,
    cors: true,
    allowedHosts: ['work-1-vmjheokffesqyjko.prod-runtime.all-hands.dev'],
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Access-Control-Allow-Origin': '*',
    }
  }
})