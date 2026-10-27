import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost/LMS/backend',
        changeOrigin: true,
        secure: false,
      },
      '/LMS': {
        target: 'http://localhost',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost/LMS/backend',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
