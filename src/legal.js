import './landing.css';
import './legal.css';

/* Términos y Política de privacidad: lo que habla del chat con IA (agente de Mindi, OpenAI,
   Google Cloud) solo se muestra cuando ese chat está encendido en la web.
   - [data-agent-chat]: solo con el chat encendido (en el HTML empieza oculto, con `hidden`)
   - [data-no-agent-chat]: solo con el chat apagado
   Con la variable apagada o sin definir, las páginas no mencionan el chat. */
const AGENT_CHAT_ENABLED = import.meta.env.VITE_AGENT_CHAT_ENABLED === 'true';

document.querySelectorAll('[data-agent-chat]').forEach((el) => { el.hidden = !AGENT_CHAT_ENABLED; });
document.querySelectorAll('[data-no-agent-chat]').forEach((el) => { el.hidden = AGENT_CHAT_ENABLED; });
