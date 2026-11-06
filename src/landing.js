// Mindi · Interacciones de la landing (handoff, secciones 2 y 6). Las llama src/main.js con sus
// propias funciones de medición y guardado, para no duplicarlas.
//   track(nombre, props): evento de analítica. Solo el nombre de la acción (handoff 11.8).
//   api(ruta, cuerpo): POST a /api/<ruta> (el servidor valida y guarda). → { ok, status, body } o null.
//   mountTurnstile(contenedor): captcha invisible de Cloudflare (src/turnstile.js). No se importa
//     aquí porque api/waitlist.js reutiliza waitlistRow en el servidor.

/** Formularios de lista de espera (handoff 2.1 y 2.6). Los nombres de campo son las columnas de
 *  interest_signups (SQL 017). `contact` es siempre el correo. */
export const WAITLISTS = {
  plus: { title: 'Mindi Plus', lead: 'Quiero acceso anticipado.', fields: ['name', 'email', 'whatsapp'] },
  consultas: { title: 'Consultas con especialistas', lead: 'Próximamente.', fields: ['name', 'email', 'whatsapp'] },
  especialistas: { title: 'Para especialistas', lead: 'Red Mindi · próximamente.', fields: ['name', 'email', 'whatsapp'] },
  empresas: { title: 'Mindi Enterprise', lead: 'Agenda una demo.', fields: ['company', 'job_title', 'team_size', 'email'], submit: 'Solicitar demo', done: '¡Gracias! Te escribiremos pronto para coordinar.' },
};
const WAITLIST_SUBMIT = 'Unirme a la lista';
const WAITLIST_DONE = '¡Listo! Te avisaremos cuando esté disponible.';
const WAITLIST_ERROR = 'No pudimos enviar tus datos. Inténtalo de nuevo en un momento.';
const FIELD = {
  name: { label: 'Nombre', type: 'text', autocomplete: 'name', required: true, max: 80 },
  email: { label: 'Correo', type: 'email', autocomplete: 'email', required: true, max: 120 },
  whatsapp: { label: 'WhatsApp (opcional)', type: 'tel', autocomplete: 'tel', required: false, max: 20 },
  company: { label: 'Empresa', type: 'text', autocomplete: 'organization', required: true, max: 120 },
  job_title: { label: 'Cargo', type: 'text', autocomplete: 'organization-title', required: true, max: 80 },
  team_size: { label: 'N.º de colaboradoras', type: 'number', autocomplete: 'off', required: true, max: 7 },
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valida y limpia los datos de un formulario de lista de espera. Devuelve { row } o { error }. */
export function waitlistRow(list, values) {
  const cfg = typeof list === 'string' && Object.hasOwn(WAITLISTS, list) ? WAITLISTS[list] : null;
  if (!cfg || !values || typeof values !== 'object') return { error: 'Lista desconocida.' };
  const row = { segment: list };
  for (const f of cfg.fields) {
    const v = String(values[f] ?? '').trim();
    if (!v) { if (FIELD[f].required) return { error: `Completa: ${FIELD[f].label}.` }; continue; }
    if (v.length > FIELD[f].max) return { error: `Revisa: ${FIELD[f].label}.` };
    if (f === 'email') { if (!EMAIL_RE.test(v)) return { error: 'Revisa el correo.' }; row.contact = v; continue; }
    if (f === 'whatsapp') { const d = v.replace(/\D/g, ''); if (d.length < 9 || d.length > 15) return { error: 'Revisa el número de WhatsApp (mínimo 9 dígitos).' }; row.whatsapp = d; continue; }
    if (f === 'team_size') { const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > 1000000) return { error: 'Revisa el número de colaboradoras.' }; row.team_size = n; continue; }
    row[f] = v;
  }
  if (values.consent !== true) return { error: 'Para continuar, acepta la Política de privacidad.' };
  return { row };
}

/** Rutas de la landing que abren una lista de espera (vercel.json las reescribe a index.html). */
export const WAITLIST_ROUTES = { '/empresas': 'empresas', '/especialistas': 'especialistas' };

