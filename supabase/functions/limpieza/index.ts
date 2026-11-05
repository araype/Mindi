// Edge Function: limpieza
//
// Borra los PDF del bucket `reports` con más de 30 días (plazo aprobado el 4 nov. 2026, política
// de privacidad, sección 7). Los archivos de Storage no se pueden borrar con SQL: por eso es una
// función, que pg_cron llama una vez al día (ver supabase/020_limpieza_plazos.sql).
//
// Solo responde con la cabecera x-mindi-secret igual a LIMPIEZA_SECRET.
// Desplegar: npx supabase functions deploy limpieza --no-verify-jwt
//            npx supabase secrets set LIMPIEZA_SECRET=<texto aleatorio largo>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SECRET = Deno.env.get('LIMPIEZA_SECRET') ?? '';
const DAYS = 30;
const BUCKET = 'reports';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/** Archivos de una carpeta (sin subcarpetas), de a 1000. */
async function listFolder(prefix: string) {
  const out: { name: string; created_at: string }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset, sortBy: { column: 'created_at', order: 'asc' } });
    if (error) throw error;
    out.push(...(data || []).filter((f) => f.id && f.created_at) as any);
    if (!data || data.length < 1000) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get('x-mindi-secret') !== SECRET) return new Response('unauthorized', { status: 401 });
  const limit = Date.now() - DAYS * 864e5;
  let removed = 0;
  // Raíz: PDF de los enlaces antiguos (<token>.pdf). download/: PDF de descarga (<session_id>.pdf).
  for (const prefix of ['', 'download']) {
    const old = (await listFolder(prefix)).filter((f) => new Date(f.created_at).getTime() < limit).map((f) => (prefix ? `${prefix}/${f.name}` : f.name));
    for (let i = 0; i < old.length; i += 100) {
      const { error } = await supabase.storage.from(BUCKET).remove(old.slice(i, i + 100));
      if (error) { console.error('limpieza: no se pudo borrar un lote'); continue; }
      removed += Math.min(100, old.length - i);
    }
  }
  return new Response(JSON.stringify({ ok: true, removed }), { headers: { 'Content-Type': 'application/json' } });
});
