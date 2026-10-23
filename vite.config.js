import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // NEXT_PUBLIC_AGENT_CHAT_ENABLED (chat con IA, bloque 5) usa el prefijo que se acordó para
  // esa variable; Vite solo expone al navegador las variables con estos prefijos.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        reporte: resolve(__dirname, 'reporte.html'),
        panel: resolve(__dirname, 'panel.html'),
        terminos: resolve(__dirname, 'terminos.html'),
        privacidad: resolve(__dirname, 'privacidad.html'),
      },
    },
  },
});
