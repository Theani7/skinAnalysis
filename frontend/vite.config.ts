import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: true,
    allowedHosts: true,
    proxy: {
      '^/auth': 'http://localhost:8001',
      '^/scans': 'http://localhost:8001',
      '^/upload': 'http://localhost:8001',
      '^/remote/': 'http://localhost:8001',
      '^/products': 'http://localhost:8001',
      '^/images/': 'http://localhost:8001',
      '^/results/': 'http://localhost:8001',
      '^/ai-doctor/': 'http://localhost:8001',
      '^/model/': 'http://localhost:8001',
      '^/analyze': 'http://localhost:8001',
      '^/process': 'http://localhost:8001',
      '^/health': 'http://localhost:8001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'face-api': ['face-api.js'],
          'recharts': ['recharts'],
          'jspdf': ['jspdf'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
