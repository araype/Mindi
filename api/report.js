// /api/report
//   POST { action: 'download', session_id, name? } → { ok, pdfUrl }   PDF con enlace de 24 horas
//   POST { action: 'share', session_id }           → { ok, url }      /reporte?t=…, vence a los 30 días
//   GET  ?t=<token>                                → { html }         lo que muestra /reporte
// El PDF y la copia los arma la función send-report; el navegador nunca llama a Supabase.
import { route, readJson, send, clientIp } from './_lib/http.js';
import { limit, LIMITS } from './_lib/limite.js';
import { isUuid } from './_lib/validar.js';
import { callFunction, rpc, supabaseOn } from './_lib/supabase.js';

export default route(async (req, res) => {
  const ip = clientIp(req);
  if (!supabaseOn()) return send(res, 503, { error: 'not_configured' });

  if (req.method === 'GET') {
    if (!(await limit('report_view', ip, ...LIMITS.report_view)).ok) return send(res, 429, { error: 'rate_limited' });
    const token = new URL(req.url, 'http://x').searchParams.get('t');
    if (!isUuid(token)) return send(res, 404, { error: 'not_found' });
    const rows = await rpc('get_report_by_token', { p_token: token });
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row && row.html ? send(res, 200, { html: row.html }) : send(res, 404, { error: 'not_found' });
  }

  if (!(await limit('report', ip, ...LIMITS.report)).ok) return send(res, 429, { error: 'rate_limited' });
  const b = readJson(req);
  if (!isUuid(b.session_id)) return send(res, 400, { error: 'bad_request' });
  if (b.action === 'download') {
    const name = typeof b.name === 'string' && b.name.trim() ? b.name.trim().slice(0, 80) : undefined;
    const r = await callFunction('send-report', { session_id: b.session_id, name, download_only: true });
    return r.status === 200 && r.body && r.body.ok && r.body.pdfUrl ? send(res, 200, { ok: true, pdfUrl: r.body.pdfUrl }) : send(res, 502, { error: 'report_failed' });
  }
  if (b.action === 'share') {
    const r = await callFunction('send-report', { session_id: b.session_id, share: true });
    return r.status === 200 && r.body && r.body.ok && r.body.url ? send(res, 200, { ok: true, url: r.body.url }) : send(res, 502, { error: 'report_failed' });
  }
  return send(res, 400, { error: 'bad_request' });
}, { methods: ['GET', 'POST'] });
