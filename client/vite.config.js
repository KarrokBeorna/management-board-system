import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: '0.0.0.0',
    port: 30000, // ваш порт
    proxy: {
      '/api': {
        target: 'http://localhost:40000',
        changeOrigin: true,
      },
    },
  },
});