export function initLanding({ track, api, mountTurnstile, backendOn, consentVersion, isTest, origin, chatAvailable, whatsappHref, whatsappDisplay }) {
  const $ = (id) => document.getElementById(id);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* ---------- Eventos de analítica (data-track) y FAQ (faq_open_n) ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('.l-landing [data-track]');
    if (t) track(t.dataset.track);
  });
  document.querySelectorAll('#faq details').forEach((d, i) => {
    d.addEventListener('toggle', () => { if (d.open) track(`faq_open_${i + 1}`); });
  });

  /* ---------- "Pregúntale a Mindi" sin el chat con IA encendido: va a WhatsApp (o se oculta) ---------- */
  function applyChatLink(a) {
    if (chatAvailable) return;
    if (whatsappHref) { a.href = whatsappHref; a.target = '_blank'; a.rel = 'noopener'; a.dataset.waOrigen = 'landing'; }
    else a.hidden = true;
  }
  document.querySelectorAll('[data-chat-link]').forEach(applyChatLink);

  /* ---------- Footer: WhatsApp del equipo desde VITE_WHATSAPP_NUMBER ---------- */
  if (whatsappHref) {
    document.querySelectorAll('[data-wa-item]').forEach((li) => {
      li.hidden = false;
      const a = li.querySelector('[data-wa-link]');
      a.href = whatsappHref;
      a.textContent = whatsappDisplay ? `WhatsApp ${whatsappDisplay}` : 'WhatsApp';
    });
  }

  /* ---------- 6.1 Menú fijo: claro u oscuro según la sección ---------- */
  const nav = $('gnav');
  const navSecs = [...document.querySelectorAll('.l-landing [data-nav]')];
  function navMode() {
    const y = nav.offsetHeight / 2;
    let mode = 'dark';
    for (const s of navSecs) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) { mode = s.dataset.nav; break; } }
    if (mode === 'story') {
      mode = document.body.dataset.storyDark === '1' ? 'dark' : 'light';
    }
    nav.classList.toggle('is-light', mode === 'light');
    nav.classList.toggle('is-scrolled', mode === 'dark' && window.scrollY > 40);
  }

  /* ---------- Menú en mobile (2.1) ---------- */
  const menuBtn = $('menuBtn'), panel = $('menuPanel');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
    nav.classList.toggle('is-open', open);
    menuBtn.querySelector('.mlabel').textContent = open ? 'Cerrar' : 'Menú';
    if (open) { track('nav_menu_open'); const f = panel.querySelector('a,button'); if (f) f.focus(); }
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  panel.addEventListener('click', (e) => { if (e.target.closest('a,button')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', (e) => { if (!panel.hidden && !nav.contains(e.target)) setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 900 && !panel.hidden) setMenu(false); });

  /* ---------- 6.2 Tarjeta de frases (5 nov. 2026): 3,5 s por frase mientras se ve; un toque la deja quieta
     ("Pausado") para leerla y otro toque la reanuda. Flechas, barras y deslizar cambian de frase. ---------- */
  const card = $('quote');
  const slides = card.querySelectorAll('.l-qs'), bars = card.querySelectorAll('.l-qbars button'), cta = $('qcta');
  let qi = 0, hover = false, held = false, stopped = reduce, pinned = false, offscreen = false;
  const pinNote = document.createElement('p');
  pinNote.className = 'l-qpin'; pinNote.setAttribute('aria-live', 'polite');
  card.querySelector('.l-qbars').after(pinNote);
  function qsync() {
    card.classList.toggle('is-paused', hover || held || offscreen);
    card.classList.toggle('is-held', held);
    card.classList.toggle('is-stopped', stopped || pinned);
    pinNote.textContent = pinned ? 'Pausado · toca de nuevo para continuar' : '';
  }
  function togglePin() { if (reduce) return; pinned = !pinned; qsync(); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => es.forEach((e) => { offscreen = !e.isIntersecting; qsync(); }), { threshold: 0.4 }).observe(card);
  }
  function go(n) {
    qi = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle('is-on', k === qi); if (k === qi) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true'); });
    bars.forEach((b, k) => {
      b.classList.remove('is-cur', 'is-done'); b.removeAttribute('aria-current');
      const fill = b.querySelector('i'); fill.style.animation = 'none'; void fill.offsetWidth; fill.style.animation = '';
      if (k < qi) b.classList.add('is-done');
      if (k === qi) { b.classList.add('is-cur'); b.setAttribute('aria-current', 'true'); }
    });
    const s = slides[qi];
    cta.textContent = s.dataset.cta;
    cta.href = s.dataset.href;
    cta.dataset.track = s.dataset.ctaTrack;
    cta.hidden = false; cta.removeAttribute('target'); cta.removeAttribute('rel'); delete cta.dataset.waOrigen;
    if ('chat' in s.dataset) { cta.setAttribute('data-chat-link', ''); applyChatLink(cta); } else cta.removeAttribute('data-chat-link');
  }
  bars.forEach((b, k) => {
    b.addEventListener('click', () => go(k));
    b.querySelector('i').addEventListener('animationend', () => {
      if (!b.classList.contains('is-cur') || stopped || pinned) return;
      go(qi + 1);
    });
  });
  $('qprev').addEventListener('click', () => go(qi - 1));
  $('qnext').addEventListener('click', () => go(qi + 1));
  card.addEventListener('mouseenter', () => { hover = true; qsync(); });
  card.addEventListener('mouseleave', () => { hover = false; qsync(); });
  card.addEventListener('focusin', () => { hover = true; qsync(); });
  card.addEventListener('focusout', () => { hover = false; qsync(); });
  let x0 = null;
  card.addEventListener('touchstart', (e) => { if (e.target.closest('a,button')) return; x0 = e.touches[0].clientX; held = true; qsync(); }, { passive: true });
  let t0 = 0, lastTouch = 0;
  card.addEventListener('touchstart', () => { t0 = performance.now(); }, { passive: true });
  function release(e) {
    if (held) { held = false; qsync(); }
    if (x0 !== null && e && e.changedTouches) {
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(qi + (dx < 0 ? 1 : -1));
      else if (e.type === 'touchend' && performance.now() - t0 < 500) { togglePin(); lastTouch = performance.now(); }
    }
    x0 = null;
  }
  // En computadora: clic en la frase (no en botones ni enlaces) también pausa o reanuda.
  card.querySelector('.l-quote-slides').addEventListener('click', (e) => {
    if (e.target.closest('a,button') || performance.now() - lastTouch < 700) return;
    togglePin();
  });
  card.addEventListener('touchend', release);
  card.addEventListener('touchcancel', release);
  card.addEventListener('contextmenu', (e) => { if (e.target.closest('.l-quote-slides')) e.preventDefault(); });
  go(0); qsync();

  /* ---------- 6.3 y 6.4 Sección 2: stage fijo controlado por el scroll ---------- */
  const story = $('esta-etapa');
  const S = { photo: $('photo'), img: $('photoImg'), shade: $('shade'), l1: $('l1'), l2: $('l2'), cap: $('cap'), info: $('info'),
    grow: $('growRect'), stats: $('stats'), ring: $('ringArc'), sqs: document.querySelectorAll('#sq i'), bar: $('bar'), n1: $('n1'), n2: $('n2'), n3: $('n3'), hint: $('hint') };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const mix = (a, b, t) => a + (b - a) * t;
  const rgb = (c1, c2, t) => `rgb(${c1.map((v, i) => Math.round(mix(v, c2[i], t))).join(',')})`;
  const narrow = () => window.innerWidth <= 760;
  // Móvil (< 768 px): scroll nativo; nada se calcula por posición dentro de las secciones (ver site.css).
  const mobileMQ = window.matchMedia('(max-width: 767px)');
  const isMobile = () => mobileMQ.matches;
  function dataFinal() {
    S.grow.setAttribute('width', '240');
    S.ring.setAttribute('stroke-dasharray', '50.9 94.25');
    S.sqs.forEach((x, i) => { x.classList.toggle('is-on', i < 7); x.classList.toggle('is-part', i === 7); });
    S.bar.style.width = '41.5%';
    document.body.dataset.storyDark = '1';
  }
  function storyFrameMobile() {
    const r = story.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, story.offsetHeight - window.innerHeight), 0, 1);
    const a = ease(seg(p, 0, 0.3)), b = ease(seg(p, 0.18, 0.62)), c = ease(seg(p, 0.55, 0.85));
    const v = mix(mix(46, 40, a), 0, b), h = mix(8, 0, b), rad = mix(14, 0, b);
    S.photo.style.clipPath = `inset(${v}% ${h}% ${v}% ${h}% round ${rad}px)`;
    S.img.style.transform = `scale(${mix(1.15, 1, b)})`;
    S.shade.style.opacity = mix(0.28 * b, 0.55, c);
    const gap = window.innerHeight * 0.13;
    S.l1.style.transform = `translateY(${-gap * a - window.innerHeight * 0.16 * c}px)`;
    S.l1.style.color = rgb([42, 16, 38], [255, 255, 255], b);
    S.l1.style.opacity = 1 - c;
    S.l2.style.transform = `translateY(${gap * a + 24 * c}px)`;
    S.l2.style.opacity = 1 - c;
    document.body.dataset.storyDark = b > 0.5 ? '1' : '0';
    S.cap.style.opacity = c;
    S.cap.style.transform = `translateY(${16 * (1 - c)}px)`;
  }
  function storyFrame() {
    if (isMobile()) return storyFrameMobile();
    const r = story.getBoundingClientRect();
    const p = clamp(-r.top / (story.offsetHeight - window.innerHeight), 0, 1);
    const a = ease(seg(p, 0.06, 0.22)), b = ease(seg(p, 0.22, 0.42)), c = ease(seg(p, 0.46, 0.58)), d = ease(seg(p, 0.66, 0.8)), e = ease(seg(p, 0.78, 0.92));
    const side0 = narrow() ? 8 : 18, vA = narrow() ? 40 : 34;
    const v = mix(mix(46, vA, a), 0, b), h = mix(side0, 0, b), rad = mix(18, 0, b);
    S.photo.style.clipPath = `inset(${v}% ${h}% ${v}% ${h}% round ${rad}px)`;
    S.img.style.transform = `scale(${mix(1.15, 1, b)})`;
    S.shade.style.opacity = mix(0.28 * b, 0.78, d);
    const gap = window.innerHeight * (narrow() ? 0.13 : 0.17);
    S.l1.style.transform = `translateY(${-gap * a - window.innerHeight * 0.18 * c - 40 * d}px)`;
    S.l1.style.color = rgb([42, 16, 38], [255, 255, 255], b);
    S.l1.style.opacity = 1 - d;
    S.l2.style.transform = `translateY(${gap * a + 30 * c}px)`;
    S.l2.style.opacity = 1 - c;
    document.body.dataset.storyDark = b > 0.5 ? '1' : '0';
    S.cap.style.opacity = c * (1 - d);
    S.cap.style.transform = `translateY(${16 * (1 - c) - 30 * d}px)`;
    S.info.style.opacity = d;
    S.info.style.transform = `translateY(${40 * (1 - d)}px)`;
    S.info.classList.toggle('is-on', d > 0.5);
    S.grow.setAttribute('width', (240 * e).toFixed(1));
    const k1 = ease(seg(p, 0.8, 0.88)), k2 = seg(p, 0.84, 0.93), k3 = ease(seg(p, 0.88, 0.96));
    [k1, k2, k3].forEach((k, i) => { const c2 = S.stats.children[i]; const m = Math.min(1, k * 3); c2.style.opacity = mix(0.2, 1, m); c2.style.transform = `translateY(${20 * (1 - m)}px)`; });
    S.ring.setAttribute('stroke-dasharray', `${(94.25 * 0.54 * k1).toFixed(2)} 94.25`);
    S.n1.textContent = Math.round(54 * k1);
    const lit = Math.round(8 * k2);
    S.sqs.forEach((x, q) => { x.classList.toggle('is-on', q < lit && q < 7); x.classList.toggle('is-part', q === 7 && lit >= 8); });
    S.n2.textContent = Math.round(77 * k2);
    S.bar.style.width = `${41.5 * k3}%`;
    S.n3.textContent = Math.round(4 * k3);
    S.hint.style.opacity = 1 - seg(p, 0, 0.05);
  }

  /* ---------- 6.5 ¿Cómo funciona?: celular fijo, 3 tramos ---------- */
  const how = $('como-funciona');
  const steps = how.querySelectorAll('.m-step'), screens = how.querySelectorAll('.l-scr');
  let curStep = -1;
  function setStep(i) {
    if (i === curStep) return; curStep = i;
    steps.forEach((el, k) => el.classList.toggle('is-active', k === i));
    screens.forEach((el, k) => el.classList.toggle('is-on', k === i));
  }
  function howFrame() {
    const r = how.getBoundingClientRect();
    const p = clamp(-r.top / (how.offsetHeight - window.innerHeight), 0, 1);
    setStep(p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2);
  }

  if (reduce) {
    dataFinal();
    steps.forEach((el) => el.classList.add('is-active'));
  } else {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { storyFrame(); if (isMobile()) howFrameMobile(); else howFrame(); navMode(); ticking = false; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    storyFrame(); if (!isMobile()) howFrame();
  }
  if (reduce) { window.addEventListener('scroll', navMode, { passive: true }); }

  /* ---------- Móvil: datos en flujo y celular de ¿Cómo funciona? por gestos ---------- */
  // Datos: #info sale del tramo fijo y va justo después, sobre la misma foto (en escritorio vuelve a su lugar).
  const infoHome = S.info.parentNode, infoNext = S.info.nextSibling;
  const infoWrap = document.createElement('section');
  infoWrap.className = 'l-info-m';
  infoWrap.setAttribute('data-nav', 'dark');
  infoWrap.innerHTML = '<div class="l-info-m-bg" aria-hidden="true"><img src="/img/datos-760.webp" srcset="/img/datos-760.webp 760w, /img/datos-1262.webp 1262w" sizes="100vw" alt="" loading="lazy"></div>';
  function placeInfo() {
    if (isMobile()) {
      if (S.info.parentNode !== infoWrap) { infoWrap.appendChild(S.info); story.after(infoWrap); }
      S.info.style.opacity = ''; S.info.style.transform = '';
      if (!navSecs.includes(infoWrap)) navSecs.push(infoWrap);
    } else if (S.info.parentNode === infoWrap) {
      infoHome.insertBefore(S.info, infoNext); infoWrap.remove();
    }
  }
  // Números, anillo, cuadritos y barra: de 0 a su valor en 900 ms cuando la tarjeta aparece (el texto ya se ve).
  function countUp(card) {
    const t0 = performance.now(), D = reduce ? 0 : 900;
    const idx = [...S.stats.children].indexOf(card);
    const step = (now) => {
      const k = D ? ease(Math.min(1, (now - t0) / D)) : 1;
      if (card.classList.contains('l-tl')) S.grow.setAttribute('width', (240 * k).toFixed(1));
      if (idx === 0) { S.ring.setAttribute('stroke-dasharray', `${(94.25 * 0.54 * k).toFixed(2)} 94.25`); S.n1.textContent = Math.round(54 * k); }
      if (idx === 1) { const lit = Math.round(8 * k); S.sqs.forEach((x, q) => { x.classList.toggle('is-on', q < lit && q < 7); x.classList.toggle('is-part', q === 7 && lit >= 8); }); S.n2.textContent = Math.round(77 * k); }
      if (idx === 2) { S.bar.style.width = `${41.5 * k}%`; S.n3.textContent = Math.round(4 * k); }
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // ¿Cómo funciona? en móvil: un paso por gesto (deslizar, flechas o puntos) y avance solo cada 4 s mientras se ve.
  const howGrid = how.querySelector('.l-how-grid');
  const howNav = document.createElement('div');
  howNav.className = 'l-how-nav';
  howNav.innerHTML = '<div class="l-how-dots">' + [...steps].map((_, k) => `<button type="button" data-go="${k}" aria-label="Paso ${k + 1} de ${steps.length}"></button>`).join('') + '</div>';
  const howCount = document.createElement('p');
  howCount.className = 'l-how-count'; howCount.setAttribute('aria-live', 'polite');
  howGrid.querySelector('.m-steps').before(howCount);
  howGrid.after(howNav);
  /* Móvil: el paso depende de la posición del scroll (cada paso tiene su tramo), pero el celular avanza de a uno
     y cada paso se queda al menos 450 ms: con un "flick" fuerte igual se ve el paso 2 antes del 3. */
  const STEP_DWELL = reduce ? 0 : 450;
  let lastChange = 0, catchUp = null, howTarget = 0;
  function goStep(i) {
    const n = steps.length; i = Math.max(0, Math.min(n - 1, i));
    curStep = -1; setStep(i);
    howCount.textContent = `Paso ${i + 1} de ${n}`;
    howNav.querySelectorAll('[data-go]').forEach((d, k) => { if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
  }
  function shownStep() { return [...steps].findIndex((x) => x.classList.contains('is-active')); }
  function stepToward() {
    catchUp = null;
    const cur = shownStep();
    if (cur === howTarget) return;
    const wait = STEP_DWELL - (performance.now() - lastChange);
    if (wait > 0) { catchUp = setTimeout(stepToward, wait); return; }
    goStep(cur + (howTarget > cur ? 1 : -1));
    lastChange = performance.now();
    if (shownStep() !== howTarget) catchUp = setTimeout(stepToward, STEP_DWELL);
  }
  function howFrameMobile() {
    const r = how.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, how.offsetHeight - window.innerHeight), 0, 1);
    howTarget = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
    if (!catchUp) stepToward();
  }
  // Los puntos indican el paso; tocarlos lleva (con scroll) al tramo de ese paso.
  howNav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    const range = how.offsetHeight - window.innerHeight;
    window.scrollTo({ top: how.offsetTop + range * ((+b.dataset.go + 0.5) / steps.length), behavior: reduce ? 'auto' : 'smooth' });
  });
  function setupMobile() {
    placeInfo();
    if (!isMobile()) return;
    [...S.stats.children].forEach((c) => { c.style.opacity = ''; c.style.transform = ''; });
    S.sqs.forEach((x) => x.classList.remove('is-on', 'is-part'));
    S.grow.setAttribute('width', '0'); S.ring.setAttribute('stroke-dasharray', '0 94.25'); S.bar.style.width = '0%';
    goStep(Math.max(0, curStep)); howFrameMobile();
    const cards = [document.querySelector('.l-tl'), ...S.stats.children];
    if (reduce || !('IntersectionObserver' in window)) { dataFinal(); cards.forEach((el) => el.classList.add('is-in')); return; }
    cards.forEach((el) => el.classList.add('m-rv'));
    document.documentElement.classList.add('js-rv');
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      countUp(e.target);
      io.unobserve(e.target);
    }), { threshold: 0.15, rootMargin: '0px 0px 12% 0px' }); // un poco antes de entrar: visible antes de la mitad
    cards.forEach((el) => io.observe(el));
  }
  setupMobile();
  mobileMQ.addEventListener && mobileMQ.addEventListener('change', () => { setupMobile(); storyFrame(); if (!isMobile()) howFrame(); });
  navMode();

  /* ---------- 6.6 Chat en vivo (prototipo docs/mindi-landing.html) ---------- */
  const box = $('msgs'), status = $('demoStatus'), replay = $('replay');
  const script = [
    ['u', 'Hola Mindi, tengo una consulta sobre la menopausia', '12:49'],
    ['b', '¡Hola! ¿Qué tal? Estoy aquí para resolver tus dudas.', '12:49'],
    ['u', '¿Es normal tener bochornos a los 47?', '12:50'],
    ['b', 'Sí, es muy común. A esa edad muchas mujeres empiezan la perimenopausia y los bochornos son de las primeras señales. No estás sola en esto.', '12:50'],
    ['b', 'Para saber cuánto te están afectando, te recomiendo hacer el test. Son 11 preguntas y al final tienes un reporte para llevar a tu médico.', '12:51'],
    ['c', 'Haz el test de 5 min →', '/test'],
    ['u', '¡Listo, lo hago!', '12:51'],
  ];
  let timers = [], run = 0;
  function clearDemo() { timers.forEach(clearTimeout); timers = []; box.querySelectorAll('.m-msg,.m-typing,.l-msg-cta').forEach((n) => n.remove()); status.textContent = 'en línea'; }
  function add(who, text, extra) {
    if (who === 'c') { const a = document.createElement('a'); a.className = 'l-msg-cta'; a.href = extra; a.textContent = text; box.appendChild(a); return; }
    const d = document.createElement('div');
    d.className = `m-msg ${who === 'u' ? 'm-msg--user' : 'm-msg--bot'}`;
    d.textContent = text;
    const t = document.createElement('time'); t.textContent = extra + (who === 'u' ? ' ✓✓' : ''); d.appendChild(t);
    box.appendChild(d);
  }
  function play() {
    clearDemo(); replay.hidden = true; const id = ++run;
    if (reduce) { script.forEach((m) => add(...m)); replay.hidden = false; return; }
    let t = 400;
    for (const m of script) {
      if (m[0] === 'c') { t += 350; timers.push(setTimeout(() => { if (id === run) add(...m); }, t)); t += 900; continue; }
      if (m[0] === 'b') {
        const typ = Math.min(2200, 700 + m[1].length * 12);
        timers.push(setTimeout(() => { if (id !== run) return; status.textContent = 'escribiendo…'; const ty = document.createElement('div'); ty.className = 'm-typing'; ty.innerHTML = '<i></i><i></i><i></i>'; box.appendChild(ty); }, t));
        t += typ;
        timers.push(setTimeout(() => { if (id !== run) return; const ty = box.querySelector('.m-typing'); if (ty) ty.remove(); status.textContent = 'en línea'; add(...m); }, t));
        t += 900;
      } else { t += 500; timers.push(setTimeout(() => { if (id === run) add(...m); }, t)); t += 700; }
    }
    timers.push(setTimeout(() => { if (id === run) replay.hidden = false; }, t + 300));
  }
  replay.addEventListener('click', play);
  if ('IntersectionObserver' in window) {
    let startedDemo = false;
    new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && !startedDemo) { startedDemo = true; play(); } }), { threshold: 0.35 }).observe($('pregunta'));
  } else play();

  /* ---------- 6.7 Planes: entran escalonadas; en mobile, carrusel que empieza en Plus ---------- */
  const plans = document.querySelectorAll('.l-plans .l-reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      plans.forEach((c, i) => setTimeout(() => c.classList.remove('is-pending'), i * 120));
      io.disconnect();
    }), { threshold: 0.15 });
    io.observe($('pgrid'));
  } else plans.forEach((c) => c.classList.remove('is-pending'));
  const g = $('pgrid'), dots = document.querySelectorAll('#pdots button');
  const mobilePlans = () => window.matchMedia('(max-width:860px)').matches;
  const center = (i, smooth) => { const c = g.children[i]; g.scrollTo({ left: c.offsetLeft - (g.clientWidth - c.clientWidth) / 2, behavior: smooth && !reduce ? 'smooth' : 'auto' }); };
  if (mobilePlans()) center(1, false);
  dots.forEach((d, i) => d.addEventListener('click', () => center(i, true)));
  g.addEventListener('scroll', () => {
    if (!mobilePlans()) return;
    const mid = g.scrollLeft + g.clientWidth / 2; let best = 0, bd = 1e9;
    [...g.children].forEach((c, i) => { const dd = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid); if (dd < bd) { bd = dd; best = i; } });
    dots.forEach((d, i) => d.setAttribute('aria-current', i === best ? 'true' : 'false'));
  }, { passive: true });

  /* ---------- 6.8 Cierre: las letras suben una por una ---------- */
  const closing = $('cierre');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { closing.classList.remove('is-pending'); io.disconnect(); } }), { threshold: 0.3 });
    io.observe(closing);
  } else closing.classList.remove('is-pending');

  /* ---------- Listas de espera (Plus, consultas, empresas, especialistas) ---------- */
  const dialog = $('waitlist');
  function openWaitlist(list) {
    const cfg = WAITLISTS[list];
    if (!cfg || !dialog.showModal) return;
    const inputs = cfg.fields.map((f) => {
      const d = FIELD[f];
      return `<div class="m-field"><label for="wl_${f}">${d.label}</label><input class="m-input" id="wl_${f}" name="${f}" type="${d.type}" autocomplete="${d.autocomplete}"${d.type === 'number' ? ' min="1" inputmode="numeric"' : ` maxlength="${d.max}"`}${d.required ? ' required' : ''}></div>`;
    }).join('');
    dialog.innerHTML = `<form method="dialog" novalidate>
      <button class="l-dialog-x" type="button" aria-label="Cerrar">×</button>
      <h2 id="waitlistTitle">${cfg.title}</h2><p class="m-text-s">${cfg.lead}</p>
      ${inputs}
      <label class="m-check"><input type="checkbox" name="consent"><span>Acepto la <a href="/privacidad" target="_blank" rel="noopener">Política de privacidad</a>. Usaremos estos datos solo para contactarte sobre Mindi.</span></label>
      <div class="l-ts"></div>
      <p class="l-err" role="alert" hidden></p>
      <button class="m-btn" type="submit">${cfg.submit || WAITLIST_SUBMIT}</button>
    </form>`;
    const form = dialog.querySelector('form');
    const captcha = mountTurnstile ? mountTurnstile(form.querySelector('.l-ts')) : { token: async () => '', remove() {}, reset() {} };
    dialog.querySelector('.l-dialog-x').addEventListener('click', () => dialog.close());
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const values = Object.fromEntries(cfg.fields.map((f) => [f, form.elements[f].value]));
      values.consent = form.elements.consent.checked;
      const { error } = waitlistRow(list, values); // la misma validación corre en el servidor
      const err = form.querySelector('.l-err');
      if (error) { err.textContent = error; err.hidden = false; return; }
      err.hidden = true;
      form.querySelector('[type=submit]').disabled = true;
      const turnstile = await captcha.token();
      api('waitlist', { list, values: { ...values, consent: true }, consent_text_version: consentVersion, is_test: isTest, origin: origin || undefined, turnstile }).then((r) => {
        const ok = !!(r && r.ok);
        const saved = ok || !backendOn; // sin backend (prototipo local) no hay dónde guardar
        track('waitlist_join', { list, captured: !!ok });
        if (!saved) { // se queda el formulario lleno para reintentar
          err.textContent = WAITLIST_ERROR; err.hidden = false;
          form.querySelector('[type=submit]').disabled = false;
          captcha.reset();
          return;
        }
        captcha.remove();
        form.innerHTML = `<button class="l-dialog-x" type="button" aria-label="Cerrar">×</button><h2 id="waitlistTitle">${cfg.title}</h2><p class="l-ok">${cfg.done || WAITLIST_DONE}</p>`;
        form.querySelector('.l-dialog-x').addEventListener('click', () => dialog.close());
      });
    });
    dialog.showModal();
    const first = dialog.querySelector('input');
    if (first) first.focus();
  }
  dialog.addEventListener('close', () => { if (WAITLIST_ROUTES[location.pathname]) history.replaceState(null, '', '/'); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  document.querySelectorAll('[data-waitlist]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); openWaitlist(el.dataset.waitlist); }));
  const routeList = WAITLIST_ROUTES[location.pathname];
  if (routeList) openWaitlist(routeList);
}
