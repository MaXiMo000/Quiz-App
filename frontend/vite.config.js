import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize for PWA
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate chunks for better caching
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
          utils: ['axios', 'framer-motion']
        }
      }
    },
    // Generate manifest for better caching
    manifest: true,
    sourcemap: false, // Disable in production for performance
  },
  server: {
    // Development server config
    host: true,
    port: 5173,
  },
  // PWA-specific optimizations
  define: {
    // Define PWA flags
    __PWA_VERSION__: JSON.stringify('2.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  }
})
