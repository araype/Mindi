// POST /api/stats — el panel (/panel) pide los números a funnel-stats por aquí, para que la clave
// de Supabase no esté en el navegador. La clave del panel (x-admin-key) la revisa funnel-stats.
import { route, readJson, send, clientIp, header } from './_lib/http.js';
import { limit, LIMITS } from './_lib/limite.js';
import { callFunction, supabaseOn } from './_lib/supabase.js';

export default route(async (req, res) => {
  if (!(await limit('stats', clientIp(req), ...LIMITS.stats)).ok) return send(res, 429, { error: 'rate_limited' });
  if (!supabaseOn()) return send(res, 503, { error: 'not_configured' });
  const key = header(req, 'x-admin-key');
  if (!key || key.length > 200) return send(res, 401, { error: 'unauthorized' });
  const r = await callFunction('funnel-stats', readJson(req), { 'x-admin-key': key });
  return send(res, r.status, r.body || { error: 'stats_failed' });
});
