// Mindi · Edge Function `funnel-stats`
//
// Devuelve los datos del panel interno (/panel.html): la función SQL `panel_stats` (con
// filtros de periodo y de sesiones de prueba), o la vista `funnel` si aún no existe. Ambas
// están cerradas para la clave pública (anon), así que el navegador no puede leerlas: esta
// función las lee con la service_role key, pero SOLO si la petición trae la clave del panel
// (header `x-admin-key`, igual al secreto ADMIN_KEY). Sin ese secreto configurado, responde
// 401 a todo — nunca queda abierta por accidente.
//
// Configurar una vez:  npx supabase secrets set ADMIN_KEY=<una-clave-larga>
// Desplegar:           npx supabase functions deploy funnel-stats

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ADMIN_KEY = Deno.env.get('ADMIN_KEY') ?? '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Comparación en tiempo constante, para no filtrar la clave por tiempos de respuesta.
function sameKey(a: string, b: string) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const key = req.headers.get('x-admin-key') ?? '';
  if (!ADMIN_KEY || !sameKey(key, ADMIN_KEY)) return json({ error: 'unauthorized' }, 401);

  // Filtros del panel: desde qué fecha (ISO) y si incluye sesiones de prueba.
  let since: string | null = null;
  let includeTest = false;
  try {
    const body = await req.json();
    if (typeof body.since === 'string' && !Number.isNaN(Date.parse(body.since))) since = new Date(body.since).toISOString();
    includeTest = body.include_test === true;
  } catch {
    // cuerpo vacío: sin filtros
  }

  const generated_at = new Date().toISOString();
  const { data, error } = await supabase.rpc('panel_stats', { p_since: since, p_include_test: includeTest });
  if (!error) return json({ ok: true, funnel: data ?? {}, filters: true, generated_at });

  // Si aún no se corrió supabase/009_panel_stats.sql, se usa la vista sin filtros.
  const { data: view, error: vErr } = await supabase.from('funnel').select('*').maybeSingle();
  if (vErr) return json({ error: vErr.message }, 500);
  return json({ ok: true, funnel: view ?? {}, filters: false, generated_at });
});
