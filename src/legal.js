import './ds.css';
import './site.css';
import './legal.css';

/* Términos y Política de privacidad: lo que habla del chat con IA (agente de Mindi, OpenAI,
   Google Cloud) solo se muestra cuando ese chat está encendido en la web.
   - [data-agent-chat]: solo con el chat encendido (en el HTML empieza oculto, con `hidden`)
   - [data-no-agent-chat]: solo con el chat apagado
   - [data-chat-research]: nivel 2 (preguntas compartidas con la casilla del chat): solo con el chat y
     VITE_CHAT_RESEARCH_ENABLED encendidos. Apagado hasta aprobar este texto.
   - [data-no-chat-research]: lo que se reemplaza cuando el nivel 2 está encendido
   Con las variables apagadas o sin definir, las páginas no mencionan el chat. */
const AGENT_CHAT_ENABLED = import.meta.env.VITE_AGENT_CHAT_ENABLED === 'true';
const CHAT_RESEARCH_ENABLED = AGENT_CHAT_ENABLED && import.meta.env.VITE_CHAT_RESEARCH_ENABLED === 'true';

document.querySelectorAll('[data-agent-chat]').forEach((el) => { el.hidden = !AGENT_CHAT_ENABLED; });
document.querySelectorAll('[data-no-agent-chat]').forEach((el) => { el.hidden = AGENT_CHAT_ENABLED; });
document.querySelectorAll('[data-chat-research]').forEach((el) => { el.hidden = !CHAT_RESEARCH_ENABLED; });
document.querySelectorAll('[data-no-chat-research]').forEach((el) => { if (CHAT_RESEARCH_ENABLED) el.hidden = true; });
