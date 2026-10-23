// Ruta del servidor POST /api/agent (función de Vercel). Ver api/_lib/agente.js.
//   { action: 'start', session, resultado_mrs? } → { ok: true }
//   { action: 'message', session, text }          → { text, area }
// La URL del agente va en AGENT_URL (variable del servidor, sin prefijo VITE_: no llega al navegador).

import { validSession, cleanResultado, cleanText, callAgent } from './_lib/agente.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const { action, session } = body;
  if (!validSession(session)) return res.status(400).json({ error: 'bad_session' });

  let args;
  if (action === 'start') {
    const resultado = body.resultado_mrs == null ? null : cleanResultado(body.resultado_mrs);
    if (body.resultado_mrs != null && !resultado) return res.status(400).json({ error: 'bad_result' });
    args = { action, session, resultado };
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
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
