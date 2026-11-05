// Mindi · Cloudflare Turnstile en el navegador (handoff 11.3): listas de espera, demo y copia del
// reporte por correo. VITE_TURNSTILE_SITE_KEY es pública. Sin ella (local), no se dibuja nada y
// el servidor tampoco lo pide. Modo "interaction-only": solo aparece si Cloudflare duda.

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
let loading = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve(window.turnstile);
    s.onerror = () => { loading = null; reject(new Error('turnstile_load')); };
    document.head.appendChild(s);
  });
  return loading;
}

/** Dibuja el widget dentro de `container`. → { token(): Promise<string>, reset(), remove() }.
 *  Sin clave de sitio, token() devuelve '' y no hace nada más. */
export function mountTurnstile(container, { theme = 'light' } = {}) {
  if (!SITE_KEY || !container) return { token: async () => '', reset() {}, remove() {} };
  let widget = null, current = '', waiters = [];
  const settle = (t) => { current = t; waiters.forEach((w) => w(t)); waiters = []; };
  loadScript().then((ts) => {
    widget = ts.render(container, {
      sitekey: SITE_KEY, theme, appearance: 'interaction-only', language: 'es',
      callback: settle, 'expired-callback': () => { current = ''; }, 'error-callback': () => settle(''),
    });
  }).catch(() => settle(''));
  return {
    token: () => (current ? Promise.resolve(current) : new Promise((r) => { waiters.push(r); setTimeout(() => r(current), 8000); })),
    reset() { current = ''; if (widget !== null && window.turnstile) window.turnstile.reset(widget); },
    remove() { if (widget !== null && window.turnstile) window.turnstile.remove(widget); widget = null; },
  };
}
