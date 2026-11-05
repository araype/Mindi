// Mindi · Supabase desde el servidor (handoff 11.1: el navegador nunca habla directo con la base).
// Usa la clave publicable, pero guardada SOLO en el servidor (SUPABASE_KEY, sin prefijo VITE_):
// así el servidor también queda limitado por RLS a insertar (segunda capa), y la clave no está
// en el código del navegador. La service_role key nunca se usa en Vercel.
// SEND_REPORT_SECRET: secreto compartido con la función send-report (cabecera x-mindi-secret).

const cfg = () => {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_KEY || '';
  if (!url || !key) throw Object.assign(new Error('supabase_not_configured'), { code: 'supabase_not_configured' });
  return { url, key };
};
export const supabaseOn = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

const headers = (key, extra = {}) => ({ 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, ...extra });

/** Inserta una fila (sin devolverla: RLS no deja leer). → true/false. */
export async function insert(table, row, fetchImpl = fetch) {
  const { url, key } = cfg();
  const r = await fetchImpl(`${url}/rest/v1/${table}`, { method: 'POST', headers: headers(key, { Prefer: 'return=minimal' }), body: JSON.stringify(row) });
  if (!r.ok) console.error('[supabase] insert', table, r.status);
  return r.ok;
}

/** Llama a una función de Supabase (send-report, funnel-stats). → { status, body }. */
export async function callFunction(name, body, extraHeaders = {}, fetchImpl = fetch) {
  const { url, key } = cfg();
  const secret = process.env.SEND_REPORT_SECRET;
  if (!secret && process.env.VERCEL_ENV === 'production') throw Object.assign(new Error('send_report_secret'), { code: 'not_configured' });
  const r = await fetchImpl(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: headers(key, { ...(secret ? { 'x-mindi-secret': secret } : {}), ...extraHeaders }),
    body: JSON.stringify(body),
  });
  const out = await r.json().catch(() => null);
  return { status: r.status, body: out };
}

/** RPC de solo lectura con la clave publicable (get_report_by_token). */
export async function rpc(name, args, fetchImpl = fetch) {
  const { url, key } = cfg();
  const r = await fetchImpl(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(key), body: JSON.stringify(args) });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}
