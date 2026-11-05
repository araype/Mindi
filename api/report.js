// /api/report
//   POST { action: 'pdf', session_id, name? }      → el PDF (application/pdf, reporte-mindi.pdf)
//   POST { action: 'download', session_id, name? } → { ok, pdfUrl }   PDF con enlace de 24 horas
//   POST { action: 'share', session_id }           → { ok, url }      /reporte.html#t=…, vence a los 30 días
//   POST { action: 'view', token }                 → { html }         lo que muestra /reporte
// El token va en el cuerpo (no en la URL) para que no quede en los registros de Vercel (hallazgo 6).
// El PDF y la copia los arma la función send-report; el navegador nunca llama a Supabase.
import { route, readJson, send, clientIp } from './_lib/http.js';
import { limit, LIMITS } from './_lib/limite.js';
import { isUuid } from './_lib/validar.js';
import { callFunction, rpc, supabaseOn } from './_lib/supabase.js';
import { fetchReportPdf } from './_lib/pdf.js';

export default route(async (req, res) => {
  const ip = clientIp(req);
  if (!supabaseOn()) return send(res, 503, { error: 'not_configured' });

  const b = readJson(req);
  if (b.action === 'view') {
    if (!(await limit('report_view', ip, ...LIMITS.report_view)).ok) return send(res, 429, { error: 'rate_limited' });
    const token = b.token;
    if (!isUuid(token)) return send(res, 404, { error: 'not_found' });
    const rows = await rpc('get_report_by_token', { p_token: token });
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row && row.html ? send(res, 200, { html: row.html }) : send(res, 404, { error: 'not_found' });
  }

  if (!(await limit('report', ip, ...LIMITS.report)).ok) return send(res, 429, { error: 'rate_limited' });
  if (!isUuid(b.session_id)) return send(res, 400, { error: 'bad_request' });
  if (b.action === 'pdf') {
    // El archivo mismo, para descargarlo o compartirlo desde el navegador sin abrir una página.
    const name = typeof b.name === 'string' && b.name.trim() ? b.name.trim().slice(0, 80) : undefined;
    const r = await callFunction('send-report', { session_id: b.session_id, name, download_only: true });
    if (!(r.status === 200 && r.body && r.body.ok && r.body.pdfUrl)) return send(res, 502, { error: 'report_failed' });
    let pdf;
    try { pdf = await fetchReportPdf(r.body.pdfUrl, process.env.SUPABASE_URL); } catch { return send(res, 502, { error: 'report_failed' }); }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-mindi.pdf"');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(pdf.length));
    return res.end(pdf);
  }
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
}, { requires: ['SEND_REPORT_SECRET'] });
