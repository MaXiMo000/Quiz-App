import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        pretendToBeVisual: true,
        url: 'http://localhost:3000'
      }
    },
    // Suppress unhandled errors and rejections
    onUnhandledRejection: 'ignore',
    onUncaughtException: 'ignore',
    // Use single thread to avoid JSDOM issues
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    testTimeout: 10000,
    coverage: {
      enabled: false
    },
    // Use default reporter instead of deprecated basic
    reporters: [
      [
        "default",
        {
          "summary": false
        }
      ]
    ]
  },
  define: {
    global: 'globalThis'
  },
  optimizeDeps: {
    exclude: ['webidl-conversions', 'whatwg-url']
  }
})
