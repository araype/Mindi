import { defineConfig, loadEnv } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* Solo en `npm run dev`: atiende /api/agent con la misma función que usa Vercel (api/agent.js),
   para probar el chat con el agente en local. En Vercel, la función corre sola. */
function devAgentRoute(env) {
  return {
    name: 'mindi-dev-agent-route',
    apply: 'serve',
    configureServer(server) {
      if (env.AGENT_URL && !process.env.AGENT_URL) process.env.AGENT_URL = env.AGENT_URL;
      server.middlewares.use('/api/agent', async (req, res) => {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        const { default: handler } = await server.ssrLoadModule('/api/agent.js');
        const shim = {
          status(code) { res.statusCode = code; return shim; },
          json(body) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return shim; },
        };
        await handler({ method: req.method, body: raw }, shim);
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [devAgentRoute(loadEnv(mode, process.cwd(), ''))],
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
}));
