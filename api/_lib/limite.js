// Mindi · Límite de llamadas por IP (handoff 11.3 y 11.5).
// Con UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN usa Upstash (compartido entre instancias);
// sin ellas, un contador en memoria por instancia (sirve en local y como respaldo, pero en
// Vercel cada instancia cuenta por separado: en producción hay que configurar Upstash).
// La IP nunca se guarda tal cual: se usa su hash con RATE_LIMIT_SALT.
import { createHash } from 'node:crypto';

const memory = new Map();

function keyFor(bucket, ip) {
  const salt = process.env.RATE_LIMIT_SALT || 'mindi';
  return `rl:${bucket}:${createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)}`;
}

/** → { ok, remaining }. max llamadas por ventana de windowSec segundos. */
export async function limit(bucket, ip, max, windowSec, fetchImpl = fetch) {
  const key = keyFor(bucket, ip);
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  // En producción, sin Upstash no se atiende (route() ya lo corta antes; esto es una segunda capa).
  if ((!url || !token) && process.env.VERCEL_ENV === 'production') return { ok: false, remaining: 0 };
  if (url && token) {
    try {
      const r = await fetchImpl(`${url.replace(/\/$/, '')}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([['INCR', key], ['EXPIRE', key, String(windowSec), 'NX']]),
      });
      const out = await r.json();
      const n = Number(out && out[0] && out[0].result);
      if (Number.isFinite(n)) return { ok: n <= max, remaining: Math.max(0, max - n) };
    } catch {
      // Si Upstash falla, se usa el contador en memoria: no se corta el servicio por el límite.
    }
  }
  const now = Date.now();
  const e = memory.get(key);
  if (!e || e.reset <= now) { memory.set(key, { n: 1, reset: now + windowSec * 1000 }); return { ok: true, remaining: max - 1 }; }
  e.n++;
  if (memory.size > 5000) for (const [k, v] of memory) if (v.reset <= now) memory.delete(k);
  return { ok: e.n <= max, remaining: Math.max(0, max - e.n) };
}

/** Límites por ruta: [máximo, segundos]. */
export const LIMITS = {
  track: [120, 60],
  session: [10, 3600],
  lead: [15, 3600],
  report: [20, 3600],
  report_view: [60, 600],
  waitlist: [15, 3600],
  agent: [20, 60],
  stats: [30, 60],
};
