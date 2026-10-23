// Mindi · Cliente del agente de IA para el modo libre del chat (bloque 5).
//
// No tiene pantalla propia: el chat del test (src/main.js) es una sola conversación con dos modos,
// guiado (el test con botones) y libre (preguntas al agente). Este módulo solo habla con /api/agent
// (servidor; nunca con Cloud Run directo) y da formato seguro a las respuestas.
// No se guarda ninguna conversación en Mindi.

/* Aviso antes de la primera pregunta (anexo de los Términos). */
export const AI_NOTICE = 'Mindi responde con inteligencia artificial: te orienta, pero no reemplaza a tu médico y puede equivocarse. Tus mensajes se procesan con un proveedor externo de IA para generar las respuestas. Si tienes una emergencia, llama al 106.';
export const GREETING = {
  resultado: 'Ya tengo tu resultado del test. ¿Qué te gustaría saber?',
  landing: 'Cuéntame tu duda sobre la perimenopausia o la menopausia.',
};
export const ERROR_TEXT = 'Ahora no puedo responder. Intenta de nuevo en unos minutos, o escríbele al equipo de Mindi.';
export const LIMIT_TEXT = 'Llegaste al límite de esta conversación. Si tienes más dudas, escríbele al equipo de Mindi.';
/* Si el agente no responde en este tiempo, se trata como falla: aparece el botón de WhatsApp. */
export const REPLY_TIMEOUT_MS = 30000;
export const MAX_MESSAGES = 30;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Texto del agente → HTML seguro: párrafos, viñetas con "- " y **negrita**. Nada más. */
export function agentHtml(text) {
  const bold = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return String(text).trim().split(/\n{2,}/).filter(Boolean).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => /^[-•*]\s+/.test(l))) {
      return `<ul>${lines.map((l) => `<li>${bold(l.replace(/^[-•*]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.map(bold).join('<br>')}</p>`;
  }).join('');
}

/** Conversación con el agente: crea la sesión al primer mensaje (con resultado_mrs si lo hay),
 *  la recrea si el agente se reinició (410) y corta a los REPLY_TIMEOUT_MS. */
export function createAgentClient({ newId, fetchImpl = (...a) => fetch(...a), timeoutMs = REPLY_TIMEOUT_MS }) {
  let session = null, started = false, resultado = null, sent = 0;

  async function api(body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetchImpl('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { const err = new Error(data.error || 'agent_unavailable'); err.status = r.status; throw err; }
      return data;
    } catch (e) {
      if (ctrl.signal.aborted) { const err = new Error('timeout'); err.status = 408; throw err; } // no respondió a tiempo
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  async function ensureSession(fresh) {
    if (started && !fresh) return;
    session = newId();
    await api({ action: 'start', session, ...(resultado ? { resultado_mrs: resultado } : {}) });
    started = true;
  }

  return {
    /** Resultado del test como contexto: si cambia, la próxima pregunta abre una sesión nueva. */
    setResult(r) {
      const next = r || null;
      if (JSON.stringify(next) !== JSON.stringify(resultado)) { resultado = next; started = false; }
    },
    get limitReached() { return sent >= MAX_MESSAGES; },
    /** → { text, area, offerTest }. Lanza un Error con .status si falla. */
    async ask(text) {
      sent++;
      try {
        await ensureSession(false);
        return await api({ action: 'message', session, text });
      } catch (e) {
        if (e.status !== 410) throw e;
        await ensureSession(true); // la sesión se perdió (el agente se reinició): una nueva y un reintento
        return api({ action: 'message', session, text });
      }
    },
  };
}
