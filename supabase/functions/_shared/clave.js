// Mindi · Clave de servidor de Supabase para las funciones (send-report, funnel-stats, limpieza).
// Usa la clave secreta nueva (sb_secret_…), que Supabase inyecta en SUPABASE_SECRET_KEYS (JSON con
// "default"). Si no está, usa la service_role antigua (SUPABASE_SERVICE_ROLE_KEY). Así se pueden apagar
// las claves "legacy" del proyecto (paso d del lanzamiento) sin que las funciones dejen de andar.
// JavaScript plano y sin dependencias, igual que mrs.js.
export function serverKey() {
  try {
    const keys = JSON.parse(globalThis.Deno?.env.get('SUPABASE_SECRET_KEYS') || '{}');
    if (typeof keys.default === 'string' && keys.default) return keys.default;
    const first = Object.values(keys).find((v) => typeof v === 'string' && v);
    if (first) return first;
  } catch { /* formato inesperado: se usa la antigua */ }
  return globalThis.Deno?.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}
