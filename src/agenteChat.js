// Mindi · Chat con el agente de IA (bloque 5). Solo existe si VITE_AGENT_CHAT_ENABLED = 'true'.
//
// Dos puertas: después del resultado del test (con resultado_mrs) y desde la landing (sin test).
// Todas las consultas van al agente: WhatsApp aparece solo si el agente falla o no responde a tiempo.
// Habla solo con /api/agent (servidor); nunca con Cloud Run directo. No guarda la conversación:
// se mide con eventos sin texto (agent_open, agent_consent, agent_message {area}, agent_error,
// test_invite_click).

/* Aviso antes de la primera pregunta (anexo de los Términos). */
const AI_NOTICE = 'Mindi responde con inteligencia artificial: te orienta, pero no reemplaza a tu médico y puede equivocarse. Tus mensajes se procesan con un proveedor externo de IA para generar las respuestas. Si tienes una emergencia, llama al 106.';
const GREETING = {
  resultado: 'Ya tengo tu resultado del test. ¿Qué te gustaría saber?',
  landing: 'Cuéntame tu duda sobre la perimenopausia o la menopausia.',
};
const ERROR_TEXT = 'Ahora no puedo responder. Intenta de nuevo en unos minutos, o escríbele al equipo de Mindi.';
/* Si el agente no responde en este tiempo, se trata como falla: aparece el botón de WhatsApp. */
export const REPLY_TIMEOUT_MS = 30000;
const LIMIT_TEXT = 'Llegaste al límite de esta conversación. Si tienes más dudas, escríbele al equipo de Mindi.';
export const MAX_MESSAGES = 30;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Texto del agente → HTML seguro: párrafos, viñetas con "- " y **negrita**. Nada más. */
export function agentHtml(text) {
  const bold = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return String(text).trim().split(/\n{2,}/).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => /^[-•*]\s+/.test(l))) {
      return `<ul>${lines.map((l) => `<li>${bold(l.replace(/^[-•*]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.map(bold).join('<br>')}</p>`;
  }).join('');
}

export function createAgentChat({ track, newId, whatsappLink, onStartTest }) {
  let el = null, log = null, form = null, input = null, opener = null;
  let session = null, sessionResult = undefined, started = false, consented = false, sent = 0, busy = false, source = 'landing';
  let hadNoScroll = false;

  function build() {
    el = document.createElement('div');
    el.className = 'agent-overlay';
    el.hidden = true;
    el.innerHTML = `
      <div class="agent-shell" role="dialog" aria-modal="true" aria-labelledby="agentTitle">
        <div class="agent-top">
          <div class="avatar" aria-hidden="true">M</div>
          <div class="agent-top-text"><div class="agent-title" id="agentTitle">Pregúntale a Mindi</div>
            <div class="agent-sub">Responde con inteligencia artificial</div></div>
          <button class="chat-exit agent-close" type="button">Cerrar</button>
        </div>
        <div class="agent-log" role="log" aria-live="polite"></div>
        <form class="agent-input inputRow" hidden>
          <input type="text" maxlength="1000" placeholder="Escribe tu pregunta" aria-label="Escribe tu pregunta" autocomplete="off">
          <button class="sendBtn" type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg></button>
        </form>
      </div>`;
    document.body.appendChild(el);
    log = el.querySelector('.agent-log');
    form = el.querySelector('form');
    input = form.querySelector('input');
    el.querySelector('.agent-close').onclick = close;
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    el.addEventListener('click', (e) => { if (e.target === el) close(); });
    form.onsubmit = (e) => { e.preventDefault(); send(input.value); };
  }

  function add(html, who, cls = '') {
    const row = document.createElement('div');
    row.className = `row ${who}`;
    row.innerHTML = `<div class="bubble ${cls}">${html}</div>`;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }
  const typing = () => { const r = document.createElement('div'); r.className = 'row bot'; r.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>'; log.appendChild(r); log.scrollTop = log.scrollHeight; return r; };

  function showConsent() {
    const row = add(`<p>${esc(AI_NOTICE)}</p><div class="chips"><button type="button" class="chip primary">Entendido</button></div>`, 'bot', 'agent-notice');
    row.querySelector('button').onclick = () => {
      consented = true;
      track('agent_consent', { source });
      row.querySelector('.chips').remove();
      greet();
    };
  }

  function greet() {
    const row = add(`<p>${esc(GREETING[source])}</p>` +
      (source === 'landing' ? '<div class="chips"><button type="button" class="chip quiet">Prefiero hacer el test</button></div>' : ''), 'bot');
    const b = row.querySelector('button');
    if (b) b.onclick = () => { track('test_invite_click', { desde: 'agente' }); close(); onStartTest(); };
    form.hidden = false;
    input.focus({ preventScroll: true });
  }

  async function api(body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REPLY_TIMEOUT_MS);
    try {
      const r = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
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
    await api({ action: 'start', session, ...(sessionResult ? { resultado_mrs: sessionResult } : {}) });
    started = true;
  }

  async function send(raw) {
    const text = String(raw || '').trim().slice(0, 1000);
    if (!text || busy) return;
    if (sent >= MAX_MESSAGES) { add(`<p>${esc(LIMIT_TEXT)}</p>`, 'bot'); return; }
    busy = true; input.value = ''; sent++;
    add(esc(text), 'user');
    const t = typing();
    try {
      let reply;
      try {
        await ensureSession(false);
        reply = await api({ action: 'message', session, text });
      } catch (e) {
        if (e.status !== 410) throw e;
        await ensureSession(true); // la sesión se perdió (el agente se reinició): una nueva y un reintento
        reply = await api({ action: 'message', session, text });
      }
      t.remove();
      add(agentHtml(reply.text), 'bot', 'agent-reply');
      track('agent_message', { source, area: reply.area || 'otro' });
    } catch (e) {
      t.remove();
      track('agent_error', { source, code: e.status || 0 });
      add(`<p>${esc(ERROR_TEXT)}</p>${whatsappLink('agente', 'Escríbele al equipo de Mindi', 'btn btn-sm btn-ghost wa-btn')}`, 'bot');
    } finally {
      busy = false;
      input.focus({ preventScroll: true });
    }
  }

  function open({ from, resultado } = {}) {
    if (!el) build();
    opener = document.activeElement;
    const nextSource = from === 'resultado' ? 'resultado' : 'landing';
    const nextResult = resultado || null;
    // Una conversación nueva si cambia el contexto (p. ej., primero desde la landing y luego con resultado).
    if (JSON.stringify(nextResult) !== JSON.stringify(sessionResult) || nextSource !== source) {
      log.innerHTML = ''; started = false; sent = 0; form.hidden = true;
      sessionResult = nextResult; source = nextSource;
      if (consented) greet(); else showConsent();
    }
    track('agent_open', { source });
    el.hidden = false;
    hadNoScroll = document.body.classList.contains('no-scroll'); // el test puede estar en pantalla completa
    document.body.classList.add('no-scroll');
    (consented ? input : (el.querySelector('.agent-notice .chip') || el.querySelector('.agent-close'))).focus({ preventScroll: true });
  }

  function close() {
    if (!el || el.hidden) return;
    el.hidden = true;
    if (!hadNoScroll) document.body.classList.remove('no-scroll');
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }

  return { open, close };
}
