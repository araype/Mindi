// POST /api/export — el panel descarga una lista descifrada (CSV). Pasa la clave del panel (x-admin-key)
// a la función export-lists, que la revisa contra ADMIN_KEY. Aquí no se guarda ni se registra nada de
// su contenido. { list, include_test }
import { route, readJson, send, clientIp, header } from './_lib/http.js';
import { limit, LIMITS } from './_lib/limite.js';
import { supabaseOn } from './_lib/supabase.js';

const LISTS = new Set(['plus', 'consultas', 'especialistas', 'empresas', 'interes', 'conversatorios', 'avisos', 'preguntas']);

export default route(async (req, res) => {
  if (!(await limit('stats', clientIp(req), ...LIMITS.stats)).ok) return send(res, 429, { error: 'rate_limited' });
  if (!supabaseOn()) return send(res, 503, { error: 'not_configured' });
  const key = header(req, 'x-admin-key');
  if (!key || key.length > 200) return send(res, 401, { error: 'unauthorized' });
  const b = readJson(req);
  if (!LISTS.has(b.list)) return send(res, 400, { error: 'bad_list' });
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, ''), sk = process.env.SUPABASE_KEY || '';
  const r = await fetch(`${url}/functions/v1/export-lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: sk, Authorization: `Bearer ${sk}`, 'x-admin-key': key, 'x-mindi-secret': process.env.SEND_REPORT_SECRET || '' },
    body: JSON.stringify({ list: b.list, include_test: b.include_test === true }),
  });
  if (!r.ok) return send(res, r.status === 401 ? 401 : 502, { error: r.status === 401 ? 'unauthorized' : 'export_failed' });
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="mindi-${b.list}.csv"`);
  res.status(200);
  return res.end ? res.end(await r.text()) : res.json({});
}, { requires: ['SEND_REPORT_SECRET'] });
