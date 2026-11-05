import { defineConfig, loadEnv } from 'vite';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* Solo en `npm run dev`: atiende /api/<ruta> con la misma función que usa Vercel (api/<ruta>.js),
   para probar todo en local. Las variables del servidor (SUPABASE_URL, AGENT_URL, …) salen de .env.
   En Vercel, las funciones corren solas. */
const SERVER_ENV = ['SUPABASE_URL', 'SUPABASE_KEY', 'SEND_REPORT_SECRET', 'AGENT_URL', 'GCP_SA_KEY', 'LEADS_ENC_KEY',
  'TURNSTILE_SECRET_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'RATE_LIMIT_SALT', 'ALLOWED_ORIGINS'];
function devApi(env) {
  return {
    name: 'mindi-dev-api',
    apply: 'serve',
    configureServer(server) {
      for (const k of SERVER_ENV) if (env[k] && !process.env[k]) process.env[k] = env[k];
      server.middlewares.use('/api', async (req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\/+|\/+$/g, '');
        if (!/^[a-z]+$/.test(name) || !existsSync(resolve(__dirname, 'api', `${name}.js`))) return next();
        let raw = '';
        for await (const chunk of req) raw += chunk;
        const { default: handler } = await server.ssrLoadModule(`/api/${name}.js`);
        const shim = {
          setHeader: (k, v) => res.setHeader(k, v),
          status(code) { res.statusCode = code; return shim; },
          json(body) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return shim; },
          end: () => res.end(),
        };
        await handler({ method: req.method, url: req.originalUrl || req.url, headers: req.headers, body: raw }, shim);
      });
    },
  };
}

/* Solo en dev: las rutas limpias que en Vercel resuelven cleanUrls y rewrites (vercel.json). */
const CLEAN = { '/terminos': '/terminos.html', '/privacidad': '/privacidad.html', '/reporte': '/reporte.html', '/panel': '/panel.html' };
function devCleanUrls() {
  return {
    name: 'mindi-dev-clean-urls',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, query] = (req.url || '').split('?');
        if (CLEAN[path]) req.url = CLEAN[path] + (query ? `?${query}` : '');
        else if (['/test', '/chat', '/empresas', '/especialistas'].includes(path)) req.url = '/index.html' + (query ? `?${query}` : '');
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [devCleanUrls(), devApi(loadEnv(mode, process.cwd(), ''))],
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
