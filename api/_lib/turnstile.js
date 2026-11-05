// Mindi · Cloudflare Turnstile (captcha invisible) en las listas de espera, la demo y el envío del
// reporte por correo (handoff 11.3). Con TURNSTILE_SECRET_KEY configurada, sin un token válido no
// se guarda nada. Sin la variable (local), no se verifica.

export const turnstileOn = () => !!process.env.TURNSTILE_SECRET_KEY;

/** → true si el token es válido (o si Turnstile no está configurado). */
export async function verifyTurnstile(token, ip, fetchImpl = fetch) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'sin-ip') body.set('remoteip', ip);
    const r = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const out = await r.json();
    return out && out.success === true;
  } catch {
    return false;
  }
}
