import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname),
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
  },
  css: false,
})
