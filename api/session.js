// POST /api/session — las respuestas del test → tabla `sessions` (sin datos personales).
// El puntaje y el nivel se recalculan aquí con el módulo compartido (_shared/mrs.js).
import { route, readJson, send, clientIp } from './_lib/http.js';
import { limit, LIMITS } from './_lib/limite.js';
import { sessionRow } from './_lib/validar.js';
import { insert, supabaseOn } from './_lib/supabase.js';

export default route(async (req, res) => {
  if (!(await limit('session', clientIp(req), ...LIMITS.session)).ok) return send(res, 429, { error: 'rate_limited' });
  const { row, error } = sessionRow(readJson(req));
  if (error) return send(res, 400, { error: 'bad_request' });
  if (!supabaseOn()) return send(res, 503, { error: 'not_configured' });
  return (await insert('sessions', row)) ? send(res, 200, { ok: true }) : send(res, 502, { error: 'not_saved' });
});
