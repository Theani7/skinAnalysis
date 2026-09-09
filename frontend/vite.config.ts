import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: {
      '^/auth': 'http://localhost:8000',
      '^/scans': 'http://localhost:8000',
      '^/upload': 'http://localhost:8000',
      '^/remote/': 'http://localhost:8000',
      '^/products': 'http://localhost:8000',
      '^/images/': 'http://localhost:8000',
      '^/results/': 'http://localhost:8000',
      '^/ai-doctor/': 'http://localhost:8000',
      '^/model/': 'http://localhost:8000',
      '^/analyze': 'http://localhost:8000',
      '^/process': 'http://localhost:8000',
      '^/health': 'http://localhost:8000',
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
