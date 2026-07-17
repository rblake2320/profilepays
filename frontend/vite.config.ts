import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000/api/v1';

  return {
    plugins: [react()],
    define: {
      // Make API URL available as a global constant at build time
      __API_URL__: JSON.stringify(apiUrl),
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        // Proxy /api requests to the backend in development
        '/api': {
          target: 'http://localhost:3000',
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
          // Rolldown (Vite 8) only supports the function form
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
            if (id.includes('@reduxjs') || id.includes('react-redux')) return 'redux';
            if (id.includes('react')) return 'vendor';
            return undefined;
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      css: true,
    },
  };
});
