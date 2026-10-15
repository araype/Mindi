// Mindi · Función TEMPORAL `mrs-check`: verifica que el despliegue en Supabase incluye
// supabase/functions/_shared/mrs.js. No lee ni escribe datos: calcula niveles de casos fijos.
// Borrar después de verificar:  npx supabase functions delete mrs-check

import { computeScores, computeLevel } from '../_shared/mrs.js';

const CASES: Record<string, Record<string, number | null>> = {
  total_0: {},
  urogenital_3: { p12: 3 },
  total_8: { p3: 4, p7: 4 },
  psicologico_6: { p7: 4, p8: 2 },
  total_15: { p3: 4, p4: 3, p7: 4, p8: 1, p11: 3 },
  omitidas: { p11: null, p12: 2, p13: null },
};

Deno.serve(() => {
  const out: Record<string, unknown> = {};
  for (const [name, answers] of Object.entries(CASES)) {
    const scores = computeScores(answers);
    out[name] = { ...scores, level: computeLevel(scores) };
  }
  return new Response(JSON.stringify({ ok: true, runtime: 'deno', cases: out }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
