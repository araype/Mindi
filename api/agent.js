// Ruta del servidor POST /api/agent (función de Vercel). Ver api/_lib/agente.js.
//   { action: 'start', session, resultado_mrs?, tema_inicial? } → { ok: true }
//     tema_inicial: solo 'peso' o 'trabajo' (chatTopic); cualquier otro valor se ignora.
//   { action: 'message', session, text }          → { text, area, action: 'recommend_test' | null }
// La URL del agente va en AGENT_URL (variable del servidor, sin prefijo VITE_: no llega al navegador).

import { validSession, cleanResultado, cleanText, callAgent, chatTopic } from './_lib/agente.js';
import { route, readJson, send, clientIp } from './_lib/http.js';
import { limit, LIMITS } from './_lib/limite.js';

// Límite de mensajes por minuto por persona (11.5) y solo desde el propio sitio (ALLOWED_ORIGINS).
export default route(async (req, res) => {
  if (!(await limit('agent', clientIp(req), ...LIMITS.agent)).ok) return send(res, 429, { error: 'rate_limited' });
  const body = readJson(req);
  const { action, session } = body;
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
    return res.status(200).json(out);
  } catch (e) {
    const code = e.message === 'session_lost' ? 410 : e.message === 'agent_not_configured' ? 503 : 502;
    return res.status(code).json({ error: e.message });
  }
}, { requires: ['AGENT_URL', 'GCP_SA_KEY'] });
