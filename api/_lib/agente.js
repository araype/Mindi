// Mindi · Puente entre la web y el agente de IA (Mindi_agents, Google ADK en Cloud Run).
//
// Corre SOLO en el servidor (ruta /api/agent de Vercel): el navegador nunca habla directo con
// Cloud Run. Aquí se valida todo lo que viaja al agente:
//   - el id de sesión es un UUID generado por la web, sin datos de la usuaria
//   - resultado_mrs solo lleva los 4 puntajes y senal_alerta (ver agentMrsResult en mrs.js)
//   - cada mensaje tiene un largo máximo
// No se guarda ninguna conversación en Mindi: el agente la mantiene en memoria mientras dura.
// (Carpeta _lib: Vercel no la publica como ruta.)

export const APP_NAME = 'mindi_agent';
export const MAX_TEXT = 1000;

/* Áreas del agente (author de cada respuesta) → nombre corto para la analítica. */
export const AREA_BY_AUTHOR = {
  mindi: 'coordinador',
  psicologia: 'psicologia',
  hormonal: 'hormonal',
  ginecologia: 'ginecologia',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const validSession = (id) => typeof id === 'string' && UUID.test(id);

const MAX = { total: 44, somatico: 16, psicologico: 16, urogenital: 12 };
const isScore = (v, max) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;

/** Deja pasar solo lo que el agente necesita; cualquier otra cosa se descarta. null si no es válido. */
export function cleanResultado(r) {
  if (!r || typeof r !== 'object') return null;
  const out = {};
  for (const [k, max] of Object.entries(MAX)) {
    if (!isScore(r[k], max)) return null;
    out[k] = r[k];
  }
  out.senal_alerta = r.senal_alerta === true;
  return out;
}

/** Texto de la usuaria: recortado, sin vacíos, con largo máximo. null si no sirve. */
export function cleanText(t) {
  if (typeof t !== 'string') return null;
  const s = t.trim();
  return s && s.length <= MAX_TEXT ? s : null;
}

/** Eventos de /run → { text, area } de la última respuesta con texto del agente. */
export function extractReply(events) {
  if (!Array.isArray(events)) return null;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i] || {};
    const parts = (e.content && e.content.parts) || [];
    const text = parts.filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('').trim();
    if (text && e.author && e.author !== 'user') return { text, area: AREA_BY_AUTHOR[e.author] || 'otro' };
  }
  return null;
}

/** Llama al agente. fetchImpl permite probarlo sin red. Lanza Error('agent_unavailable') si falla. */
export async function callAgent({ agentUrl, action, session, resultado, text }, fetchImpl = fetch, timeoutMs = 25000, retryDelayMs = 1000) {
  const base = String(agentUrl || '').replace(/\/$/, '');
  if (!base) throw new Error('agent_not_configured');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const once = (path, body) => fetchImpl(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  });
  // Cloud Run se apaga cuando no hay uso y al despertar puede fallar la primera llamada:
  // un reintento, solo ante error del servidor (5xx) o de red, nunca ante 4xx.
  const post = async (path, body) => {
    try {
      const r = await once(path, body);
      if (r.status < 500) return r;
    } catch (e) {
      if (ctrl.signal.aborted) throw e;
    }
    await new Promise((res) => setTimeout(res, retryDelayMs));
    return once(path, body);
  };
  try {
    if (action === 'start') {
      const state = resultado ? { resultado_mrs: resultado } : {};
      const r = await post(`/apps/${APP_NAME}/users/${session}/sessions`, { session_id: session, state });
      if (!r.ok) throw new Error('agent_unavailable');
      return { ok: true };
    }
    const r = await post('/run', {
      app_name: APP_NAME,
      user_id: session,
      session_id: session,
      new_message: { role: 'user', parts: [{ text }] },
    });
    if (r.status === 404) throw new Error('session_lost');
    if (!r.ok) throw new Error('agent_unavailable');
    const reply = extractReply(await r.json());
    if (!reply) throw new Error('agent_unavailable');
    return reply;
  } catch (e) {
    if (e && (e.message === 'session_lost' || e.message === 'agent_not_configured')) throw e;
    throw new Error('agent_unavailable');
  } finally {
    clearTimeout(timer);
  }
}
