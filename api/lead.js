// POST /api/lead — copia del reporte por correo y casillas opcionales.
//   { session_id, email?, name?, news, research, consent_text_version, is_test, turnstile }
// Con correo: Turnstile, el correo cifrado en `leads` (cifrado.js) y el envío (send-report).
// La casilla de investigación va en `research_consents`, sin nombre ni contacto.
import { route, readJson, send, clientIp } from './_lib/http.js';
import { limit, LIMITS } from './_lib/limite.js';
import { leadRequest } from './_lib/validar.js';
import { verifyTurnstile } from './_lib/turnstile.js';
import { encryptContact } from './_lib/cifrado.js';
import { insert, callFunction, supabaseOn } from './_lib/supabase.js';

export default route(async (req, res) => {
  const ip = clientIp(req);
  if (!(await limit('lead', ip, ...LIMITS.lead)).ok) return send(res, 429, { error: 'rate_limited' });
  const body = readJson(req);
  const r = leadRequest(body);
  if (r.error) return send(res, 400, { error: 'bad_request' });
  if (!supabaseOn()) return send(res, 503, { error: 'not_configured' });
  if (r.lead && !(await verifyTurnstile(body.turnstile, ip))) return send(res, 403, { error: 'captcha' });

  const base = { session_id: r.session_id, consent_text_version: r.version, is_test: r.is_test };
  if (r.research) await insert('research_consents', base);
  if (!r.lead) return send(res, 200, { ok: true });

  const lead = { ...base, name: r.lead.name, contact: encryptContact(r.lead.email), consent: true, opt_news: r.lead.news };
  if (!(await insert('leads', lead))) return send(res, 502, { error: 'not_saved' });
  const sent = await callFunction('send-report', { session_id: r.session_id });
  const ok = sent.status === 200 && sent.body && sent.body.ok;
  return send(res, 200, { ok: true, report: ok ? 'sent' : 'failed', channel: ok ? sent.body.channel : undefined });
}, { requires: ['TURNSTILE_SECRET_KEY', 'LEADS_ENC_KEY', 'SEND_REPORT_SECRET'] });
