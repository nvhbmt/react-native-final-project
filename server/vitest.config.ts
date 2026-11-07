import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Vite không đọc `paths` của tsconfig — khai lại alias ở đây. Đổi một chỗ phải đổi cả chỗ kia
  // (tsconfig.json), nếu không tsc xanh mà `npm test` đỏ với "Failed to resolve import @/…".
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
