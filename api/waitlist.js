// POST /api/waitlist — listas de espera y demo (landing) y lista de interés del filtro de etapa.
//   { list: 'plus'|'consultas'|'especialistas'|'empresas', values, consent_text_version, is_test, origin, turnstile }
//   { segment: 'under40_regular'|'under40_irregular', email, consent_text_version, is_test, turnstile }
// Con Turnstile. Va a `interest_signups` (SQL 015 y 017), sin sesión ni respuestas del test.
import { route, readJson, send, clientIp } from './_lib/http.js';
import { limit, LIMITS } from './_lib/limite.js';
import { interestRow } from './_lib/validar.js';
import { verifyTurnstile } from './_lib/turnstile.js';
import { insert, supabaseOn } from './_lib/supabase.js';
import { waitlistRow } from '../src/landing.js';

export default route(async (req, res) => {
  const ip = clientIp(req);
  if (!(await limit('waitlist', ip, ...LIMITS.waitlist)).ok) return send(res, 429, { error: 'rate_limited' });
  const b = readJson(req);
  let row;
  if (b.segment) {
    const r = interestRow(b);
    if (r.error) return send(res, 400, { error: 'bad_request' });
    row = r.row;
  } else {
    const r = waitlistRow(b.list, { ...(b.values || {}), consent: b.values && b.values.consent === true });
    const version = typeof b.consent_text_version === 'string' && b.consent_text_version.length <= 20 ? b.consent_text_version : null;
    if (r.error || !version) return send(res, 400, { error: 'bad_request' });
    row = { ...r.row, consent: true, consent_text_version: version, is_test: b.is_test === true };
    if (typeof b.origin === 'string' && /^[a-z0-9_-]{1,30}$/.test(b.origin)) row.origin = b.origin;
  }
  if (!supabaseOn()) return send(res, 503, { error: 'not_configured' });
  if (!(await verifyTurnstile(b.turnstile, ip))) return send(res, 403, { error: 'captcha' });
  return (await insert('interest_signups', row)) ? send(res, 200, { ok: true }) : send(res, 502, { error: 'not_saved' });
});
