import { defineConfig, loadEnv } from 'vite';
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
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }
            if (id.includes('@mui')) {
              return 'mui';
            }
            if (id.includes('@reduxjs') || id.includes('react-redux')) {
              return 'redux';
            }
            if (id.includes('react')) {
              return 'vendor';
            }
            return undefined;
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
