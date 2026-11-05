// Mindi · Cliente del agente de IA para el modo libre del chat (bloque 5).
//
// No tiene pantalla propia: el chat del test (src/main.js) es una sola conversación con dos modos,
// guiado (el test con botones) y libre (preguntas al agente). Este módulo solo habla con /api/agent
// (servidor; nunca con Cloud Run directo) y da formato seguro a las respuestas.
// No se guarda ninguna conversación en Mindi.

/* Aviso antes de la primera pregunta (anexo de los Términos). */
/* Bajo el saludo, una línea (5 nov. 2026); "Más información" abre el aviso completo. Enviar la primera
   pregunta o tocar una sugerencia es la aceptación (agent_consent). */
export const AI_LINE = 'Soy Mindi IA y te oriento con información confiable. Puedes preguntarme lo que no te animas a preguntar en otro lado. No reemplazo a tu médico. Al escribirme, aceptas que tus mensajes se procesen con IA.';
export const AI_NOTICE = 'Mindi responde con inteligencia artificial: te orienta, pero no reemplaza a tu médico y puede equivocarse. Tus mensajes se procesan con OpenAI para generar las respuestas, según sus propias políticas. Si es una emergencia, llama al 106.';
/* Saludo según cómo llega (5 nov. 2026). Con señal de alerta, el de emergencia (dolor de pecho o falta de
   aire en el test) o el de evaluación. El de emergencia no lleva botones de sugerencia. */
export const GREETING = {
  resultado: 'Hola, soy Mindi. Ya tengo tu resultado del test: puedo explicarte qué significa o ayudarte con cualquier otra duda. ¿Por dónde quieres empezar?',
  evaluacion: 'Hola, soy Mindi. Ya tengo tu resultado del test. Recuerda que marcaste una señal que conviene revisar pronto con tu médico. Puedo explicarte tu resultado o ayudarte con otra duda.',
  emergencia: 'Hola, soy Mindi. Marcaste una señal que necesita atención médica hoy. Si estás ahora con dolor de pecho o falta de aire, llama al 106 o acude a emergencias. Cuando estés bien, aquí estaré para explicarte tu resultado.',
  landing: 'Hola, soy Mindi. Puedo ayudarte a entender lo que estás sintiendo en la perimenopausia o la menopausia. ¿Qué te gustaría preguntarme?',
};
/* Botones de sugerencia: solo cuando llega desde el resultado (y no en el saludo de emergencia).
   Tocar uno acepta el aviso de IA y envía la pregunta en el mismo toque. */
export const RESULT_SUGGESTIONS = ['¿Qué significa mi resultado?', '¿Qué puedo hacer para sentirme mejor?'];
/** chatResult (o null), tipo de alerta guardado ('emergencia' | 'evaluacion' | null), tema → { text, suggestions } */
export function chatGreeting(result, alertType, topic) {
  if (topic && CHAT_TOPICS[topic]) return { text: CHAT_TOPICS[topic], suggestions: [] };
  if (!result) return { text: GREETING.landing, suggestions: [] };
  if (result.senal_alerta) {
    // Sin el tipo (p. ej. un resultado guardado antes de este cambio), el más prudente: emergencia.
    if (alertType !== 'evaluacion') return { text: GREETING.emergencia, suggestions: [] };
    return { text: GREETING.evaluacion, suggestions: RESULT_SUGGESTIONS };
  }
  return { text: GREETING.resultado, suggestions: RESULT_SUGGESTIONS };
}
/* Temas con los que se puede abrir /chat desde la landing (/chat?tema=peso). Lista cerrada: cualquier
   otro valor se ignora y se usa el saludo general, para que nadie pueda poner texto desde la URL.
   Al agente solo le llega la etiqueta (tema_inicial), nunca texto libre. */
export const CHAT_TOPICS = {
  peso: 'Hola, soy Mindi. Muchas mujeres notan cambios en su peso en esta etapa, aunque coman igual que antes. No es falta de voluntad: tiene explicación. ¿Qué es lo que más te preocupa? Cuéntamelo con tus palabras.',
  trabajo: 'Hola, soy Mindi. Sentirse distinta en el trabajo durante esta etapa es más común de lo que parece, aunque casi nadie lo diga. ¿Qué te está pasando? Cuéntame y lo vemos juntas.',
};
/** Valor de ?tema= → 'peso' | 'trabajo' | null. */
export const chatTopic = (v) => (typeof v === 'string' && Object.hasOwn(CHAT_TOPICS, v) ? v : null);
/* Nivel 2: casilla del inicio del chat (oculta hasta aprobar la política: VITE_CHAT_RESEARCH_ENABLED). */
export const SHARE_QUESTIONS_TEXT = 'Quiero que mis preguntas se usen, sin mis datos de contacto, para entender mejor qué necesitan las mujeres en esta etapa.';
export const SHARE_QUESTIONS_VERSION = 'chat-v1';
export const ERROR_TEXT = 'Ahora no puedo responder. Intenta de nuevo en unos minutos, o escríbele al equipo de Mindi.';
export const LIMIT_TEXT = 'Llegaste al límite de esta conversación. Si tienes más dudas, escríbele al equipo de Mindi.';
/* Si el agente no responde en este tiempo, se trata como falla: aparece el botón de WhatsApp. */
export const REPLY_TIMEOUT_MS = 60000;
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
  let session = null, started = false, resultado = null, tema = null, sent = 0;
  /* Etiquetas que acompañan cada pregunta (chat_topics): nivel del test, si llegó por ?tema=, si es
     prueba y, solo si marcó la casilla, compartir + versión del texto. Nunca datos personales. */
  let context = {};

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
    await api({ action: 'start', session, ...(resultado ? { resultado_mrs: resultado } : {}), ...(tema ? { tema_inicial: tema } : {}) });
    started = true;
  }

  return {
    /** Resultado del test como contexto: si cambia, la próxima pregunta abre una sesión nueva. */
    setResult(r) {
      const next = r || null;
      if (JSON.stringify(next) !== JSON.stringify(resultado)) { resultado = next; started = false; }
    },
    /** Tema con el que se abrió el chat (solo la etiqueta de CHAT_TOPICS). */
    setTopic(t) {
      const next = chatTopic(t);
      if (next !== tema) { tema = next; started = false; }
    },
    /** { nivel?: 'A'|'B'|'C'|'alert', desde_tema?: bool, is_test?: bool, compartir?: bool, consent_text_version?: string } */
    setContext(c) { context = { ...(c || {}) }; },
    get limitReached() { return sent >= MAX_MESSAGES; },
    /** Al abrir el chat: despierta al agente en segundo plano. Nunca falla ni bloquea. */
    warm() { api({ action: 'warm' }).catch(() => {}); },
    /** → { text, area, action } (action: 'recommend_test' o null). Lanza un Error con .status si falla. */
    async ask(text) {
      sent++;
      try {
        await ensureSession(false);
        return await api({ action: 'message', session, text, ...context });
      } catch (e) {
        if (e.status !== 410) throw e;
        await ensureSession(true); // la sesión se perdió (el agente se reinició): una nueva y un reintento
        return api({ action: 'message', session, text, ...context });
      }
    },
  };
}
