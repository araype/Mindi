// POST /api/track — un evento de analítica { session_id, name, props } → tabla `events`.
// Solo el nombre de la acción y datos de uso (handoff 11.8): validar.js descarta el resto.
import { route, readJson, send, clientIp } from './_lib/http.js';
import { limit, LIMITS } from './_lib/limite.js';
import { eventRow } from './_lib/validar.js';
import { insert, supabaseOn } from './_lib/supabase.js';

export default route(async (req, res) => {
  if (!(await limit('track', clientIp(req), ...LIMITS.track)).ok) return send(res, 429, { error: 'rate_limited' });
  const { row, error } = eventRow(readJson(req));
  if (error) return send(res, 400, { error: 'bad_request' });
  if (!supabaseOn()) return send(res, 503, { error: 'not_configured' });
  return send(res, (await insert('events', row)) ? 204 : 502);
});
