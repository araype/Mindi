// Mindi · Utilidades comunes de las rutas /api: leer el cuerpo, responder, origen y IP.
// Los errores que ve el navegador son genéricos; el detalle va al log sin datos personales (11.3).

const MAX_BODY = 32 * 1024;

export function readJson(req) {
  const b = req.body;
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  const raw = Buffer.isBuffer(b) ? b.toString('utf8') : typeof b === 'string' ? b : '';
  if (!raw || raw.length > MAX_BODY) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function send(res, status, body) {
  if (typeof res.setHeader === 'function') res.setHeader('Cache-Control', 'no-store');
  if (body === undefined) { res.status(status); return res.end ? res.end() : res.json({}); }
  return res.status(status).json(body);
}

/** Producción en Vercel (VERCEL_ENV=production): ahí, si falta una variable de seguridad, la ruta
 *  no atiende (falla cerrado, hallazgo 5). En local y en la vista previa sin variables, sigue abierta. */
export const isProduction = () => process.env.VERCEL_ENV === 'production';

/* Variables de seguridad que toda ruta necesita en producción; cada ruta suma las suyas (requires). */
const ALWAYS = ['SUPABASE_URL', 'SUPABASE_KEY', 'ALLOWED_ORIGINS', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'RATE_LIMIT_SALT'];
/** → nombres de las variables que faltan (solo en producción; nunca sus valores). */
export function missingConfig(requires = []) {
  if (!isProduction()) return [];
  return [...ALWAYS, ...requires].filter((k) => !process.env[k]);
}

/** Solo acepta llamadas desde el propio sitio. ALLOWED_ORIGINS: lista separada por comas
 *  (ej.: https://mindifem.com,https://www.mindifem.com). Sin la variable: abierto en local,
 *  cerrado en producción. */
export function originAllowed(req) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.length) return !isProduction();
  const origin = header(req, 'origin');
  return !!origin && allowed.includes(origin);
}

export function header(req, name) {
  const h = req.headers || {};
  const v = typeof h.get === 'function' ? h.get(name) : h[name] ?? h[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v || '';
}

/** IP de quien llama (Vercel la pone en x-forwarded-for). Solo se usa, cifrada, para el límite. */
export function clientIp(req) {
  return (header(req, 'x-forwarded-for').split(',')[0] || header(req, 'x-real-ip') || '').trim() || 'sin-ip';
}

/** Ruta sin la parte de la consulta (?…): nunca se registran tokens ni parámetros (hallazgo 6). */
const pathOf = (req) => String(req.url || '').split('?')[0].split('#')[0];

/** Envoltura de cada ruta: solo POST con cuerpo JSON (hallazgo 7), solo desde el propio sitio,
 *  variables de seguridad completas en producción (hallazgo 5) y errores genéricos hacia afuera. */
export function route(handler, { methods = ['POST'], requires = [] } = {}) {
  return async (req, res) => {
    if (!methods.includes(req.method)) return send(res, 405, { error: 'method_not_allowed' });
    const missing = missingConfig(requires);
    if (missing.length) { console.error('[api]', pathOf(req), 'faltan variables:', missing.join(', ')); return send(res, 503, { error: 'not_configured' }); }
    if (req.method !== 'GET' && !/^application\/json(\s*;|$)/i.test(header(req, 'content-type'))) return send(res, 415, { error: 'unsupported_media_type' });
    if (req.method !== 'GET' && !originAllowed(req)) return send(res, 403, { error: 'forbidden' });
    try {
      return await handler(req, res);
    } catch (e) {
      console.error('[api]', pathOf(req), e && e.code ? e.code : 'error');
      return send(res, 500, { error: 'server_error' });
    }
  };
}
