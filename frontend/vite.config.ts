import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: {
      '^/auth': 'http://127.0.0.1:8000',
      '^/scans': 'http://127.0.0.1:8000',
      '^/upload': 'http://127.0.0.1:8000',
      '^/remote/': 'http://127.0.0.1:8000',
      '^/products': 'http://127.0.0.1:8000',
      '^/images/': 'http://127.0.0.1:8000',
      '^/results/': 'http://127.0.0.1:8000',
      '^/ai-doctor/': 'http://127.0.0.1:8000',
      '^/model/': 'http://127.0.0.1:8000',
      '^/analyze': 'http://127.0.0.1:8000',
      '^/process': 'http://127.0.0.1:8000',
      '^/health': 'http://127.0.0.1:8000',
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
