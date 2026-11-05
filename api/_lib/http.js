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

/** Solo acepta llamadas desde el propio sitio. ALLOWED_ORIGINS: lista separada por comas
 *  (ej.: https://mindifem.com,https://www.mindifem.com). Sin la variable, no se revisa (local). */
export function originAllowed(req) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.length) return true;
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

/** Envoltura de cada ruta: método POST (o GET si se permite), origen, y errores genéricos. */
export function route(handler, { methods = ['POST'] } = {}) {
  return async (req, res) => {
    if (!methods.includes(req.method)) return send(res, 405, { error: 'method_not_allowed' });
    if (req.method !== 'GET' && !originAllowed(req)) return send(res, 403, { error: 'forbidden' });
    try {
      return await handler(req, res);
    } catch (e) {
      console.error('[api]', req.url, e && e.code ? e.code : (e && e.message ? e.message.slice(0, 120) : 'error'));
      return send(res, 500, { error: 'server_error' });
    }
  };
}
