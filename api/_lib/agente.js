// Mindi · Puente entre la web y el agente de IA (Mindi_agents, Google ADK en Cloud Run).
//
// Corre SOLO en el servidor (ruta /api/agent de Vercel): el navegador nunca habla directo con
// Cloud Run. Aquí se valida todo lo que viaja al agente:
//   - el id de sesión es un UUID generado por la web, sin datos de la usuaria
//   - resultado_mrs lleva los 4 puntajes, senal_alerta y, desde el 17 nov. 2026, el detalle del reporte
//     (síntomas más fuertes, metas, edad y regla), todo de listas cerradas (ver cleanResultado)
//   - cada mensaje tiene un largo máximo
// No se guarda ninguna conversación en Mindi: el agente la mantiene en memoria mientras dura.
// (Carpeta _lib: Vercel no la publica como ruta.)

import { agentAuthorization } from './gcp.js';
import { GOAL_OPTIONS } from '../../supabase/functions/_shared/autocuidado.js';
// Lista cerrada de temas de /chat?tema= (la misma que usa la web): al agente solo le llega la etiqueta.
export { chatTopic } from '../../src/agente.js';

export const APP_NAME = 'mindi_agent';
/* Herramienta con la que el agente recomienda el test (handoff 10.5.1). Responde
   { mostrar_boton: true | false }: la herramienta aplica las reglas (máximo dos veces, nunca si ya
   hay resultado ni con una alerta reciente) y la web solo dibuja el botón si es true.
   La web nunca recibe del agente URLs ni HTML: solo la acción RECOMMEND_TEST.
   LEGACY_OFFER_TOOL es la versión anterior del agente (ofrecer_test, sin reglas): se acepta
   mientras Cloud Run no tenga desplegada la nueva; se puede quitar después. */
export const RECOMMEND_TEST_TOOL = 'recomendar_test';
export const LEGACY_OFFER_TOOL = 'ofrecer_test';
export const RECOMMEND_TEST = 'recommend_test';
/* Tema de cada pregunta (nivel 1, tabla chat_topics): el agente llama a clasificar_tema con una etiqueta. */
export const TOPIC_TOOL = 'clasificar_tema';
export const CHAT_TOPIC_LABELS = ['bochornos', 'sueno', 'animo', 'peso', 'vida_intima', 'terapia_hormonal',
  'remedios_naturales', 'edad_inicio', 'duracion', 'trabajo', 'otro'];
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
/* Detalle del reporte para el chat (17 nov. 2026). Las mismas opciones del test (src/main.js) y del agente
   (SINTOMAS_MRS, METAS, EDADES y CICLOS en Mindi_agents): si cambian allá, cambian aquí. */
export const SYMPTOM_IDS = ['p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13'];
export const MAX_SYMPTOMS = 6;
export const AGE_OPTIONS = ['Menor de 40', '40 a 45', '46 a 52', 'Mayor de 52'];
export const CYCLE_OPTIONS = ['Sigue regular', 'Es irregular (varía o se retrasa)', 'Más de 60 días sin regla',
  'Más de 12 meses sin regla', 'Me hicieron una histerectomía'];
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
  // Detalle del reporte (opcional): solo valores de estas listas, nunca texto libre.
  if (Array.isArray(r.sintomas)) {
    const s = r.sintomas
      .filter((x) => x && SYMPTOM_IDS.includes(x.id) && Number.isInteger(x.nivel) && x.nivel >= 2 && x.nivel <= 4)
      .slice(0, MAX_SYMPTOMS).map((x) => ({ id: x.id, nivel: x.nivel }));
    if (s.length) out.sintomas = s;
  }
  if (Array.isArray(r.metas)) {
    const m = GOAL_OPTIONS.filter((g) => r.metas.includes(g));
    if (m.length) out.metas = m;
  }
  if (AGE_OPTIONS.includes(r.edad)) out.edad = r.edad;
  if (CYCLE_OPTIONS.includes(r.ciclo)) out.ciclo = r.ciclo;
  return out;
}

/** Texto de la usuaria: recortado, sin vacíos, con largo máximo. null si no sirve. */
export function cleanText(t) {
  if (typeof t !== 'string') return null;
  const s = t.trim();
  return s && s.length <= MAX_TEXT ? s : null;
}

/** Eventos de /run → { text, area, action }: la última respuesta con texto del agente y, si en
 *  este turno la herramienta pidió mostrar el botón del test, action = 'recommend_test' (si no,
 *  null). Devuelve null si no hay texto. */
export function extractReply(events) {
  if (!Array.isArray(events)) return null;
  const partsOf = (e) => (e && e.content && e.content.parts) || [];
  const parts = events.flatMap(partsOf);
  const recommend = parts.some((p) => p.functionResponse && p.functionResponse.name === RECOMMEND_TEST_TOOL
      && p.functionResponse.response && p.functionResponse.response.mostrar_boton === true)
    || parts.some((p) => p.functionCall && p.functionCall.name === LEGACY_OFFER_TOOL);
  const action = recommend ? RECOMMEND_TEST : null;
  // Primera etiqueta del turno (si el coordinador transfiere, el área también puede clasificar).
  const call = parts.find((p) => p.functionCall && p.functionCall.name === TOPIC_TOOL);
  const raw = call && call.functionCall.args && call.functionCall.args.tema;
  const topic = call ? (CHAT_TOPIC_LABELS.includes(raw) ? raw : 'otro') : null;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i] || {};
    const text = partsOf(e).filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('').trim();
    if (text && e.author && e.author !== 'user') return { text, area: AREA_BY_AUTHOR[e.author] || 'otro', action, topic };
  }
  return null; // el botón nunca va solo: siempre debajo de una respuesta
}

/** Llama al agente. fetchImpl permite probarlo sin red. Lanza Error('agent_unavailable') si falla. */
export async function callAgent({ agentUrl, action, session, resultado, tema, text }, fetchImpl = fetch, timeoutMs = 55000, retryDelayMs = 1000, auth = agentAuthorization) {
  const base = String(agentUrl || '').replace(/\/$/, '');
  if (!base) throw new Error('agent_not_configured');
  // Cloud Run privado (11.5): ID token de la cuenta de servicio, si GCP_SA_KEY está configurada.
  let authorization = '';
  try { authorization = await auth(base, fetchImpl); } catch { throw new Error('agent_unavailable'); }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const once = (path, body) => fetchImpl(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
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
    if (action === 'warm') {
      // Despierta Cloud Run y carga el agente (sin llamar al modelo) para que el primer mensaje no espere.
      const r = await fetchImpl(`${base}/apps/${APP_NAME}/app-info`, {
        headers: authorization ? { Authorization: authorization } : {}, signal: ctrl.signal,
      });
      if (!r.ok) throw new Error('agent_unavailable');
      return { ok: true };
    }
    if (action === 'start') {
      const state = { ...(resultado ? { resultado_mrs: resultado } : {}), ...(tema ? { tema_inicial: tema } : {}) };
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
