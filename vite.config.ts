import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // 關鍵在這裡！把目標指向您的雲端後端 (Render)
        target: 'https://insbuy-backend.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})