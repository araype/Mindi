// Mindi · Edge Function `funnel-stats`
//
// Devuelve la fila de la vista `funnel` para el panel interno (/panel.html). La vista está
// cerrada para la clave pública (anon), así que el navegador no puede leerla directo: esta
// función la lee con la service_role key, pero SOLO si la petición trae la clave del panel
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

  const { data, error } = await supabase.from('funnel').select('*').maybeSingle();
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, funnel: data ?? {}, generated_at: new Date().toISOString() });
});
