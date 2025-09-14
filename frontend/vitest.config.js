import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    server: {
      deps: {
        external: ['webidl-conversions', 'whatwg-url']
      }
    },
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        pretendToBeVisual: true,
        url: 'http://localhost:3000'
      }
    },
    onUnhandledRejection: 'ignore',
    onUncaughtException: 'ignore',
    // Use threads pool instead of forks for better compatibility
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    // Add test timeout
    testTimeout: 10000,
    // Disable coverage for CI to reduce overhead
    coverage: {
      enabled: false
    }
  },
})
