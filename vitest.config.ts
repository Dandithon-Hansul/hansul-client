import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // 테스트는 항상 mock 모드 (Supabase·백엔드 없이 실행)
    env: { VITE_USE_MOCK: 'true' },
  },
})
