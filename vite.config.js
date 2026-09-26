import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        reporte: resolve(__dirname, 'reporte.html'),
        panel: resolve(__dirname, 'panel.html'),
      },
    },
  },
});
