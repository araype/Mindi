// Mindi · Token de identidad de Google para llamar a Cloud Run privado (handoff 11.5).
// GCP_SA_KEY: el JSON de la cuenta de servicio con el rol roles/run.invoker (el texto del JSON, o el
// mismo en base64). Se firma un JWT con su clave privada y Google devuelve un ID token para la URL
// del agente (audience). Se guarda en memoria hasta 5 minutos antes de que venza (dura 1 hora).
// Sin GCP_SA_KEY: en producción falla (Cloud Run es privado); en local no se manda token.
import { createSign } from 'node:crypto';

let cache = { token: '', exp: 0, aud: '' };

function serviceAccount() {
  const raw = process.env.GCP_SA_KEY || '';
  if (!raw && process.env.VERCEL_ENV === 'production') throw new Error('gcp_sa_key_missing'); // Cloud Run es privado
  if (!raw) return null;
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const sa = JSON.parse(text);
  if (!sa.client_email || !sa.private_key) throw new Error('gcp_sa_key_invalid');
  return sa;
}

const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

/** → 'Bearer …' o '' si no hay cuenta de servicio configurada. */
export async function agentAuthorization(audience, fetchImpl = fetch, now = () => Date.now()) {
  const sa = serviceAccount();
  if (!sa) return '';
  if (cache.token && cache.aud === audience && cache.exp - 5 * 60 * 1000 > now()) return `Bearer ${cache.token}`;
  const iat = Math.floor(now() / 1000);
  const claims = { iss: sa.client_email, sub: sa.client_email, aud: 'https://oauth2.googleapis.com/token', target_audience: audience, iat, exp: iat + 3600 };
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(claims)}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const r = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || !out.id_token) throw new Error('gcp_token_failed');
  cache = { token: out.id_token, exp: (iat + 3600) * 1000, aud: audience };
  return `Bearer ${out.id_token}`;
}
