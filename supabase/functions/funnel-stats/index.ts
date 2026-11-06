// Mindi · Edge Function `funnel-stats`
//
// Devuelve los datos del panel interno (/panel.html): la función SQL `panel_stats` (con
// filtros de periodo y de sesiones de prueba), o la vista `funnel` si aún no existe; con
// { view: 'eventos' }, los datos del conversatorio (función `event_stats`). Todas
// están cerradas para la clave pública (anon), así que el navegador no puede leerlas: esta
// función las lee con la service_role key, pero SOLO si la petición trae la clave del panel
// (header `x-admin-key`, igual al secreto ADMIN_KEY). Sin ese secreto configurado, responde
// 401 a todo — nunca queda abierta por accidente.
//
// Configurar una vez:  npx supabase secrets set ADMIN_KEY=<una-clave-larga>
// Desplegar:           npx supabase functions deploy funnel-stats

// Paquete de npm con versión exacta; deno.lock (en esta carpeta) fija su hash (hallazgo 12).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { serverKey } from '../_shared/clave.js';

const ADMIN_KEY = Deno.env.get('ADMIN_KEY') ?? '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  serverKey(),
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
  let until: string | null = null; // fin del periodo (Experimento 1), 025
  let includeTest = false;
  let panelView = 'chat';
  let origin: string | null = null; // null = todos · 'none' = sin origen · 'tiktok', etc.
  try {
    const body = await req.json();
    if (typeof body.since === 'string' && !Number.isNaN(Date.parse(body.since))) since = new Date(body.since).toISOString();
    if (typeof body.until === 'string' && !Number.isNaN(Date.parse(body.until))) until = new Date(body.until).toISOString();
    includeTest = body.include_test === true;
    if (body.view === 'eventos' || body.view === 'temas') panelView = body.view;
    if (typeof body.origin === 'string' && /^[a-z0-9_-]{1,30}$/.test(body.origin)) origin = body.origin;
  } catch {
    // cuerpo vacío: sin filtros
  }

  const generated_at = new Date().toISOString();
  // p_origin solo se manda si hay filtro: así sigue funcionando aunque 012 no se haya corrido.
  const args = { p_since: since, p_include_test: includeTest, ...(origin ? { p_origin: origin } : {}) };

  // Pestaña "Temas del chat": cuentas por mes y tema (supabase/022_chat_temas.sql). Sin texto ni sesiones.
  if (panelView === 'temas') {
    const { data, error } = await supabase.rpc('chat_topics_stats', { p_since: since, p_include_test: includeTest });
    if (error) return json({ ok: true, temas: null, missing: '022_chat_temas.sql', generated_at });
    // Preguntas que las usuarias aceptaron compartir (023): fecha, tema y texto ya filtrado. Sin sesión.
    const q = await supabase.rpc('chat_questions_list', { p_since: since, p_include_test: includeTest, p_limit: 300 });
    const rec = await supabase.rpc('chat_recurrence_stats', { p_since: since, p_until: until, p_include_test: includeTest }); // 027
    return json({ ok: true, temas: data ?? [], preguntas: q.error ? null : (q.data ?? []), recurrencia: rec.error ? null : (rec.data ?? {}), generated_at });
  }

  // Pestaña "Conversatorio": función event_stats (supabase/011_event_stats.sql).
  if (panelView === 'eventos') {
    const { data, error } = await supabase.rpc('event_stats', args);
    if (error) return json({ ok: true, eventos: null, missing: origin ? '012_origin.sql' : '011_event_stats.sql', generated_at });
    return json({ ok: true, eventos: data ?? {}, filters: true, generated_at });
  }

  const { data, error } = await supabase.rpc('panel_stats', { ...args, p_until: until });
  if (!error) {
    // Conversaciones del chat con IA (024). Si aún no se corrió, el panel lo indica.
    const conv = await supabase.rpc('chat_conversation_stats', args);
    return json({ ok: true, funnel: data ?? {}, conversaciones: conv.error ? null : (conv.data ?? {}), filters: true, generated_at });
  }
  if (origin) return json({ error: 'Para filtrar por origen, corre supabase/012_origin.sql en Supabase.' }, 500);

  // Si aún no se corrió supabase/009_panel_stats.sql, se usa la vista sin filtros.
  const { data: view, error: vErr } = await supabase.from('funnel').select('*').maybeSingle();
  if (vErr) return json({ error: vErr.message }, 500);
  return json({ ok: true, funnel: view ?? {}, filters: false, generated_at });
});
