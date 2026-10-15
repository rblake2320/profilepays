import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || '/api';

  return {
    plugins: [react()],
    define: {
      // Make API URL available as a global constant at build time
      __API_URL__: JSON.stringify(apiUrl),
    },
    server: {
      port: 5173,
      open: false,
      proxy: {
        // Proxy /api requests to the backend in development
        '/api': {
          target: env.API_PROXY_TARGET || 'http://127.0.0.1:8931',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
            redux: ['@reduxjs/toolkit', 'react-redux'],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './jest.setup.js',
      css: true,
    },
  };
});
