// Ruta del servidor POST /api/agent (función de Vercel). Ver api/_lib/agente.js.
//   { action: 'start', session, resultado_mrs?, tema_inicial? } → { ok: true }
//     tema_inicial: solo 'peso' o 'trabajo' (chatTopic); cualquier otro valor se ignora.
//   { action: 'message', session, text }          → { text, area, action: 'recommend_test' | null }
//   { action: 'warm' }                             → { ok: true }  (al abrir /chat: despierta al agente)
// La URL del agente va en AGENT_URL (variable del servidor, sin prefijo VITE_: no llega al navegador).

import { validSession, cleanResultado, cleanText, callAgent, chatTopic } from './_lib/agente.js';
import { route, readJson, send, clientIp } from './_lib/http.js';
import { limit, LIMITS } from './_lib/limite.js';
import { insert, supabaseOn } from './_lib/supabase.js';
import { redact } from './_lib/redactar.js';

/* Nivel 1 (chat_topics): por cada pregunta, la etiqueta de tema, el área, el nivel del test y si llegó por
   ?tema=. Sin texto ni sesión. Nivel 2 (chat_questions_research): la pregunta sin datos personales, solo
   con la casilla marcada y CHAT_RESEARCH_ENABLED=true (apagado hasta aprobar la política). */
const LEVELS = ['A', 'B', 'C', 'alert'];
/* Conversación completa (026): solo con el texto de la tarjeta que dice "guarde esta conversación". */
const CONVERSATION_VERSIONS = new Set(['chat-v3', 'chat-v4']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/* Recurrencia (027): código de usuaria del navegador, solo con chat-v4 (la política que lo explica). */
const USER_CODE = /^u-[0-9a-z]{16}$/;
const USER_CODE_VERSIONS = new Set(['chat-v4']);
export async function saveChatData(body, out, text) {
  if (!supabaseOn() || !out) return;
  const is_test = body.is_test === true;
  const tema = out.topic || null;
  try {
    if (tema) await insert('chat_topics', {
      tema, area: out.area || 'otro', is_test,
      nivel_test: LEVELS.includes(body.nivel) ? body.nivel : null, desde_tema: body.desde_tema === true,
    });
    const version = typeof body.consent_text_version === 'string' && body.consent_text_version.length <= 20 ? body.consent_text_version : null;
    if (process.env.CHAT_RESEARCH_ENABLED === 'true' && body.compartir === true && version) {
      const pregunta = redact(text);
      if (pregunta && tema) await insert('chat_questions_research', { pregunta, tema, consent_text_version: version, is_test });
      const conversacion = typeof body.conversacion === 'string' ? body.conversacion.toLowerCase() : '';
      if (CONVERSATION_VERSIONS.has(version) && UUID.test(conversacion)) {
        const respuesta = redact(out.text || '', 4000);
        const usuaria = USER_CODE_VERSIONS.has(version) && typeof body.usuaria === 'string' && USER_CODE.test(body.usuaria) ? body.usuaria : null;
        const base = { conversacion, tema, consent_text_version: version, is_test, ...(usuaria ? { usuaria } : {}) };
        if (pregunta) await insert('chat_messages_research', { ...base, rol: 'usuaria', texto: pregunta });
        if (respuesta) await insert('chat_messages_research', { ...base, rol: 'mindi', texto: respuesta });
      }
    }
  } catch { /* no se corta la respuesta por esto */ }
}

// Límite de mensajes por minuto por persona (11.5) y solo desde el propio sitio (ALLOWED_ORIGINS).
export default route(async (req, res) => {
  if (!(await limit('agent', clientIp(req), ...LIMITS.agent)).ok) return send(res, 429, { error: 'rate_limited' });
  const body = readJson(req);
  const { action, session } = body;
  if (action === 'warm') {
    try { await callAgent({ agentUrl: process.env.AGENT_URL, action: 'warm' }); } catch { /* solo es un aviso */ }
    return res.status(200).json({ ok: true });
  }
  if (action === 'share') {
    // Nivel 2, consentimiento al final de la conversación (5 nov. 2026): las preguntas de ESA conversación, que
    // el navegador guardó solo en memoria. Sin sesión ni tema: nada que las vincule con ella.
    if (process.env.CHAT_RESEARCH_ENABLED !== 'true' || !supabaseOn()) return res.status(200).json({ ok: false });
    const version = typeof body.consent_text_version === 'string' && body.consent_text_version.length <= 20 ? body.consent_text_version : null;
    const list = Array.isArray(body.preguntas) ? body.preguntas.slice(0, 30) : null;
    if (!version || !list) return res.status(400).json({ error: 'bad_request' });
    const is_test = body.is_test === true;
    let saved = 0;
    for (const q of list) {
      const t = cleanText(q);
      const pregunta = t ? redact(t) : '';
      if (pregunta && await insert('chat_questions_research', { pregunta, tema: null, consent_text_version: version, is_test })) saved++;
    }
    return res.status(200).json({ ok: true, saved });
  }
  if (!validSession(session)) return res.status(400).json({ error: 'bad_session' });

  let args;
  if (action === 'start') {
    const resultado = body.resultado_mrs == null ? null : cleanResultado(body.resultado_mrs);
    if (body.resultado_mrs != null && !resultado) return res.status(400).json({ error: 'bad_result' });
    args = { action, session, resultado, tema: chatTopic(body.tema_inicial) };
  } else if (action === 'message') {
    const text = cleanText(body.text);
    if (!text) return res.status(400).json({ error: 'bad_text' });
    args = { action, session, text };
  } else {
    return res.status(400).json({ error: 'bad_action' });
  }

  try {
    const out = await callAgent({ agentUrl: process.env.AGENT_URL, ...args });
    if (action === 'message') await saveChatData(body, out, args.text);
    const { topic, ...reply } = out; // la etiqueta no vuelve al navegador
    return res.status(200).json(reply);
  } catch (e) {
    const code = e.message === 'session_lost' ? 410 : e.message === 'agent_not_configured' ? 503 : 502;
    return res.status(code).json({ error: e.message });
  }
}, { requires: ['AGENT_URL', 'GCP_SA_KEY'] });
