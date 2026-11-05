// Edge Function: limpieza
//
// Borra los PDF del bucket `reports` con más de 30 días (plazo aprobado el 4 nov. 2026, política
// de privacidad, sección 7). Los archivos de Storage no se pueden borrar con SQL: por eso es una
// función, que pg_cron llama una vez al día (ver supabase/020_limpieza_plazos.sql).
//
// Solo responde con la cabecera x-mindi-secret igual a LIMPIEZA_SECRET.
// Desplegar: npx supabase functions deploy limpieza --no-verify-jwt
//            npx supabase secrets set LIMPIEZA_SECRET=<texto aleatorio largo>

// Paquete de npm con versión exacta; deno.lock (en esta carpeta) fija su hash (hallazgo 12).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { serverKey } from '../_shared/clave.js';

const SECRET = Deno.env.get('LIMPIEZA_SECRET') ?? '';
const DAYS = 30;
const BUCKET = 'reports';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serverKey());

/** Archivos de una carpeta (sin subcarpetas), de a 1000. */
async function listFolder(prefix: string) {
  const out: { name: string; created_at: string }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset, sortBy: { column: 'created_at', order: 'asc' } });
    if (error) throw Object.assign(new Error('list_failed'), { code: (error as any).statusCode || 'list' });
    out.push(...(data || []).filter((f) => f.id && f.created_at) as any);
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Compara dos secretos en tiempo constante (no se puede adivinar por cuánto tarda la respuesta). */
function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (!SECRET || !safeEqual(req.headers.get('x-mindi-secret') ?? '', SECRET)) return new Response('unauthorized', { status: 401 });
  const limit = Date.now() - DAYS * 864e5;
  let removed = 0;
  try {
  // Raíz: PDF de los enlaces antiguos (<token>.pdf). download/: PDF de descarga (<session_id>.pdf).
  for (const prefix of ['', 'download']) {
    const old = (await listFolder(prefix)).filter((f) => new Date(f.created_at).getTime() < limit).map((f) => (prefix ? `${prefix}/${f.name}` : f.name));
    for (let i = 0; i < old.length; i += 100) {
      const { error } = await supabase.storage.from(BUCKET).remove(old.slice(i, i + 100));
      if (error) { console.error('limpieza: no se pudo borrar un lote'); continue; }
      removed += Math.min(100, old.length - i);
    }
  }
  } catch (e) {
    console.error('limpieza', (e as any)?.code || 'error'); // sin detalles hacia afuera
    return new Response(JSON.stringify({ ok: false, error: 'cleanup_failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ ok: true, removed }), { headers: { 'Content-Type': 'application/json' } });
});
