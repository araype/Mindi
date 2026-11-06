import './ds.css';
import './chat.css';
import './site.css';
// Puntaje MRS y cortes de la Guía HNHU: un solo módulo compartido con send-report y los tests.
import {
  computeScores as mrsScores, computeLevel as mrsLevel, levelMessage, CUTS,
  AREAS, areaStatus, AREA_TAG, SKIPPED_INTIMATE_NOTE, doctorRecommendation, EMERGENCY_NOW, agentMrsResult,
  areaNotes as mrsAreaNotes, SUBSCALES,
} from '../supabase/functions/_shared/mrs.js';
import { prioritizedSelfCare, SELF_CARE_SOURCE } from '../supabase/functions/_shared/autocuidado.js';
import { whyNotes, WHY_TITLE } from '../supabase/functions/_shared/notas.js';
import { stageFilter, STAGE_EXIT } from './etapa.js';
import { whatsappUrl, WHATSAPP_TEXT, channelUrl } from './whatsapp.js';
import { createAgentClient, agentHtml, chatGreeting, chatTopic, ERROR_TEXT, LIMIT_TEXT, SHARE_QUESTIONS_VERSION } from './agente.js';
import { glossaryMore } from './glosario.js';
import { initLanding } from './landing.js';
import { mountTurnstile } from './turnstile.js';

/* ---------- Backend: todo pasa por /api (funciones de Vercel, handoff 11.1) ----------
   El navegador nunca habla con Supabase ni tiene sus claves: /api valida, limita y guarda.
   VITE_BACKEND=off: modo prototipo (no envía nada). */
const CONSENT_VERSION = import.meta.env.VITE_CONSENT_VERSION || 'v1';
const BACKEND_ON = import.meta.env.VITE_BACKEND !== 'off';
/* Marca cada sesión como de prueba. VITE_TEST_MODE es el interruptor general (en
   producción ya está en false: cuenta como real por defecto). Aparte, ?test=<lo que sea>
   en la URL fuerza is_test:true para ESA sesión sin importar VITE_TEST_MODE — es el link
   que se comparte entre el equipo para seguir probando sin mezclarse con usuarias reales,
   sin tocar variables de entorno ni desplegar. Cualquier valor sirve (?test=1, ?test=ara,
   ?test=lo-que-sea): no hace falta que sea exactamente "1" — se guarda tal cual en los
   eventos (campo "tester") por si más adelante quieren ver quién probó qué.
   Ej.: mindifem.com/?test=ara y mindifem.com/?test=compa
   La marca queda guardada en ESE navegador (localStorage): basta abrir ?test=... una vez
   y las visitas siguientes, aunque sean sin ?test, también cuentan como prueba. Entrar al
   panel (/panel.html) con la clave también marca el navegador. ?test=off la quita. */
const TESTER_STORE = 'mindi_tester';
const TEST_PARAM = (()=>{
  const fromUrl = new URLSearchParams(location.search).get('test');
  try {
    if(fromUrl === 'off'){ localStorage.removeItem(TESTER_STORE); return null; }
    if(fromUrl){ localStorage.setItem(TESTER_STORE, fromUrl); return fromUrl; }
    return localStorage.getItem(TESTER_STORE);
  } catch { return fromUrl && fromUrl !== 'off' ? fromUrl : null; }
})();
const TEST_MODE = (import.meta.env.VITE_TEST_MODE ?? 'true') !== 'false' || !!TEST_PARAM;

function newId(){
  return (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);}));
}
/* Id anónimo de la visita. Vive en sessionStorage (solo esta pestaña) para que la landing y el
   test (/test, que recarga la página) cuenten como la misma visita en el embudo. Se descarta
   apenas se guarda la sesión del test: el siguiente test de esta pestaña usa uno nuevo. */
const SESSION_STORE = 'mindi_session';
const SESSION_ID = (()=>{
  try {
    const s = sessionStorage.getItem(SESSION_STORE);
    if(s && /^[0-9a-f-]{36}$/i.test(s)) return s;
    const id = newId(); sessionStorage.setItem(SESSION_STORE, id); return id;
  } catch { return newId(); }
})();
function releaseSessionId(){ try { sessionStorage.removeItem(SESSION_STORE); } catch {} }

/* Origen de la visita (p. ej. TikTok), para separar canales en el panel sin tocar la data
   anterior: lo ya registrado no tiene origen y queda como "Sin origen".
   1) ?utm_source=tiktok (o ?src=tiktok) en el link — es el que se pone en TikTok.
   2) Si no viene en el link: el navegador interno de TikTok o Facebook, un referrer de
      tiktok.com / facebook.com, o el ?fbclid= que Facebook agrega a los links.
   3) Si tampoco: el origen guardado de una visita anterior en este navegador (vuelve
      directo, pero llegó por TikTok la primera vez).
   Se llama `origin` (no `source`: ese ya lo usa cta_click para saber qué botón fue). */
const ORIGIN_STORE = 'mindi_origin';
const ORIGIN = (()=>{
  const clean = (v)=> (v || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30) || null;
  const q = new URLSearchParams(location.search);
  let o = clean(q.get('utm_source') || q.get('src'));
  if(!o && (/tiktok|musical_ly|bytedance/i.test(navigator.userAgent) || /tiktok\.com/i.test(document.referrer))) o = 'tiktok';
  if(!o && (/FBAN|FBAV|FB_IAB/.test(navigator.userAgent) || /facebook\.com|fb\.me/i.test(document.referrer) || q.has('fbclid'))) o = 'facebook';
  try {
    if(o) localStorage.setItem(ORIGIN_STORE, o);
    else o = clean(localStorage.getItem(ORIGIN_STORE));
  } catch {}
  return o;
})();

/** POST /api/<ruta> → { ok, status, body } o null si no hubo conexión (o backend apagado). */
function api(path, body){
  if(!BACKEND_ON) return Promise.resolve(null);
  return fetch(`/api/${path}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), keepalive:true,
  }).then(async r=>({ok:r.ok, status:r.status, body: r.status === 204 ? null : await r.json().catch(()=>null)})).catch(()=>null);
}
const apiOk = (r)=> !!(r && r.ok);

window.dataLayer = window.dataLayer || [];
/* Si el test se abrió desde el botón del chat con IA (/test?origen=chat, handoff 10.5.1), sus eventos
   llevan origen: 'chat' (los que ya traen su propio origen, como whatsapp_click, no se tocan). */
const TEST_ORIGEN = new URLSearchParams(location.search).get('origen') === 'chat' ? 'chat' : null;
const FLOW_VERSION = 'cierre-v2'; // docs/experimento.md
function track(event, props){
  if(TEST_ORIGEN && !(props && props.origen)) props = Object.assign({}, props, {origen:TEST_ORIGEN});
  const payload = Object.assign({event:'mindi_'+event, ts:Date.now()}, props||{});
  window.dataLayer.push(payload);
  if(window.console) console.debug('[mindi]', payload);
  const base = {is_test:TEST_MODE, flujo:FLOW_VERSION};
  if(TEST_PARAM) base.tester = TEST_PARAM;
  if(ORIGIN) base.origin = ORIGIN;
  api('track', {session_id:SESSION_ID, name:event, props:Object.assign(base, props||{})});
}

/* WhatsApp del equipo: complementa al test. Cada clic registra whatsapp_click {origen}
   (landing, resultado o filtro), sin el texto ni el número de la usuaria. */
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '';
function whatsappButton(origen, label = 'Escríbele al equipo de Mindi'){
  const url = whatsappUrl(WHATSAPP_NUMBER, WHATSAPP_TEXT[origen]);
  return url ? `<a class="btn btn-sm btn-ghost wa-btn" href="${url}" target="_blank" rel="noopener" data-wa-origen="${origen}">${label}</a>` : '';
}
document.addEventListener('click', (e)=>{
  const a = e.target.closest && e.target.closest('[data-wa-origen]');
  if(a) track('whatsapp_click', {origen:a.dataset.waOrigen});
  const c = e.target.closest && e.target.closest('[data-channel]');
  if(c) track('channel_click', {desde:c.dataset.channel});
});

/* Chat con el agente de IA (bloque 5): solo con VITE_AGENT_CHAT_ENABLED = 'true'. Apagado, el
   sitio queda igual que antes y ningún botón lleva al agente. */
const AGENT_ENABLED = import.meta.env.VITE_AGENT_CHAT_ENABLED === 'true';
/* Nivel 2 (preguntas del chat para investigación): apagado hasta aprobar la política de privacidad. */
const CHAT_RESEARCH_ENABLED = AGENT_ENABLED && import.meta.env.VITE_CHAT_RESEARCH_ENABLED === 'true';
const agentClient = AGENT_ENABLED ? createAgentClient({newId}) : null;

/* Invitación al canal de tips al final del flujo (VITE_WHATSAPP_CHANNEL_URL). Sin enlace válido,
   no se muestra. Los clics se registran como channel_click {desde}, aparte de whatsapp_click. */
const CHANNEL_URL = channelUrl(import.meta.env.VITE_WHATSAPP_CHANNEL_URL);
function channelInvite(desde){
  if(!CHANNEL_URL) return Promise.resolve();
  return revealCard(
    `<p>¿Quieres seguir aprendiendo sobre esta etapa? Síguenos en ` +
    `<a href="${CHANNEL_URL}" target="_blank" rel="noopener" data-channel="${desde}">nuestro canal de WhatsApp</a> ` +
    `para recibir tips de bienestar cada semana.</p>`, 'calm', 400);
}

/* Respuestas del test → /api/session. El servidor recalcula el puntaje y el nivel (11.3). */
function saveSession(){
  state.sessionSaved = api('session', {
    id:SESSION_ID,
    age_range:state.age, cycle:state.cycle,
    smoking:state.smoking, obesity:state.obesity, family_breast_ca:state.familyBreastCa,
    migraine:state.migraine, current_treatment:state.currentTreatment,
    answers:state.answers, red_flags:state.redFlags,
    is_test:TEST_MODE,
  }).then(apiOk);
  state.sessionSaved.then(ok=>{ if(ok) releaseSessionId(); });
}

/* Copia por correo y casillas opcionales → /api/lead, que guarda el correo cifrado, la casilla de
   investigación (sin nombre ni contacto) y pide el envío a send-report. Espera a que la sesión
   exista (clave foránea). */
function sendLead({email, news, research, turnstile, version}){
  return (state.sessionSaved || Promise.resolve()).then(()=> api('lead', {
    session_id:SESSION_ID, email:email || undefined, name: email ? (state.name || undefined) : undefined,
    news:!!news, research:!!research, consent_text_version:version || CONSENT_VERSION, is_test:TEST_MODE, turnstile,
  })).then(r=>{
    if(!email) return r;
    const b = r && r.body;
    if(b && b.report === 'sent') track('report_sent', {channel:b.channel || 'email'});
    else track('report_failed', {error: !r ? 'network' : (b && (b.report || b.error)) || String(r.status)});
    return r;
  });
}

function computeLevel(){ return mrsLevel(state.scores); }

/* ---------- Contenido clínico: MRS oficial (11 ítems, 3 subescalas) — sin cambios de lógica ---------- */
/* scaleLabels: frases por nivel (0-4), SOLO para lo que se ve al responder en el chat.
   El valor guardado sigue siendo 0-4, y el resumen/reporte sigue mostrando la palabra
   oficial (SCALE_LABELS) — así la escala MRS y sus puntos de corte quedan intactos. */
const MRS_ITEMS = [
  {id:'p3',  sub:'somatico', short:'Bochornos / calores',
    question:'¿Qué tanto te han molestado los bochornos, la sudoración o los calores repentinos?',
    example:'Por ejemplo: oleadas de calor en la cara, el cuello o el pecho, a veces con sudoración nocturna.',
    scaleLabels:['No los noto','Los noto, pero sigo mi día','Me interrumpen un poco','Me cuesta seguir lo que hacía','Paro todo hasta que pasan']},
  {id:'p4',  sub:'somatico', short:'Molestias del corazón',
    question:'¿Y las molestias del corazón?',
    example:'Por ejemplo: sentir los latidos, palpitaciones repentinas o una opresión en el pecho.',
    scaleLabels:['No las siento','Las noto de vez en cuando','Se sienten con cierta frecuencia','Se sienten fuertes cuando pasan','Son muy fuertes y duran un buen rato']},
  {id:'p5',  sub:'somatico', short:'Dolores musculares o articulares',
    question:'¿Qué tanto te han molestado los dolores musculares o articulares?',
    example:'Por ejemplo: dolor en huesos o articulaciones, rigidez al levantarte.',
    scaleLabels:['Sin molestia','Rigidez leve al moverme','Dolor que noto varias veces al día','Me cuesta hacer mis actividades normales','No me deja moverme con normalidad']},
  {id:'p6',  sub:'somatico', short:'Sueño',
    question:'¿Cómo has dormido últimamente?',
    example:'Por ejemplo: te cuesta conciliar el sueño, te despiertas a medianoche o sientes que no descansas.',
    scaleLabels:['Duermo bien','A veces me cuesta conciliar el sueño','Me despierto varias veces en la noche','Duermo poco y mal casi todas las noches','Casi no logro descansar']},
  {id:'p7',  sub:'psicologico', short:'Ánimo decaído',
    question:'¿Qué tanto te has sentido decaída o con el ánimo bajo?',
    example:'Por ejemplo: triste, sin energía, o con ganas de llorar sin razón aparente.',
    scaleLabels:['Me siento bien','Algunos días me siento baja de ánimo','Me siento triste con más frecuencia','Cuesta encontrar ganas de hacer cosas','Me siento así casi todo el tiempo']},
  {id:'p8',  sub:'psicologico', short:'Irritabilidad',
    question:'¿Y la irritabilidad?',
    example:'Por ejemplo: sentirte más tensa, explotar con facilidad o sentirte intolerante.',
    scaleLabels:['Me siento tranquila','A veces me irrito más rápido de lo normal','Noto que exploto con más facilidad','Me cuesta controlar mi reacción','Siento que exploto por cualquier cosa']},
  {id:'p9',  sub:'psicologico', short:'Ansiedad',
    question:'¿Qué tanto te ha molestado la ansiedad?',
    example:'Por ejemplo: sentirte angustiada, inquieta o con tendencia al pánico.',
    scaleLabels:['Me siento en calma','A veces siento inquietud','Siento angustia con cierta frecuencia','Me cuesta calmarme cuando aparece','Siento que no puedo controlarla']},
  {id:'p10', sub:'psicologico', short:'Cansancio físico o mental',
    question:'¿Y el cansancio físico o mental?',
    example:'Por ejemplo: rendir menos, cansarte rápido, olvidos frecuentes o dificultad para concentrarte.',
    scaleLabels:['Me siento con energía','Algo más cansada de lo normal','Me cuesta concentrarme algunos días','Rindo mucho menos de lo habitual','Estoy agotada casi todo el día']},
  {id:'p11', sub:'urogenital', skippable:true, short:'Deseo o vida sexual',
    why:'Te pregunto esto porque los cambios hormonales también pueden afectar el deseo y la vida sexual, y es algo que muchas mujeres no se atreven a comentar. Puedes no responder.',
    question:'¿Has notado cambios en tu deseo o tu vida sexual?',
    example:'Por ejemplo: menos ganas, menor frecuencia o menor satisfacción.',
    scaleLabels:['No he notado cambios','Un poco menos de interés que antes','Bastante menos interés que antes','Casi no tengo interés','He perdido el interés por completo']},
  {id:'p12', sub:'urogenital', short:'Molestias al orinar',
    question:'¿Qué tanto te han molestado los problemas al orinar?',
    example:'Por ejemplo: ir con más frecuencia, urgencia repentina o pequeños escapes.',
    scaleLabels:['Sin molestias','Voy un poco más seguido de lo normal','Siento urgencia algunas veces','A veces se me escapa un poco','Me pasa varias veces al día y ya afecta mi rutina']},
  {id:'p13', sub:'urogenital', skippable:true, short:'Sequedad o molestia íntima',
    why:'Te pregunto esto porque la sequedad íntima es una de las molestias más comunes en esta etapa y tiene alternativas. Puedes no responder.',
    question:'¿Y la sequedad o molestia íntima?',
    example:'Por ejemplo: sensación de sequedad, ardor o molestia durante las relaciones.',
    scaleLabels:['Sin molestia','Sequedad leve, no me afecta mucho','La noto con cierta frecuencia','Me genera incomodidad seguido','Me duele o me molesta bastante']},
];
const SCALE_LABELS = ['Nada','Leve','Moderado','Fuerte','Muy fuerte'];

const RED_FLAGS = [
  {id:'rf1', text:'Sangrado vaginal inesperado (más de 12 meses sin regla, o sin causa clara)'},
  {id:'rf2', text:'Dolor de pecho intenso, falta de aire repentina, o antecedente de infarto/ACV'},
  {id:'rf3', text:'Trombosis, embolia pulmonar o un problema de coagulación'},
  {id:'rf4', text:'Cáncer de mama, de endometrio u otro hormono-dependiente'},
  {id:'rf5', text:'Presión arterial alta que no está controlada'},
  {id:'rf6', text:'Problemas de hígado indicados por un médico'},
  {id:'none', text:'Ninguno de los anteriores'},
];
const NONE_TEXT = RED_FLAGS.find(f=>f.id==='none').text;

const ICON_CHECK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
/* Ícono discreto del aviso de emergencia (10.3): un corazón con línea, en ciruela. */
const ICON_CARE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z"/><path d="M3.5 12h4l1.5-3 3 6 1.5-3h7"/></svg>';
const ICON_SEND  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';

/* ---------- Estado ---------- */
const state = {
  answers:{}, redFlags:[],
  age:null, cycle:null, name:null, contact:null,
  smoking:null, obesity:null, familyBreastCa:null, migraine:null, currentTreatment:null,
  satisfaction:null, goals:null,
  scores:{somatico:0, psicologico:0, urogenital:0, total:0},
  skippedIntimate:false,
};

const chat = document.getElementById('chat');
/* El "composer" ya no es un panel fijo aparte: vive DENTRO del hilo del chat, justo
   después de la pregunta, y se desplaza junto con la conversación (como Flo/WhatsApp).
   Así las opciones nunca tapan la pregunta — aparecen después, en el mismo scroll. */
let composer = null;
const progressFill = document.getElementById('progressFill');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TYPING_MS = reduceMotion ? 0 : 850; // antes 550 — conversación más pausada, menos apurada
const TOTAL_STEPS = 26;
let step = 0;
let started = false;   // el test (modo guiado) ya empezó
let aiMode = false;     // esta pestaña es el chat con IA (/chat): sesión aparte del test (10.5)
/* Se pone en true cuando la usuaria toca "Salir" del modo pantalla completa. Sin esto,
   cualquier "resize" lo reactivaba solo — y en el navegador de un celular el alto de la
   ventana cambia todo el tiempo (la barra de direcciones se oculta/aparece al hacer scroll),
   así que un simple scroll por la landing la devolvía de golpe al chat ya terminado. */
let focusDismissed = false;

const sectionLabel = document.getElementById('sectionLabel');
const chatMeta = document.getElementById('chatMeta');
function setSection(label){ if(sectionLabel) sectionLabel.textContent = label; }
function setFocus(on){
  document.getElementById('conversar').classList.toggle('focus', on);
  document.body.classList.toggle('no-scroll', on);
}
/* El modo pantalla completa ya no depende del ancho de pantalla (antes solo pasaba en
   mobile) — ahora, mientras se conversa, tapa el resto de la landing en cualquier tamaño,
   para que el chat tenga todo el espacio. Se mantiene apagado solo si la usuaria lo cerró
   a propósito con "Salir" (ver focusDismissed). */
function syncFocus(){ if((started || aiMode) && !focusDismissed) setFocus(true); }
function setProgress(n){ progressFill.style.width = Math.min(100, Math.round((n/TOTAL_STEPS)*100)) + '%'; }
function advance(){ step++; setProgress(step); }
function scrollBottom(){ requestAnimationFrame(()=>{ chat.scrollTop = chat.scrollHeight; }); }

/* Teclado en mobile: en pantallas táctiles no se enfoca el campo de texto solo (abriría el
   teclado encima de la pregunta antes de que la usuaria la lea) — lo abre ella al tocarlo.
   Y cuando el teclado aparece, el chat se achica al área visible (--app-h / --app-top, ver
   src/chat.css) y baja al final, para que la pregunta y el campo queden justo encima.
   Android lo hace además con interactive-widget=resizes-content (index.html); iOS no lo
   soporta, por eso se usa visualViewport. */
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const vv = window.visualViewport;
if(vv){
  let lastH = vv.height;
  const syncViewport = ()=>{
    if(Math.abs(vv.scale - 1) > 0.01) return; // zoom con los dedos, no teclado
    const root = document.documentElement.style;
    root.setProperty('--app-h', vv.height + 'px');
    root.setProperty('--app-top', vv.offsetTop + 'px');
    if(vv.height < lastH && started) scrollBottom();
    lastH = vv.height;
  };
  vv.addEventListener('resize', syncViewport);
  vv.addEventListener('scroll', syncViewport);
  syncViewport();
}

/* more: [{q, a, id}] o [{q, items:[{term, def}], id}] — explicaciones que se abren al tocar el
   enlace debajo de la pregunta ("¿Qué significa esto?", "¿Qué es el aura?"), para que el texto
   extra no aparezca entre pregunta y pregunta. Con items (glosario, src/glosario.js), cada término
   va en su línea, con el nombre en negrita. */
function addBubble(text, who, cls, subText, more){
  const row = document.createElement('div');
  row.className = 'row ' + who;
  const b = document.createElement('div');
  b.className = 'bubble' + (cls ? ' '+cls : '');
  b.textContent = text;
  if(subText){
    const sp = document.createElement('span');
    sp.className = 'sub';
    sp.textContent = subText;
    b.appendChild(sp);
  }
  (more || []).forEach(({q, a, items, id})=>{
    const d = document.createElement('details');
    d.className = 'more';
    const s = document.createElement('summary');
    s.textContent = q;
    const p = document.createElement('span');
    p.className = 'more-body';
    if(items){
      items.forEach(({term, def})=>{
        const line = document.createElement('span');
        line.className = 'more-term';
        const t = document.createElement('strong');
        t.textContent = term + ': ';
        line.append(t, def);
        p.appendChild(line);
      });
    } else {
      p.textContent = a;
    }
    d.append(s, p);
    d.addEventListener('toggle', ()=>{ if(d.open){ track('help_open', {q:id}); scrollBottom(); } });
    b.appendChild(d);
  });
  row.appendChild(b);
  chat.appendChild(row);
  scrollBottom();
}
function addCard(html, kind){
  const row = document.createElement('div');
  row.className = 'row bot';
  const c = document.createElement('div');
  c.className = 'card' + (kind ? ' '+kind : '');
  c.innerHTML = html;
  row.appendChild(c);
  chat.appendChild(row);
  scrollBottom();
  // Las barras del resultado se llenan con animación al aparecer (sin animación si reduce motion).
  requestAnimationFrame(()=> requestAnimationFrame(()=> c.classList.add('is-shown')));
  return c;
}
const FIRST_WAIT_TEXT = 'Mindi está pensando… la primera respuesta puede tardar unos segundos.';
function showTyping(note){
  const row = document.createElement('div');
  row.className = 'row bot'; row.id = 'typingRow';
  if(note){ row.setAttribute('role','status'); } else { row.setAttribute('aria-hidden','true'); }
  row.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>' +
    (note ? `<p class="typing-note">${note}</p>` : '');
  chat.appendChild(row); scrollBottom();
  setStatus(true);
}
function hideTyping(){ const t = document.getElementById('typingRow'); if(t) t.remove(); setStatus(false); }
/* Estado bajo "Mindi" en el chat con IA: "en línea" / "escribiendo…" (10.5). */
const chatStatus = document.getElementById('chatStatus');
function setStatus(typing){ if(aiMode && chatStatus) chatStatus.textContent = typing ? 'escribiendo…' : 'en línea'; }

/* Revela una tarjeta con el mismo ritmo que los mensajes del bot (pausa de "escribiendo")
   en vez de que todas aparezcan de golpe — para el resultado, que muestra varias seguidas. */
function revealCard(html, kind, ms){
  return new Promise(resolve=>{
    showTyping();
    const delay = reduceMotion ? 0 : (ms !== undefined ? ms : TYPING_MS);
    setTimeout(()=>{
      hideTyping();
      addCard(html, kind);
      setTimeout(resolve, reduceMotion ? 0 : 320);
    }, delay);
  });
}

/* Anuncia el tópico con un mensaje del bot, revela la tarjeta, y (si no es la última)
   espera a que la usuaria responda para seguir — cada texto es la voz de la usuaria,
   aparece como burbuja suya y mantiene el hilo de conversación. */
function revealCardWithPause(introMsg, html, kind, isLast = false, continueText = 'Cuéntame más'){
  return new Promise(async resolve => {
    if(introMsg) await botSay([introMsg]);
    await revealCard(html, kind, 400);
    if(isLast){ resolve(); return; }
    clearComposer();
    const wrap = document.createElement('div');
    wrap.className = 'chips';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip primary';
    btn.textContent = continueText;
    btn.onclick = ()=>{ addBubble(continueText, 'user'); advance(); clearComposer(); resolve(); };
    wrap.appendChild(btn);
    composer.appendChild(wrap);
    scrollBottom();
    btn.focus({preventScroll:true});
  });
}

/* Secuencia de cards de resultado compartida entre el flujo normal y el de banderas rojas */
async function showResultsCardSequence(){
  const msg = levelMessage(state.scores);
  await revealCard(resultCard(msg), '', 400);
  await askResearchConsent(); // reemplaza el botón "Continuar": no agrega pasos
  // "Preguntas para tu médico" ya no va aquí (cierre-v2): está en el reporte, igual que en el PDF.
  // Las recomendaciones de autocuidado y el aviso "solo orientación" ya no van aquí: están en
  // "Tu reporte" (ver reportFullHtml), al final del chat, igual que en el PDF y el correo.
}

const DISCLAIMER = 'Esto es solo orientación informativa según la Guía HNHU (RD N° 211-2024-DG/HNHU). Solo un profesional de salud puede evaluarte con exámenes clínicos en consulta presencial.';

/* messages: string | {text, cls} */
function botSay(messages){
  return new Promise(resolve=>{
    let i = 0;
    function next(){
      if(i >= messages.length){ resolve(); return; }
      showTyping();
      setTimeout(()=>{
        hideTyping();
        const m = messages[i];
        if(typeof m === 'string') addBubble(m, 'bot'); else addBubble(m.text, 'bot', m.cls, m.sub, m.more);
        i++;
        setTimeout(next, reduceMotion ? 0 : 450);
      }, TYPING_MS);
    }
    next();
  });
}
function clearComposer(){
  if(composer) composer.remove();
  composer = document.createElement('div');
  composer.className = 'composer-inline';
  chat.appendChild(composer);
}
function focusFirst(){ const el = composer.querySelector('button:not(:disabled), input'); if(el) el.focus({preventScroll:true}); }

/* ---------- Widgets de respuesta ---------- */
function renderChips(options, onPick){
  clearComposer();
  const wrap = document.createElement('div');
  wrap.className = 'chips';
  options.forEach(opt=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (opt.primary ? ' primary' : '');
    btn.textContent = opt.label;
    btn.onclick = ()=>{
      addBubble(opt.label, 'user');
      clearComposer();
      advance();
      onPick(opt.value ?? opt.label);
    };
    wrap.appendChild(btn);
  });
  composer.appendChild(wrap);
  scrollBottom();
  focusFirst();
}

let scaleKeyHandler = null;
function stopScaleKeys(){ if(scaleKeyHandler){ document.removeEventListener('keydown', scaleKeyHandler); scaleKeyHandler = null; } }
function renderScale(onPick, allowSkip, heading, labels){
  stopScaleKeys();
  clearComposer();
  if(heading){
    const hd = document.createElement('p'); hd.className = 'composer-heading'; hd.textContent = heading; composer.appendChild(hd);
  }
  const displayLabels = labels || SCALE_LABELS;
  const row = document.createElement('div');
  row.className = 'scale-row';
  row.setAttribute('role','group');
  row.setAttribute('aria-label','Intensidad de 0 a 4');
  displayLabels.forEach((label, val)=>{
    const official = SCALE_LABELS[val]; // para el eco y el resumen: siempre la palabra oficial de la escala MRS
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.setAttribute('aria-label', `${label}, nivel ${official.toLowerCase()}, ${val} de 4`);
    btn.innerHTML = `<span class="scale-badge s${val}" aria-hidden="true">${val}</span><span>${label}</span>`;
    btn.onclick = ()=>{
      stopScaleKeys();
      if(!heading){ addBubble(`${val} · ${label}`, 'user'); advance(); }
      clearComposer();
      onPick(val);
    };
    row.appendChild(btn);
  });
  composer.appendChild(row);
  scaleKeyHandler = (e)=>{
    if(e.target && e.target.tagName === 'INPUT') return;
    if(/^[0-4]$/.test(e.key)){ const b = row.children[+e.key]; if(b) b.click(); }
  };
  document.addEventListener('keydown', scaleKeyHandler);
  if(allowSkip){
    const skipWrap = document.createElement('div');
    skipWrap.className = 'chips suggestRow';
    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'chip quiet';
    skipBtn.textContent = 'Prefiero no responder';
    skipBtn.onclick = ()=>{
      stopScaleKeys();
      if(!heading){ addBubble('Prefiero no responder', 'user'); advance(); }
      clearComposer();
      onPick(null);
    };
    skipWrap.appendChild(skipBtn);
    composer.appendChild(skipWrap);
  }
  scrollBottom();
  focusFirst();
}

/* Multi-select genérico (banderas rojas y, ahora, metas) — opts: {id,text}[].
   exclusiveId: si se da, marcarlo limpia el resto (como "Ninguno de los anteriores"). */
function renderMultiSelect(options, onConfirm, exclusiveId){
  clearComposer();
  const selected = new Set();
  const wrap = document.createElement('div');
  wrap.className = 'chips';
  wrap.setAttribute('role','group');
  const buttons = {};
  function paint(){
    Object.entries(buttons).forEach(([id,btn])=>{
      const on = selected.has(id);
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      const icon = btn.querySelector('svg');
      if(on && !icon) btn.insertAdjacentHTML('afterbegin', ICON_CHECK);
      if(!on && icon) icon.remove();
    });
    confirmBtn.disabled = selected.size === 0;
  }
  options.forEach(opt=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.setAttribute('aria-pressed','false');
    btn.appendChild(document.createTextNode(opt.text));
    buttons[opt.id] = btn;
    btn.onclick = ()=>{
      if(exclusiveId && opt.id === exclusiveId){ selected.clear(); selected.add(exclusiveId); }
      else {
        if(exclusiveId) selected.delete(exclusiveId);
        if(selected.has(opt.id)) selected.delete(opt.id); else selected.add(opt.id);
      }
      paint();
    };
    wrap.appendChild(btn);
  });
  composer.appendChild(wrap);

  const confirmWrap = document.createElement('div');
  confirmWrap.className = 'chips suggestRow';
  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'chip primary';
  confirmBtn.textContent = 'Continuar';
  confirmBtn.disabled = true;
  confirmBtn.onclick = ()=>{
    const list = Array.from(selected);
    const labelText = list.map(id=>options.find(o=>o.id===id).text).join('. ');
    addBubble(labelText, 'user');
    clearComposer();
    advance();
    onConfirm(list);
  };
  confirmWrap.appendChild(confirmBtn);
  composer.appendChild(confirmWrap);
  scrollBottom();
  composer.querySelector('button')?.focus({preventScroll:true});
}

/* Escala de satisfacción con caritas circulares, etiquetas de texto y estrella en la
   más alta. Mismos tonos s0–s4 que el resto de la app. */
const FACE_LABELS = ['Muy insatisfecha','Insatisfecha','Neutral','Satisfecha','Muy satisfecha'];
const FACE_MOUTHS = [
  'M7,17 Q12,13 17,17',
  'M7,16.3 Q12,14 17,16.3',
  'M7,16 L17,16',
  'M7,15 Q12,18 17,15',
  'M7,14.3 Q12,19 17,14.3',
];
const STAR_PATH = 'M8 1.5l1.6 3.3 3.6.5-2.6 2.5.6 3.7L8 9.8 4.8 11.5l.6-3.7-2.6-2.5 3.6-.5z';
function renderFaceScale(onPick){
  clearComposer();
  const wrap = document.createElement('div');
  wrap.className = 'face-scale';
  wrap.setAttribute('role','group');
  wrap.setAttribute('aria-label','Qué tan satisfecha quedaste, de 1 a 5');
  for(let i=0;i<5;i++){
    const color = `var(--s${4-i}-border)`;
    const bg    = `var(--s${4-i}-bg)`;
    const isTop = i === 4;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'face-btn';
    btn.setAttribute('aria-label', FACE_LABELS[i]);

    const faceWrap = document.createElement('div');
    faceWrap.className = 'face-wrap';
    faceWrap.innerHTML =
      `<svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="${bg}"/>
        <circle cx="8.3"  cy="10" r="1.3" fill="${color}"/>
        <circle cx="15.7" cy="10" r="1.3" fill="${color}"/>
        <path d="${FACE_MOUTHS[i]}" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round"/>
      </svg>` +
      (isTop
        ? `<span class="face-star" aria-hidden="true">
             <svg viewBox="0 0 16 16" width="15" height="15" fill="${color}">
               <path d="${STAR_PATH}"/>
             </svg>
           </span>`
        : '');

    const label = document.createElement('span');
    label.className = 'face-label';
    label.textContent = FACE_LABELS[i];

    btn.appendChild(faceWrap);
    btn.appendChild(label);
    btn.onclick = ()=>{
      addBubble(FACE_LABELS[i], 'user');
      advance();
      clearComposer();
      onPick(i, FACE_LABELS[i]);
    };
    wrap.appendChild(btn);
  }
  composer.appendChild(wrap);
  scrollBottom();
  wrap.querySelector('button')?.focus({preventScroll:true});
}

function renderTextInput(placeholder, opts, onSubmit){
  clearComposer();
  const row = document.createElement('form');
  row.className = 'inputRow';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder);
  if(opts.inputmode) input.inputMode = opts.inputmode;
  if(opts.inputType === 'email'){ input.type = 'email'; input.autocomplete = 'email'; }
  const send = document.createElement('button');
  send.type = 'submit';
  send.className = 'sendBtn';
  send.setAttribute('aria-label','Enviar');
  send.innerHTML = ICON_SEND;
  row.onsubmit = (e)=>{
    e.preventDefault();
    const val = input.value.trim();
    if(!val) return;
    if(opts.validate && !opts.validate(val)){
      let err = composer.querySelector('.hint.err');
      if(!err){ err = document.createElement('p'); err.className='hint err'; err.setAttribute('role','alert'); composer.appendChild(err); }
      err.textContent = opts.errorText;
      scrollBottom();
      return;
    }
    addBubble(val, 'user');
    clearComposer();
    advance();
    onSubmit(val);
  };
  row.appendChild(input); row.appendChild(send);
  composer.appendChild(row);

  if(opts.skipLabel){
    const sWrap = document.createElement('div');
    sWrap.className = 'chips suggestRow';
    const sBtn = document.createElement('button');
    sBtn.type = 'button';
    sBtn.className = 'chip quiet';
    sBtn.textContent = opts.skipLabel;
    sBtn.onclick = ()=>{
      addBubble(opts.skipLabel, 'user');
      clearComposer();
      advance();
      onSubmit(opts.skipValue ?? null);
    };
    sWrap.appendChild(sBtn);
    composer.appendChild(sWrap);
  }
  if(opts.hint){
    const h = document.createElement('p'); h.className='hint'; h.textContent = opts.hint; composer.appendChild(h);
  }
  scrollBottom();
  if(!isTouch) input.focus({preventScroll:true});
}

/* ---------- Flujo ---------- */
function openChatShell(){
  const s = document.getElementById('chatStart'); if(s) s.remove();
  document.querySelector('.chat-shell').classList.remove('idle');
  chatMeta.hidden = false;
  syncFocus();
}

const START_WELCOME_FROM_CHAT = 'Este test te ayuda a ver cuánto te están afectando tus síntomas y te da un reporte para tu médico. Son 11 preguntas cortas.';
async function start(){
  if(started) return;
  started = true;
  track('chat_start');
  openChatShell();
  setSection('Bienvenida');
  setProgress(1);
  // La bienvenida, el consentimiento y el aviso de emergencias ya se vieron en la tarjeta de inicio
  // (index.html): aquí va directo la primera pregunta.
  askAge();
}

/* Entre pregunta y pregunta, cada mensaje del bot cabe en UNA línea a 360 px (unos 35
   caracteres). Lo que explica o da contexto va en un desplegable de la pregunta (more) o en
   el reporte (la nota de etapa). Las preguntas en sí pueden ocupar más de una línea. */
function askAge(){
  setSection('Sobre ti');
  botSay([{text:'¿En qué rango de edad estás?', cls:'question'}]).then(()=>{
    renderChips([{label:'Menor de 40'},{label:'40 a 45'},{label:'46 a 52'},{label:'Mayor de 52'}],
      (v)=>{ state.age = v; track('answer',{q:'p1'}); askCycle(); });
  });
}

function askCycle(){
  botSay([{text:'En los últimos 12 meses, ¿cómo ha estado tu periodo?', cls:'question', more:[glossaryMore('p2')]}]).then(()=>{
    renderChips([
      {label:'Sigue regular'},
      {label:'Es irregular (varía o se retrasa)'},
      {label:'Más de 60 días sin regla'},
      {label:'Más de 12 meses sin regla'},
      {label:'Me hicieron una histerectomía'},
    ], (v)=>{ state.cycle = v; track('answer',{q:'p2'}); afterStageQuestions(); });
  });
}

/* Ubica a la usuaria en su etapa a partir de P1 (edad) + P2 (ciclo), usando solo la
   definición clínica de la guía (6.2.1) — nunca STRAW+10 (necesita FSH/AMH que no
   recolectamos). Mismo contenido que supabase/functions/send-report/index.ts (stageNote).
   Ya no se dice en el chat entre preguntas: va en el reporte. */
function stageNote(){
  const age = state.age, cycle = state.cycle;
  if(cycle === 'Me hicieron una histerectomía'){
    return 'Como te hicieron una histerectomía, no se puede ubicar tu etapa por los cambios del ciclo — eso se conversa mejor con tu médico, tomando en cuenta tus síntomas.';
  }
  if(cycle === 'Más de 12 meses sin regla'){
    return 'Según la definición clínica (12 meses seguidos sin regla), ya estarías en la etapa de postmenopausia.';
  }
  if(cycle === 'Más de 60 días sin regla'){
    return 'Esto suele ser parte de la transición hacia la menopausia. Todavía no se cumplen los 12 meses que se usan clínicamente para hablar de menopausia — eso viene después.';
  }
  if(cycle === 'Es irregular (varía o se retrasa)'){
    return 'Esto es típico de la transición hacia la menopausia (perimenopausia) — el ciclo suele empezar a variar antes de que aparezcan otros síntomas.';
  }
  if(age === 'Menor de 40' || age === '40 a 45'){
    return 'Tu ciclo sigue regular. La premenopausia suele iniciar entre los 35 y 45 años — es probable que estés en esa etapa previa, o recién empezando la transición.';
  }
  return 'Tu ciclo sigue regular, aunque desde los 45 años es común que otros síntomas empiecen antes que los cambios en la regla. Vale la pena comentarlo con tu médico igual.';
}
const PERU_AGE_NOTE = 'En Perú, la edad promedio de la menopausia es 47 años — cada cuerpo tiene su propio ritmo, así que esto es orientativo.';

/* Filtro de etapa (src/etapa.js): una menor de 40 nunca llega al test ni ve un puntaje. */
function afterStageQuestions(){
  const exit = stageFilter(state.age, state.cycle);
  if(exit === STAGE_EXIT.continue) return startDomain('somatico');
  track('stage_filter_exit');
  showStageExit(exit);
}

const STAGE_EXIT_CARD = {
  [STAGE_EXIT.under40Regular]: {kind:'calm',
    title:'Mindi está pensada para mujeres desde los 40',
    body:'Las preguntas y el puntaje de Mindi miden los cambios de la transición a la menopausia, que suelen empezar después de los 40. Con un ciclo regular antes de esa edad no aplican, así que no te mostraré un puntaje.'},
  [STAGE_EXIT.under40Irregular]: {kind:'notice',
    title:'Te recomendamos consultar con un médico',
    body:'Antes de los 40, los cambios en la regla deben evaluarse con tu ginecólogo u obstetra, para encontrar la causa. Por eso no te mostraré un puntaje: las preguntas de Mindi están pensadas para mujeres desde los 40.'},
};
function showStageExit(segment){
  setSection('Sobre tu etapa');
  const c = STAGE_EXIT_CARD[segment];
  const wa = whatsappButton('filtro');
  revealCard(`<h3>${c.title}</h3><p>${c.body}</p>` + (wa ? `<div class="card-actions">${wa}</div>` : ''), c.kind)
    .then(()=> askInterest(segment));
}

/* Lista de interés de quienes salen por el filtro: solo correo + segmento (tabla
   interest_signups, SQL 015). No hay sesión ni respuestas de salud guardadas. */
/* Turnstile del chat (11.3): va fuera del composer, que se vacía al responder. */
const tsBox = document.getElementById('tsBox');

function askInterest(segment){
  setSection('Lista de interés');
  botSay([{text:'¿Quieres que te avisemos cuando Mindi tenga algo para tu etapa?', cls:'question'}]).then(()=>{
    const interestCaptcha = mountTurnstile(tsBox);
    renderTextInput('correo@ejemplo.com', {
      inputType:'email',
      skipLabel:'No, gracias',
      validate:validEmail,
      errorText:'Revisa el correo, o elige "No, gracias".',
      hint:'Usaremos tu correo solo para avisarte de novedades de Mindi.',
    }, (val)=>{
      setProgress(TOTAL_STEPS);
      if(val){
        interestCaptcha.token().then(turnstile=>{ interestCaptcha.remove(); return api('waitlist', {segment, email:val, consent_text_version:CONSENT_VERSION, is_test:TEST_MODE, turnstile}); });
        track('interest_signup');
        botSay(['Listo, te avisaremos. Cuídate.']).then(()=> channelInvite('filtro')).then(()=> afterGuided(false));
      } else {
        interestCaptcha.remove();
        track('interest_skip');
        botSay(['Está bien. Cuídate mucho.']).then(()=> channelInvite('filtro')).then(()=> afterGuided(false));
      }
    });
  });
}

const DOMAIN_BRIDGE = {
  somatico: 'Pensando en el último mes:',
  psicologico: 'Ahora, tu ánimo y energía.',
  urogenital: 'Ahora, algo más íntimo.',
};

function startDomain(domain){
  const items = MRS_ITEMS.filter(i=>i.sub===domain);
  botSay([DOMAIN_BRIDGE[domain]]).then(()=> askItem(items, 0, domain));
}

function askItem(items, idx, domain){
  if(idx >= items.length){
    if(domain === 'somatico') return startDomain('psicologico');
    if(domain === 'psicologico') return startDomain('urogenital');
    if(domain === 'urogenital') return finishMrs();
  }
  const item = items[idx];
  setSection(`Pregunta ${MRS_ITEMS.indexOf(item) + 1} de ${MRS_ITEMS.length}`);
  // La razón de las preguntas íntimas (why) va dentro de la misma burbuja, con el mismo texto:
  // es parte de la pregunta, no un mensaje más entre preguntas.
  botSay([{text:item.question, cls:'question', sub:item.why, more:[{id:item.id, q:'¿Qué significa esto?', a:item.example}]}]).then(()=>{
    renderScale((val)=>{
      state.answers[item.id] = val;
      if(val === null && item.skippable) state.skippedIntimate = true;
      track('answer',{q:item.id});
      askItem(items, idx+1, domain);
    }, !!item.skippable, undefined, item.scaleLabels);
  });
}

/* Antes había una tarjeta de repaso editable ("Lo que me contaste hasta ahora") entre las
   11 respuestas y el bloque de contexto — se quitó porque sumaba un paso más sin avanzar la
   conversación (fricción). Se sigue marcando mrs_complete para no perder esa métrica del
   embudo, solo que ahora sin la pausa de revisión. */
function finishMrs(){
  track('mrs_complete');
  setSection('Contexto para tu reporte');
  botSay(['Gracias por contarme todo esto.']).then(()=> askSmoking());
}

/* Preguntas de contexto: no suman puntos. Cada respuesta dispara `answer` con su id
   (sin el valor), igual que las 11 de la escala, para ver en qué pregunta se abandona. */
function askSmoking(){
  setSection('Contexto para tu reporte');
  botSay(['Unas preguntas de contexto.', {text:'¿Fumas actualmente?', cls:'question', more:[
    {id:'ctx_fuma', q:'¿Por qué te pregunto esto?', a:'No suma puntos. Algunos hábitos y antecedentes cambian qué tratamiento suele preferirse, y así tu reporte lo incluye.'},
  ]}]).then(()=>{
    renderChips([{label:'No fumo'},{label:'Fumo ocasionalmente'},{label:'Fumo a diario'},{label:'Fumaba antes, ya no'}],
      (v)=>{ state.smoking = v; track('answer',{q:'ctx_fuma'}); askObesity(); });
  });
}
function askObesity(){
  botSay([{text:'¿Un médico te ha dicho alguna vez que tienes obesidad (IMC entre 30 y 40)?', cls:'question', more:[glossaryMore('ctx_imc')]}]).then(()=>{
    renderChips([{label:'Sí'},{label:'No'},{label:'No estoy segura'}], (v)=>{ state.obesity = v; track('answer',{q:'ctx_obesidad'}); askFamilyHistory(); });
  });
}
function askFamilyHistory(){
  botSay([{text:'¿Tu mamá o alguna hermana ha tenido cáncer de mama?', cls:'question'}]).then(()=>{
    renderChips([{label:'Sí'},{label:'No'},{label:'No sé / no tengo ese dato'}], (v)=>{ state.familyBreastCa = v; track('answer',{q:'ctx_antecedente'}); askMigraine(); });
  });
}
const MIGRAINE_AURA = 'Sí, con aura (destellos, luces u otros síntomas antes del dolor)';
function askMigraine(){
  botSay([{text:'¿Sufres de migrañas?', cls:'question', more:[glossaryMore('ctx_aura')]}]).then(()=>{
    renderChips([{label:'No'},{label:'Sí, sin aura'},{label:MIGRAINE_AURA}], (v)=>{ state.migraine = v; track('answer',{q:'ctx_migrana'}); askCurrentTreatment(); });
  });
}
/* P18 (tiempo desde la última regla/cirugía) se quitó: solo servía para la "ventana
   terapéutica" de la guía, contenido que se decidió no comunicar todavía (ver
   docs/guia-hnhu-climaterio-2024.md) — y para histerectomizadas, "tiempo desde la
   cirugía" no es un buen indicador de "tiempo desde la menopausia" (la guía excluye
   a este grupo de STRAW+10 por la misma razón). No se usaba en ningún resultado. */
function askCurrentTreatment(){
  botSay([{text:'¿Usas algún tratamiento para estos síntomas?', cls:'question', more:[
    {id:'ctx_tratamiento', q:'¿Qué cuenta como tratamiento?', a:'Por ejemplo: terapia hormonal (pastillas, parches o gel con estrógeno) o productos naturales como isoflavonas de soya u otros suplementos, si los tomas para los bochornos, el sueño u otros síntomas de esta etapa.'},
  ]}]).then(()=>{
    renderChips([
      {label:'No uso ningún tratamiento'},
      {label:'Sí, tratamiento hormonal'},
      {label:'Sí, tratamiento no hormonal (plantas, suplementos, etc.)'},
      {label:'No estoy segura'},
    ], (v)=>{ state.currentTreatment = v; track('answer',{q:'ctx_tratamiento'}); askRedFlags(); });
  });
}

function askRedFlags(){
  setSection('Por tu seguridad');
  botSay(['Por último, algo de seguridad.', {text:'¿Tienes alguno de estos antecedentes? Marca todo lo que aplique.', cls:'question', more:[glossaryMore('rf_terminos')]}]).then(()=>{
    renderMultiSelect(RED_FLAGS, (selected)=>{
      state.redFlags = selected;
      computeScores();
      saveSession();
      track('redflags_answered');
      if(hasFlag()) showSafetyMessage(); else showResultsTopics();
    }, 'none');
  });
}

function computeScores(){ Object.assign(state.scores, mrsScores(state.answers)); }

function hasFlag(){ return state.redFlags.length && !state.redFlags.includes('none'); }

/* ---------- Lo que se detectó: contenido de cada "tema" desplegable ---------- */
/* AREAS (etiqueta, máximo y corte de cada subescala) viene del módulo compartido. */
/* Tres barras (10.2): Cuerpo, Ánimo y Vida íntima, con el porcentaje a la derecha. El ancho va en
   --w y se anima cuando la tarjeta aparece (clase is-shown, ver revealCard). */
function areaBars(){
  const s = state.scores;
  return AREAS.map(a=>{
    const v = s[a.key];
    const pct = Math.round((v/a.max)*100);
    const status = areaStatus(a.key, v, state.skippedIntimate);
    const notable = status === 'over';
    return `<div class="area">
      <div class="area-top"><span class="area-name">${a.label}</span><span class="meter-pct">${pct}%</span></div>
      <div class="meter" role="progressbar" aria-label="${a.label}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="--w:${pct}%"></span></div>
      <span class="area-tag ${notable ? 'hi' : ''}">${AREA_TAG.user[status]}</span>
    </div>`;
  }).join('');
}
/* Notas que acompañan a las barras: bienestar emocional y preguntas íntimas omitidas. */
/* Una nota por cada área que alcanza su corte de la guía (Cuerpo, Ánimo, Vida íntima), de la de
   mayor porcentaje a la de menor. Textos y cortes en el módulo compartido (mrs.js, AREA_NOTES). */
function areaNotes(){
  let html = mrsAreaNotes(state.scores).map(n=>`<div class="area-note">
      <div class="area-note-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <strong>${n.title}</strong>
      </div>
      <p>${n.text}</p>
      <span class="cite">${n.source}</span>
    </div>`).join('');
  if(state.skippedIntimate){
    html += `<p class="skipped-note">${SKIPPED_INTIMATE_NOTE}</p>`;
  }
  return html;
}

/* Badge, título y texto describen la acción que sugiere la guía, no la intensidad
   (los cortes HNHU son umbrales de tratamiento). Ver levelMessage en el módulo compartido. */
const levelText = (msg)=> msg.paragraphs.join('<br><br>');
/* Nivel para la recomendación médica: con una señal de alerta manda la indicación del aviso. */
const recoLevel = ()=> hasFlag() ? 'alert' : computeLevel();
const doctorReco = ()=> `<p class="doctor-reco">${doctorRecommendation(recoLevel())}</p>`;
/* Resultado (10.2): "Tus síntomas hoy", el chip con la etiqueta de la guía (decisión del 4 nov.:
   no la intensidad), las tres barras y la nota en lenguaje simple. */
function levelCard(msg){
  return `<h3>Tus síntomas hoy</h3><span class="result-chip">${msg.badge}</span>` +
    areaBars() +
    `<p class="cite">Evaluación gráfica de conjunto según la Escala MRS (Menopause Rating Scale), no una calificación.</p>` +
    `<div class="result-note"><strong>${msg.title}</strong>${doctorReco()}<p>${levelText(msg)}</p></div>` +
    areaNotes();
}

/* Resultado (cierre-v2, 5 nov. 2026): un mensaje principal (el área que más pesa), la recomendación
   de consultar y la derivación a salud mental siempre visibles; el resto, plegado. */
const AREA_IN_TEXT = {somatico:'tu cuerpo', psicologico:'tu ánimo', urogenital:'tu vida íntima'};
function markedSymptoms(key){
  return SUBSCALES[key]
    .map(id=>({it:MRS_ITEMS.find(x=>x.id===id), v:state.answers[id]}))
    .filter(x=>x.it && x.v != null && x.v >= 2)
    .sort((a,b)=> b.v - a.v)
    .slice(0, 2);
}
function resultCard(msg){
  const notes = mrsAreaNotes(state.scores);
  const main = notes[0] || null;
  const s = state.scores;
  const bars = AREAS.map(a=>{
    const pct = Math.round((s[a.key]/a.max)*100);
    const incomplete = areaStatus(a.key, s[a.key], state.skippedIntimate) === 'incomplete';
    return `<div class="area${main && main.key === a.key ? ' is-main' : ''}">
      <div class="area-top"><span class="area-name">${a.label}</span><span class="meter-pct">${pct}%</span></div>
      <div class="meter" role="progressbar" aria-label="${a.label}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="--w:${pct}%"></span></div>
      ${incomplete ? `<span class="area-tag">${AREA_TAG.user.incomplete}</span>` : ''}
    </div>`;
  }).join('');
  const meaning = `<details class="result-more" data-seccion="significado"><summary>Qué significa este resultado</summary>` +
    `<p><strong>${msg.title}</strong></p><p>${levelText(msg)}</p>` +
    `<p class="cite">Evaluación gráfica de conjunto según la Escala MRS (Menopause Rating Scale), no una calificación.</p></details>`;
  let html = `<span class="result-chip">${msg.badge}</span>`;
  if(main){
    const marked = markedSymptoms(main.key);
    html += `<h3>Lo que más pesa hoy: ${AREA_IN_TEXT[main.key]}</h3>` + doctorReco();
    if(marked.length) html += `<p class="marked-title">Lo que marcaste:</p><ul class="marked">` +
      marked.map(m=>`<li>${m.it.short} · <strong>${SCALE_LABELS[m.v]}</strong></li>`).join('') + `</ul>`;
    html += `<p class="main-note">${main.text}</p><span class="cite">${main.source}</span>`;
  } else {
    html += `<h3>Tus síntomas hoy</h3>` + doctorReco() + `<p class="main-note"><strong>${msg.title}</strong><br>${levelText(msg)}</p>`;
  }
  html += `<div class="bars">${bars}</div>`;
  const others = notes.slice(1);
  if(others.length){
    const names = others.map(n=> AREAS.find(a=>a.key===n.key).label);
    const list = names.length > 1 ? `${names.slice(0,-1).join(', ')} y ${names[names.length-1]}` : names[0];
    html += `<p class="area-also">${list} también ${names.length > 1 ? 'alcanzan' : 'alcanza'} el punto en que la guía sugiere comentarlo con tu médico.</p>`;
  }
  // Derivación a salud mental: visible siempre que Ánimo alcance su corte (si es el área principal,
  // ya va en su nota).
  if(others.some(n=> n.key === 'psicologico'))
    html += `<p class="mh-note">${MENTAL_HEALTH_LINE}</p>`;
  if(state.skippedIntimate) html += `<p class="skipped-note">${SKIPPED_INTIMATE_NOTE}</p>`;
  if(main) html += meaning;
  if(others.length) html += `<details class="result-more" data-seccion="areas"><summary>Ver las tres áreas en detalle</summary>` +
    others.map(n=>`<div class="area-note"><div class="area-note-header"><strong>${n.title}</strong></div><p>${n.text}</p><span class="cite">${n.source}</span></div>`).join('') +
    `</details>`;
  return html;
}
const MENTAL_HEALTH_LINE = 'Por tu puntaje en el ánimo, vale la pena comentarlo también con un profesional de salud mental.';

/* Permiso de investigación (5 nov. 2026): una sola vez, después del resultado, sin nada marcado.
   "Sí, compartir" cubre sus respuestas del test y sus preguntas del chat (no se le vuelve a preguntar). */
const RESEARCH_ASK = '¿Me ayudas a mejorar Mindi? Si quieres, uso tus respuestas, sin tus datos de contacto, para entender mejor qué necesitan otras mujeres.';
const RESEARCH_MORE = 'Guardamos tus respuestas del test y, si usas el chat, tus preguntas, sin tu nombre, correo ni teléfono. Las usamos solo para mejorar Mindi y para estudios sobre la menopausia. Puedes cambiar de opinión cuando quieras desde el chat, con "Dejar de compartir".';
const RESEARCH_VERSION = 'resultado-v1';
function askResearchConsent(){
  return new Promise(resolve=>{
    revealCard(`<p>${RESEARCH_ASK}</p><details class="ai-more"><summary>Más información</summary>` +
      `<p>${RESEARCH_MORE} <a href="/privacidad" target="_blank" rel="noopener">Política de privacidad</a>.</p></details>`, 'calm', 300).then(()=>{
      renderChips([{label:'Sí, compartir', primary:true, value:'si'}, {label:'No, gracias', value:'no'}], (v)=>{
        state.research = v === 'si';
        track('research_consent', {captured: state.research, desde:'resultado'});
        if(state.research) sendLead({research:true, version:RESEARCH_VERSION}); // research_consents, sin nombre ni contacto
        resolve();
      });
    });
  });
}

function consultCard(){
  return `<h3>¿Qué preguntarle a tu médico?</h3>` + consultBody();
}

/* Recomendaciones de autocuidado del reporte (lista completa, desde
   supabase/functions/_shared/autocuidado.js, igual que send-report). */
/* Recomendaciones del reporte: las 3 más prioritarias según sus respuestas, completas, y el resto
   (en una línea cada una) en un desplegable, para que no sea una lista larga. */
function selfCareBody(){
  const { top, rest } = prioritizedSelfCare(state.answers);
  const rows = top.map(([t,d])=>`<li><strong>${t}:</strong> ${d}</li>`).join('');
  const more = rest.length
    ? `<details class="more-tips"><summary>Ver más ideas (${rest.length})</summary><ul class="card-list">${rest.map(r=>`<li>${r}</li>`).join('')}</ul></details>` : '';
  return `<p class="card-note">No reemplazan un tratamiento si tu médico lo indica — son medidas seguras para cualquier momento de esta etapa.</p>` +
    `<ul class="card-list">${rows}</ul>` + more +
    `<span class="cite">Fuente: ${SELF_CARE_SOURCE}</span>`;
}

/* "¿Qué preguntarle a mi médico?": preguntas siempre útiles + los puntos de contexto
   que ya calculamos (tabaquismo, migraña, etc.). En la propia voz de la usuaria. */
function consultBody(){
  const pts = [];
  if(state.smoking && state.smoking !== 'No fumo') pts.push('Fumas o fumabas: la guía sugiere que, si consideras terapia hormonal, se prefiera la vía transdérmica (parche o gel) en vez de pastillas, por el riesgo cardiovascular del tabaco — y trabajar en dejarlo.');
  if(state.obesity === 'Sí') pts.push('Tienes indicación médica de obesidad: la guía sugiere preferir estrógeno transdérmico o en dosis bajas.');
  if(state.familyBreastCa === 'Sí') pts.push('Antecedente familiar de cáncer de mama: la guía indica que sí puedes usar terapia hormonal sistémica, pero sugiere considerar un tamizaje genético.');
  if(state.migraine === MIGRAINE_AURA) pts.push('Migraña con aura: la guía sugiere estradiol transdérmico continuo en vez de la vía oral.');
  if(state.currentTreatment && state.currentTreatment.startsWith('Sí')) pts.push('Ya usas un tratamiento: cuéntaselo a tu médico para evaluar ajustarlo en vez de partir de cero.');

  const generic = [
    '¿Qué opciones de tratamiento, hormonales y no hormonales, tendrían sentido para mi caso?',
    '¿Me corresponde algún examen de rutina de esta etapa (hormonal, mamografía, densitometría)?',
  ];
  let html = `<p class="card-note">Puedes llevar contigo lo que viste en "Ver mis resultados por área" y, si quieres, estas preguntas:</p>` +
    `<ul class="card-list">${generic.map(g=>`<li>${g}</li>`).join('')}</ul>`;
  if(pts.length){
    html += `<p style="margin-top:10px;font-weight:600;">También ten en cuenta:</p><ul class="card-list">${pts.map(p=>`<li>${p}</li>`).join('')}</ul>` +
      `<span class="cite">Estas sugerencias son de la guía (Figura 6 y 7) — la decisión final siempre es de tu médico, evaluando tu caso completo.</span>`;
  }
  return html;
}


function showResultsTopics(){
  setSection('Lo que noto');
  clearComposer();
  const level = computeLevel();

  botSay(['Esto es lo que noto:']).then(async ()=>{
    await showResultsCardSequence();
    track('result');
    continueToGoals();
  });
}

/* La bandera roja se ANTEPONE al reporte, no lo reemplaza: la usuaria sigue viendo sus
   resultados completos (etapa, áreas, autocuidado, preguntas para su médico) — igual que
   en el correo/PDF (ver buildFragment/buildPdf en supabase/functions/send-report). */
function showSafetyMessage(){
  setSection('Un paso de cuidado');
  clearComposer();
  const hasEmergency = state.redFlags.includes('rf2');
  botSay(['Gracias por confiarme esto.']).then(async ()=>{
    if(hasEmergency){
      await revealCard(
        `<h3 class="alert-title">${ICON_CARE}No estás sola en esto</h3>Marcaste algo que conviene revisar cuanto antes.` +
        `<div class="emergency">${EMERGENCY_NOW}</div>` +
        'Para el resto de señales que marcaste, agenda una cita ginecológica lo antes posible.' +
        '<br><br>Esto no reemplaza la valoración de un profesional de salud.', 'alert-emergency');
    } else {
      await revealCard(
        '<h3>No estás sola en esto</h3>Marcaste algo que vale la pena conversar con tu médico antes de considerar cualquier tratamiento. Es un paso de cuidado, no una emergencia. Te recomendamos agendar una cita ginecológica en los próximos días para revisarlo con calma.' +
        '<br><br>Esto no reemplaza la valoración de un profesional de salud.', 'alert-eval');
    }
    track('result'); // sin nivel ni señales: la analítica no lleva datos de salud (11.8)
    await botSay(['Y esto noto en tus síntomas:']);

    const level = computeLevel();
    await showResultsCardSequence();
    continueToGoals();
  });
}

/* ---------- Metas + validación de precio + datos + satisfacción ----------
   Comparten el mismo cierre sin importar si hubo bandera roja: ya se mostró la
   información que corresponde (resultados o aviso de seguridad) antes de llegar aquí. */
const GOAL_OPTIONS = [
  'Manejar la perimenopausia o menopausia',
  'Detener los sofocos o sudores nocturnos',
  'Dormir mejor',
  'Tener claridad mental y concentración',
  'Controlar mi peso',
  'Mejorar mi ánimo o ansiedad',
  'Mejorar mi vida íntima (libido, comodidad)',
  'Aliviar el dolor articular',
  'Aliviar la sequedad vaginal',
];

function continueToGoals(){
  askGoals();
}

function askGoals(){
  setSection('Tus metas');
  revealCard('<h3>¿Qué te gustaría lograr a partir de ahora?</h3><p class="card-note">Elige todas las que apliquen — no hay una respuesta correcta.</p>', 'goals').then(()=>{
    const options = GOAL_OPTIONS.map((text,i)=>({id:'g'+i, text}));
    renderMultiSelect(options, (selected)=>{
      const labels = selected.map(id => GOAL_OPTIONS[+id.slice(1)]);
      state.goals = labels;
      track('goals');
      askSatisfaction(askName);
    });
  });
}

function askName(){
  setSection('Tu reporte');
  // Opcional: solo personaliza el saludo del reporte (PDF y correo). No se guarda si no deja su correo.
  botSay([{text:'¿Cómo quieres que te llame en tu reporte?', cls:'question'}]).then(()=>{
    renderTextInput('Tu nombre o un apodo', {skipLabel:'Prefiero no decirlo', skipValue:''}, (val)=>{
      state.name = val || '';
      showReport();
    });
  });
}

/* Correo para la copia del reporte (el número de WhatsApp ya no se pide). validContact sigue
   aceptando WhatsApp solo para la inscripción a los conversatorios. */
function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
function validContact(v){
  const phone = v.replace(/\D/g,'').length >= 9;
  return validEmail(v) || phone;
}

/* Navegadores internos de TikTok, Facebook e Instagram: a veces no abren ni descargan PDF. */
const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|musical_ly|BytedanceWebview|TikTok/i.test(navigator.userAgent);

/* El reporte completo, dentro del chat: lo mismo que el PDF y el correo, en el mismo orden. */
function reportAnswersList(){
  const rows = MRS_ITEMS.map(it=>{
    const v = state.answers[it.id];
    return `<li><span>${it.short}</span><span>${v === null || v === undefined ? 'Sin responder' : SCALE_LABELS[v]}</span></li>`;
  }).join('');
  return `<ul class="report-answers">${rows}</ul>`;
}
/* "Por qué puede pasarte": solo los síntomas en 2 o más (supabase/functions/_shared/notas.js,
   el mismo texto que el PDF y el correo). Sin síntomas en 2 o más, la sección no aparece. */
function whySection(){
  const notes = whyNotes(state.answers);
  if(!notes.length) return '';
  const rows = notes.map(n=>`<li><strong>${n.label}:</strong> ${n.text}</li>`).join('');
  return `<section><h3>${WHY_TITLE}</h3><ul class="card-list">${rows}</ul></section>`;
}
function reportFullHtml(){
  const msg = levelMessage(state.scores);
  const alertNote = hasFlag()
    ? `<p class="card-note"><strong>Marcaste una señal de alerta.</strong> Conviene revisarla con tu médico antes de considerar cualquier tratamiento.</p>` : '';
  return `<details class="report-more" data-seccion="reporte"><summary>Ver el reporte completo</summary><div class="report-full">` +
    `<section>${alertNote}${levelCard(msg)}</section>` +
    `<section><h3>Sobre tu etapa</h3><p>${stageNote()}</p><span class="cite">${PERU_AGE_NOTE} Fuente: Guía HNHU (RD N° 211-2024-DG/HNHU), secciones 5.4 y 6.2.1.</span></section>` +
    whySection() +
    `<section><h3>Recomendaciones de autocuidado</h3>${selfCareBody()}</section>` +
    `<section><h3>Preguntas para tu médico</h3>${consultBody()}</section>` +
    `<section><h3>Tus 11 respuestas</h3>${reportAnswersList()}</section>` +
    `<p class="topics-disclaimer">${DISCLAIMER}</p>` +
    `</div></details>`;
}

/* Resumen del reporte (10.4): Escala MRS, síntoma principal y banderas rojas, con el valor en
   --magenta-text. Síntoma principal = el ítem con el puntaje más alto (el primero si empatan). */
function reportSummary(){
  let top = null;
  MRS_ITEMS.forEach(it=>{ const v = state.answers[it.id]; if(v && (!top || v > state.answers[top.id])) top = it; });
  const flags = hasFlag() ? state.redFlags.length : 0;
  return `<dl class="report-summary">` +
    `<div><dt>Escala MRS</dt><dd>${state.scores.total} de 44</dd></div>` +
    `<div><dt>Síntoma principal</dt><dd>${top ? top.short : 'Ninguno'}</dd></div>` +
    `<div><dt>Banderas rojas</dt><dd>${flags ? `${flags} ${flags === 1 ? 'señal' : 'señales'} de alerta` : 'Ninguna'}</dd></div>` +
    `</dl>`;
}

/* "Compartir con mi médico" (decisión del 4 nov.): comparte o copia el enlace a /reporte, que vence
   a los 30 días, no el PDF de 24 horas. El enlace se pide a send-report recién al tocar el botón
   (SQL 018): si nadie comparte, no se guarda ninguna copia. Si el navegador no deja abrir el menú
   de compartir después de esperar la red, se copia el enlace; si tampoco, se muestra para copiarlo. */
const SHARE_TITLE = 'Mi reporte de Mindi';
const SHARE_COPIED = 'Copiamos el enlace a tu reporte. Vence en 30 días.';
function requestShareLink(){
  return (state.sessionSaved || Promise.resolve()).then(()=> api('report', {action:'share', session_id:SESSION_ID}))
    .then(r=> r && r.ok && r.body && r.body.url ? r.body.url : null);
}
function setupShare(btn){
  if(!BACKEND_ON) return;
  let link = null;
  btn.hidden = false;
  const note = (html)=>{
    let p = btn.nextElementSibling;
    if(!p || !p.classList.contains('report-share-ok')){ p = document.createElement('p'); p.className = 'report-share-ok'; p.setAttribute('role','status'); btn.after(p); }
    p.innerHTML = html;
  };
  btn.addEventListener('click', async ()=>{
    track('report_share_click');
    btn.setAttribute('aria-busy','true');
    link = link || await requestShareLink();
    btn.removeAttribute('aria-busy');
    if(!link){ track('report_share_failed', {error:'link'}); return note('No pudimos crear el enlace. Inténtalo de nuevo en un momento.'); }
    try{
      if(navigator.share){ await navigator.share({title:SHARE_TITLE, url:link}); return track('report_share', {method:'link'}); }
    }catch(e){
      if(e && e.name === 'AbortError') return; // cerró el menú de compartir
    }
    try{
      await navigator.clipboard.writeText(link);
      track('report_share', {method:'copy'});
      note(SHARE_COPIED);
    }catch{
      track('report_share', {method:'manual'});
      note(`Copia este enlace a tu reporte. Vence en 30 días.<br><a href="${link}" target="_blank" rel="noopener">${link}</a>`);
    }
  });
}

/* Del resultado al chat con IA (10.5.1, paso 6): /chat recibe los 4 puntajes y la señal de alerta
   por sessionStorage (solo esta pestaña; sin respuestas una por una ni datos de contacto). */
const RESULT_STORE = 'mindi_resultado';
const ALERT_STORE = 'mindi_alerta';
const SHARE_STORE = 'mindi_compartir'; // aceptó compartir después del resultado
function chatButton(withResult){
  if(!AGENT_ENABLED) return '';
  const label = withResult ? 'Pregúntale a Mindi sobre tu resultado' : 'Pregúntale a Mindi';
  return `<button type="button" class="btn btn-ghost" data-to-chat="${withResult ? 'resultado' : 'filtro'}">${label}</button>`;
}
document.addEventListener('click', (e)=>{
  const b = e.target.closest && e.target.closest('[data-to-chat]');
  if(!b) return;
  const withResult = b.dataset.toChat === 'resultado';
  track('test_to_chat', {source:b.dataset.toChat});
  try{
    if(withResult){
      sessionStorage.setItem(RESULT_STORE, JSON.stringify(agentMrsResult(state.scores, hasFlag())));
      // Solo para el saludo del chat (no va al agente): emergencia (rf2) o evaluación.
      sessionStorage.setItem(ALERT_STORE, hasFlag() ? (state.redFlags.includes('rf2') ? 'emergencia' : 'evaluacion') : '');
      sessionStorage.setItem(SHARE_STORE, state.research ? '1' : '');
    } else { sessionStorage.removeItem(RESULT_STORE); sessionStorage.removeItem(ALERT_STORE); }
  }catch{}
  location.href = '/chat';
});

/* "Descargar PDF" (5 nov. 2026): una descarga real, sin abrir páginas. El PDF se trae por /api/report
   (action 'pdf') apenas aparece el reporte, para que el toque abra el menú de compartir en el acto (iOS
   exige que navigator.share salga directo del gesto). Celular: menú nativo de compartir con el archivo
   (guardar, WhatsApp, correo…) si el navegador comparte archivos; si no, descarga directa. Computadora:
   descarga directa. */
const PDF_NAME = 'reporte-mindi.pdf';
function requestPdfFile(){
  if(!BACKEND_ON) return Promise.resolve(null);
  return (state.sessionSaved || Promise.resolve()).then(()=> fetch('/api/report', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'pdf', session_id:SESSION_ID, name: state.name || undefined}),
  })).then(async r=>{
    const ok = r.ok && (r.headers.get('content-type') || '').includes('application/pdf');
    if(!ok){ track('report_failed', {error:String(r.status), channel:'download'}); return null; }
    track('report_sent', {channel:'download'});
    return new File([await r.blob()], PDF_NAME, {type:'application/pdf'});
  }).catch(()=>{ track('report_failed', {error:'network', channel:'download'}); return null; });
}
function savePdf(file){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = PDF_NAME; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(a.href), 60000);
}
function setupPdfButton(btn, file){
  btn.removeAttribute('aria-disabled');
  btn.setAttribute('role','button'); btn.tabIndex = 0;
  btn.textContent = 'Descargar PDF';
  const canShareFile = isTouch && !!navigator.canShare && (()=>{ try{ return navigator.canShare({files:[file]}); }catch{ return false; } })();
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    if(canShareFile){
      track('report_download', {in_app: IN_APP_BROWSER, method:'share'});
      // Sin await antes: el menú tiene que abrirse con este mismo toque.
      navigator.share({files:[file], title:SHARE_TITLE})
        .then(()=> track('report_share', {method:'file'}))
        .catch((err)=>{ if(!(err && err.name === 'AbortError')) savePdf(file); });
      return;
    }
    savePdf(file);
    track('report_download', {in_app: IN_APP_BROWSER, method:'download'});
  });
}
/* Cada desplegable del resultado y del reporte se mide (result_detail_open {seccion}). */
document.addEventListener('toggle', (e)=>{
  const d = e.target;
  if(d && d.open && d.dataset && d.dataset.seccion) track('result_detail_open', {seccion:d.dataset.seccion});
}, true);

let reportSeq = 0;
function showReport(){
  setSection('Tu reporte');
  const id = 'pdfBtn' + (++reportSeq);
  const inApp = IN_APP_BROWSER
    ? `<p class="report-inapp">Si la descarga no abre aquí, abre esta página en tu navegador (menú ··· › Abrir en el navegador) o recíbelo en tu correo.</p>` : '';
  revealCard(
    `<h3>Tu reporte está listo</h3><p class="card-note">Todo lo que vimos, para llevarlo a tu consulta.</p>` +
    reportSummary() +
    `<div class="report-actions"><a class="btn" id="${id}" aria-disabled="true">Preparando tu PDF…</a></div>` +
    `<div class="report-links"><button type="button" class="link-btn" id="${id}s" hidden>Compartir con mi médico</button></div>` +
    // Con el chat con IA encendido, la duda va al chat (al cierre); apagado, se ofrece WhatsApp.
    `${AGENT_ENABLED ? '' : `<div class="report-actions">${whatsappButton('resultado', 'Tengo una duda sobre mi resultado')}</div>`}` +
    `<div class="report-email" id="${id}e"></div>` +
    inApp + reportFullHtml(), 'report'
  ).then(()=>{
    track('report_shown', {in_app: IN_APP_BROWSER});
    setupShare(document.getElementById(id + 's'));
    requestPdfFile().then(file=>{
      const btn = document.getElementById(id);
      if(!btn) return;
      if(file){
        setupPdfButton(btn, file);
      } else {
        btn.textContent = 'No se pudo preparar el PDF';
        btn.insertAdjacentHTML('afterend', '<p class="card-note">Déjanos tu correo abajo y te enviamos una copia.</p>');
      }
    });
    mountEmailForm(document.getElementById(id + 'e'));
    clearComposer();
    closeFlow();
  });
}

/* Copia opcional por correo, dentro de la tarjeta del reporte (5 nov. 2026): no bloquea el cierre. La casilla
   de avisos va con el correo; la de investigación ya se respondió en la bienvenida (consentimiento-inicio). */
function mountEmailForm(box){
  if(!box || !BACKEND_ON) return;
  const form = document.createElement('form');
  form.className = 'email-offer';
  form.noValidate = true;
  form.innerHTML =
    `<p class="email-title"><strong>Recíbelo también en tu correo</strong>, para no perderlo:</p>` +
    `<div class="inputRow"><input type="email" name="email" placeholder="correo@ejemplo.com" autocomplete="email" aria-label="Tu correo">` +
    `<button type="submit" class="sendBtn" aria-label="Enviarme una copia">${ICON_SEND}</button></div>` +
    `<p class="hint">Usaremos tu correo solo para enviarte una copia de tu reporte.</p>` +
    `<label class="opt"><input type="checkbox" name="news"><span>(Opcional) También quiero que Mindi me avise por correo cuando lance su acompañamiento.</span></label>`;
  box.appendChild(form);
  const captcha = mountTurnstile(tsBox);
  const input = form.elements.email;
  const showErr = (text)=>{
    let err = form.querySelector('.hint.err');
    if(!err){ err = document.createElement('p'); err.className = 'hint err'; err.setAttribute('role','alert'); form.querySelector('.inputRow').after(err); }
    err.textContent = text;
  };
  form.onsubmit = async (e)=>{
    e.preventDefault();
    const v = input.value.trim();
    if(!validEmail(v)) return showErr(v ? 'Revisa el correo.' : 'Escribe tu correo.');
    const btn = form.querySelector('.sendBtn');
    btn.disabled = true;
    const token = await captcha.token(); // casi siempre ya está listo: Turnstile corre al aparecer el formulario
    const news = form.elements.news.checked;
    // Solo se confirma cuando el servidor lo acepta (antes decía "Listo" aunque fallara la verificación).
    const r = await sendLead({email:v, news, research:false, turnstile:token});
    if(!(r && r.ok)){
      btn.disabled = false;
      captcha.reset && captcha.reset();
      return showErr(r && r.status === 403 ? 'No pudimos verificar que no eres un robot. Inténtalo de nuevo en unos segundos.' : 'No pudimos enviarlo ahora. Inténtalo de nuevo en un momento.');
    }
    captcha.remove();
    state.contact = v;
    track('lead', {captured:true, news});
    form.innerHTML = '<p class="email-done" role="status">Listo, te llegará en unos minutos.</p>';
  };
}

/* Mide cómo se sintió la conversación en sí (distinto de si pagaría) — se guarda como
   evento, sin necesidad de tocar el esquema de Supabase.
   Excepción deliberada a "sin emojis" del sistema de diseño (ver renderFaceScale). */
/* cierre-v2 (5 nov. 2026): la satisfacción va antes del reporte, con "Prefiero no responder" visible.
   El reporte no depende de responder. */
const SATISFACTION_QUESTION = 'Mientras preparamos tu reporte: ¿te sirvió este resultado?';
function askSatisfaction(next){
  setSection('¿Te sirvió?');
  addCard(`<h3>${SATISFACTION_QUESTION}</h3>`, '');
  renderFaceScale((score, label)=>{
    state.satisfaction = label;
    track('satisfaction', {answer:label, score});
    const reply = score >= 3 ? 'Qué bueno, gracias.'
      : score === 2 ? 'Gracias, lo tomo en cuenta.'
      : 'Gracias, de verdad ayuda a mejorar.';
    botSay([reply]).then(next);
  });
  const skip = document.createElement('div');
  skip.className = 'chips suggestRow';
  skip.innerHTML = '<button type="button" class="chip quiet">Prefiero no responder</button>';
  skip.querySelector('button').onclick = ()=>{
    addBubble('Prefiero no responder', 'user'); advance(); clearComposer();
    track('satisfaction_skip');
    next();
  };
  composer.appendChild(skip);
  scrollBottom();
}

/* Cierre: aparece siempre debajo del reporte, deje o no su correo. */
function closeFlow(){
  botSay(['Fue un gusto. Cuídate mucho.']).then(()=> channelInvite('final')).then(()=> afterGuided(true));
}

/* Oculta el degradado del carrusel de síntomas cuando ya no hay más hacia dónde
   deslizar (por scroll o llegando al final) — mientras sí haya, queda visible como
   señal de que hay más tarjetas fuera de vista. */
const symptomsEl = document.getElementById('symptoms');
if(symptomsEl){
  const symptomsWrap = symptomsEl.closest('.symptoms-wrap');
  const syncSymptomsFade = () => {
    const atEnd = symptomsEl.scrollLeft + symptomsEl.clientWidth >= symptomsEl.scrollWidth - 4;
    symptomsWrap.classList.toggle('at-end', atEnd);
  };
  symptomsEl.addEventListener('scroll', syncSymptomsFade, {passive:true});
  window.addEventListener('resize', syncSymptomsFade);
  syncSymptomsFade();
}

/* ---------- Al terminar el test ----------
   El test (claro) y el chat con IA (oscuro) son sesiones separadas (10.5): la conversación no sigue
   libre aquí. Al final se ofrece ir a /chat, con el resultado si lo hay (10.5.1, paso 6). */
function afterGuided(withResult){
  const cta = chatButton(withResult);
  if(!cta) return;
  const row = document.createElement('div');
  row.className = 'row bot';
  row.innerHTML = `<div class="chat-cta">${cta}</div>`;
  chat.appendChild(row);
  scrollBottom();
}

/* ---------- Chat con IA: /chat (tema oscuro, 10.5 y 10.5.1) ----------
   Solo con AGENT_ENABLED. El agente primero responde la duda y, si corresponde, devuelve la acción
   recommend_test: aquí se dibuja el botón "Haz el test de 5 min →", que abre /test?origen=chat en
   esta pestaña con una sesión nueva. El test nunca se hace dentro del chat. La web también aplica
   las reglas del agente: como máximo dos veces y nunca si ya hay resultado. */
const MAX_TEST_RECOMMENDATIONS = 2;
let chatSource = 'landing';  // 'landing' (sin test) o 'resultado' (con resultado_mrs)
let chatResult = null;
let testRecommendations = 0;

/* Lo que dejó el resultado en sessionStorage: solo 4 puntajes y la señal (el servidor lo valida). */
function storedResult(){
  try{
    const r = JSON.parse(sessionStorage.getItem(RESULT_STORE) || 'null');
    const ok = r && ['total','somatico','psicologico','urogenital'].every(k=> Number.isFinite(r[k]));
    return ok ? {total:r.total, somatico:r.somatico, psicologico:r.psicologico, urogenital:r.urogenital, senal_alerta:r.senal_alerta === true} : null;
  }catch{ return null; }
}

let chatShareCtx = {}, chatShareOn = false, chatShareVersion = SHARE_QUESTIONS_VERSION;
function setChatShare(on, version){
  chatShareOn = !!on;
  if(version) chatShareVersion = version;
  agentClient.setContext(chatShareOn ? {...chatShareCtx, compartir:true, consent_text_version:chatShareVersion} : {...chatShareCtx});
  document.querySelectorAll('[data-share-toggle]').forEach(b=>{ b.textContent = chatShareOn ? SHARE_STOP_LABEL : SHARE_START_LABEL; });
}
/* Compartir las preguntas sin cortar la conversación (5 nov. 2026):
   - Bajo el saludo, en la letra chica: "Compartir mis preguntas" (y luego "Dejar de compartir").
   - Al salir (botón "Salir") o tras 2 min sin escribir, una sola pregunta: "Antes de irte…".
   Si acepta (en cualquiera de los dos), se guardan las preguntas de ESTA conversación, que hasta entonces
   solo estaban en la memoria del navegador; si no, se descartan. */
const SHARE_STOP_LABEL = 'Dejar de compartir', SHARE_START_LABEL = 'Compartir mis preguntas';
const SHARE_END_VERSION = 'chat-fin-v1';
const SHARE_END_ASK = 'Antes de irte: ¿nos dejas guardar las preguntas de hoy, sin tus datos, para mejorar Mindi?';
let chatPending = []; // preguntas aún no compartidas (solo en memoria)
let chatShareAsked = false, idleT = null;
function flushPending(version){
  if(!chatPending.length) return Promise.resolve();
  const preguntas = chatPending.splice(0);
  return api('agent', {action:'share', preguntas, consent_text_version:version, is_test:TEST_MODE});
}
function shareLabel(){ return chatShareOn ? `✓ Compartes tus preguntas · <button type="button" class="link-btn share-toggle" data-share-toggle>${SHARE_STOP_LABEL}</button>`
  : `No compartes tus preguntas · <button type="button" class="link-btn share-toggle" data-share-toggle>${SHARE_START_LABEL}</button>`; }
function syncShareLine(){ document.querySelectorAll('.share-line').forEach(el=>{ el.innerHTML = shareLabel(); }); }
document.addEventListener('click', (e)=>{
  const b = e.target.closest && e.target.closest('[data-share-toggle]');
  if(!b) return;
  const on = !chatShareOn;
  setChatShare(on, on ? SHARE_QUESTIONS_VERSION : null);
  if(on) flushPending(SHARE_QUESTIONS_VERSION); else chatPending = [];
  chatShareAsked = true; // ya decidió: no se le pregunta al final
  syncShareLine();
  track('chat_share_change', {captured: on});
});
function askShareAtEnd(){
  if(!CHAT_RESEARCH_ENABLED || chatShareOn || chatShareAsked || !chatPending.length) return Promise.resolve();
  chatShareAsked = true; clearTimeout(idleT);
  return new Promise(resolve=>{
    const row = document.createElement('div');
    row.className = 'row bot';
    row.innerHTML = `<div class="share-ask"><p>${SHARE_END_ASK}</p>` +
      `<div class="chips"><button type="button" class="chip primary" data-ans="si">Sí, compartir</button><button type="button" class="chip" data-ans="no">No, gracias</button></div></div>`;
    row.querySelectorAll('[data-ans]').forEach(btn=> btn.onclick = async ()=>{
      const yes = btn.dataset.ans === 'si';
      track('chat_share', {captured: yes, desde:'final'});
      if(yes){ setChatShare(true, SHARE_END_VERSION); await flushPending(SHARE_END_VERSION); syncShareLine(); }
      else chatPending = [];
      row.querySelector('.chips').outerHTML = `<p class="share-done" role="status">${yes ? 'Gracias. Guardamos tus preguntas sin tus datos.' : 'Está bien, no guardamos tus preguntas.'}</p>`;
      resolve(yes);
    });
    chat.insertBefore(row, composer && composer.parentNode === chat ? composer : null); // sobre el campo de escribir
    scrollBottom();
  });
}
function armIdleAsk(){ clearTimeout(idleT); if(CHAT_RESEARCH_ENABLED && !chatShareOn && !chatShareAsked) idleT = setTimeout(askShareAtEnd, 120000); }
let chatAccepted = false;
function storedShare(){ try{ return sessionStorage.getItem(SHARE_STORE) === '1'; }catch{ return false; } }
function storedAlertType(){ try{ return sessionStorage.getItem(ALERT_STORE) || null; }catch{ return null; } }

function openAiChat(){
  aiMode = true;
  document.body.classList.add('chat-ai');
  chatResult = storedResult();
  chatSource = chatResult ? 'resultado' : 'landing';
  // ?tema=peso | trabajo (tarjetas de la portada): saludo propio y la etiqueta para el agente.
  const topic = chatTopic(new URLSearchParams(location.search).get('tema'));
  openChatShell();
  setStatus(false);
  agentClient.setResult(chatResult);
  agentClient.setTopic(topic);
  agentClient.warm();
  track('agent_open', {source:chatSource});
  track('chat_open', {tema: topic || 'ninguno'});
  // Etiquetas para chat_topics: nivel del test (si vino del resultado) y si llegó por ?tema=.
  const nivel = chatResult ? (chatResult.senal_alerta ? 'alert' : mrsLevel(chatResult)) : null;
  const ctx = {...(nivel ? {nivel} : {}), desde_tema: !!topic, is_test: TEST_MODE};
  agentClient.setContext(ctx);
  // Saludo (con el 106 si es emergencia); debajo, la tarjeta "Antes de empezar" al estilo de los chats de
  // servicio: política, términos y, si no aceptó en el resultado, compartir sus preguntas. Dos botones: el de
  // compartir destacado y "Aceptar sin compartir" (el chat no depende de compartir: consentimiento libre).
  chatShareCtx = ctx;
  if(CHAT_RESEARCH_ENABLED && storedShare()){ setChatShare(true, RESEARCH_VERSION); chatShareAsked = true; } // aceptó en el resultado
  const greeting = chatGreeting(chatResult, storedAlertType(), topic);
  botSay([greeting.text]).then(()=>{
    // Tarjeta al estilo Geocito (5 nov. 2026): un solo botón "Aceptar" dentro de la tarjeta. Debajo, un enlace
    // discreto "Prefiero no compartir mis preguntas": el chat no depende de compartir (consentimiento libre).
    const share = CHAT_RESEARCH_ENABLED;
    const row = document.createElement('div');
    row.className = 'row bot consent-row';
    row.innerHTML = `<div class="consent-card">` +
      `<p class="consent-h">Para poder ayudarte, revisa esta información por favor:</p>` +
      `<p><em>Política de privacidad</em><br>Autorizo que Mindi procese mis mensajes con inteligencia artificial (OpenAI) para responderme` +
      (share ? ` y que guarde mis preguntas, sin mis datos de contacto, para mejorar Mindi` : '') +
      `. <a href="/privacidad" target="_blank" rel="noopener">mindifem.com/privacidad</a></p>` +
      `<p><em>Términos y condiciones</em><br>Estoy de acuerdo con los Términos y condiciones que regulan el uso de Mindi. <a href="/terminos" target="_blank" rel="noopener">mindifem.com/terminos</a></p>` +
      `<p>Mindi te orienta, pero no reemplaza a tu médico. Si es una emergencia, llama al 106.</p>` +
      `<p>Al tocar Aceptar, confirmas que has leído y aceptas ambas políticas.</p>` +
      `<button type="button" class="consent-accept" data-accept>Aceptar</button></div>` +
      (share && !chatShareOn ? `<button type="button" class="link-btn consent-optout" data-accept="sin">Prefiero no compartir mis preguntas</button>` : '');
    chat.appendChild(row);
    clearComposer();
    scrollBottom();
    row.querySelectorAll('[data-accept]').forEach(btn=> btn.onclick = ()=>{
      const sin = btn.dataset.accept === 'sin';
      acceptChat();
      chatShareAsked = true;
      if(share && !chatShareOn && !sin) setChatShare(true, SHARE_ACCEPT_VERSION);
      if(share) track('chat_share', {captured: chatShareOn, desde:'inicio_chat'});
      row.querySelectorAll('[data-accept]').forEach(x=> x.remove());
      row.querySelector('.consent-card').insertAdjacentHTML('beforeend', `<p class="consent-done">✓ Aceptado</p>`);
      if(share){
        const st = document.createElement('div');
        st.className = 'row bot'; st.innerHTML = `<p class="share-line consent-status">${shareLabel()}</p>`;
        chat.appendChild(st);
      }
      chatSuggestions = greeting.suggestions;
      renderQuestionInput();
    });
    if(!isTouch) row.querySelector('[data-accept]').focus({preventScroll:true});
  });
}
const SHARE_ACCEPT_VERSION = 'chat-v2'; // tarjeta de un botón: el texto de la política incluye guardar las preguntas
let chatSuggestions = [];
function acceptChat(){
  if(chatAccepted) return;
  chatAccepted = true;
  track('agent_consent', {source:chatSource});
}

function renderQuestionInput(){
  clearComposer();
  const form = document.createElement('form');
  form.className = 'inputRow free-input';
  form.innerHTML = `<input type="text" maxlength="1000" placeholder="Escribe tu duda…" aria-label="Escribe tu duda" autocomplete="off">` +
    `<button type="submit" class="sendBtn" aria-label="Enviar">${ICON_SEND}</button>`;
  const input = form.querySelector('input');
  form.onsubmit = (e)=>{ e.preventDefault(); const t = input.value.trim(); if(t){ acceptChat(); chatSuggestions = []; askAgent(t); } };
  // Sugerencias (solo hasta la primera pregunta): un toque acepta y envía.
  if(chatSuggestions.length){
    const wrap = document.createElement('div');
    wrap.className = 'chips chat-suggest';
    chatSuggestions.forEach((q, n)=>{
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'chip'; btn.textContent = q;
      btn.onclick = ()=>{ acceptChat(); chatSuggestions = []; track('chat_suggestion', {q: n === 0 ? 'resultado' : 'sentirme_mejor'}); askAgent(q); };
      wrap.appendChild(btn);
    });
    composer.appendChild(wrap);
  }
  composer.appendChild(form);
  scrollBottom();
  if(!isTouch) input.focus({preventScroll:true});
}

function addAgentBubble(text){
  const row = document.createElement('div');
  row.className = 'row bot';
  row.innerHTML = `<div class="bubble agent-reply">${agentHtml(text)}</div>`;
  chat.appendChild(row);
  scrollBottom();
}

/* Botón dentro del chat, justo debajo de la respuesta (10.5.1, paso 3). */
function recommendTest(){
  if(chatResult || testRecommendations >= MAX_TEST_RECOMMENDATIONS) return;
  testRecommendations++;
  const row = document.createElement('div');
  row.className = 'row bot';
  row.innerHTML = `<div class="chat-cta"><a class="btn" href="/test?origen=chat" data-chat-to-test>Haz el test de 5 min →</a></div>`;
  chat.appendChild(row);
  scrollBottom();
  track('chat_test_recommended', {n:testRecommendations});
}
document.addEventListener('click', (e)=>{
  if(!(e.target.closest && e.target.closest('[data-chat-to-test]'))) return;
  track('chat_to_test');
  releaseSessionId(); // el test va en una sesión nueva
  try{ sessionStorage.removeItem(RESULT_STORE); }catch{}
});

/* Si el agente falla o no responde a tiempo: mensaje y WhatsApp en la conversación, y se puede
   volver a preguntar. */
function agentFallback(text){
  addCard(`<p>${text}</p>` + (whatsappButton('agente') ? `<div class="card-actions">${whatsappButton('agente')}</div>` : ''), '');
}

let agentAnswered = false; // hasta la primera respuesta, el aviso de espera
let agentReplies = 0;
/* Éxito del chat (6 nov. 2026): "¿Te sirvió?" UNA vez por conversación, después de la 2.ª respuesta de
   Mindi; desaparece al tocarlo. Solo el voto y el área: nunca el texto. */
function askFeedback(area){
  const row = document.createElement('div');
  row.className = 'row bot fb-row';
  row.innerHTML = `<div class="fb-ask" role="group" aria-label="¿Te sirvió esta respuesta?"><span>¿Te sirvió esta respuesta?</span>` +
    `<button type="button" class="fb-btn" data-fb="si">Sí</button><span aria-hidden="true">·</span><button type="button" class="fb-btn" data-fb="no">No</button></div>`;
  row.querySelectorAll('[data-fb]').forEach(b=> b.onclick = ()=>{
    track('agent_feedback', {answer: b.dataset.fb, area, source:chatSource});
    row.remove();
  });
  chat.appendChild(row);
  scrollBottom();
}
async function askAgent(text, {echo = true} = {}){
  if(echo) addBubble(text.slice(0, 1000), 'user');
  clearComposer();
  if(agentClient.limitReached){ track('agent_limit', {source:chatSource}); agentFallback(LIMIT_TEXT); return renderQuestionInput(); }
  showTyping(agentAnswered ? '' : FIRST_WAIT_TEXT);
  const t0 = performance.now();
  try{
    const reply = await agentClient.ask(text.slice(0, 1000));
    agentAnswered = true;
    hideTyping();
    addAgentBubble(reply.text);
    agentReplies++;
    track('agent_message', {source:chatSource, area:reply.area || 'otro'});
    track('agent_latency', {ms: Math.round(performance.now() - t0), n: agentReplies}); // tiempo hasta la respuesta (arranque en frío)
    if(reply.action === 'recommend_test') recommendTest();
    if(agentReplies === 2) askFeedback(reply.area || 'otro');
  }catch(e){
    hideTyping();
    track('agent_error', {source:chatSource, code:e.status || 0});
    agentFallback(ERROR_TEXT);
  }
  renderQuestionInput();
}

/* ---------- Entrada ----------
   La landing (/) y el chat no se muestran a la vez: /test abre el test y /chat el chat con IA
   (vercel.json reescribe las dos rutas a index.html; #conversar sigue funcionando). */
const PATH = location.pathname.replace(/\/+$/, '') || '/';
const APP_VIEW = PATH === '/test' || PATH === '/chat' || location.hash === '#conversar';
// Los botones se conectan antes de abrir /chat: openAiChat quita la tarjeta de inicio (y su botón).
document.getElementById('restartBtn').addEventListener('click', ()=>{ track('restart'); location.hash = 'conversar'; location.reload(); });
document.getElementById('exitBtn').addEventListener('click', async ()=>{
  if(aiMode && CHAT_RESEARCH_ENABLED && !chatShareOn && !chatShareAsked && chatPending.length){ await askShareAtEnd(); await new Promise(r=> setTimeout(r, 900)); }
  location.href = '/';
});
document.getElementById('startBtn').addEventListener('click', ()=>{
  track('cta_click',{source:'chat'});
  if(!started){
    track('consent_accept',{version:CONSENT_VERSION});
  }
  start();
});
/* Llega desde el chat (?origen=chat): bienvenida de reencuentro. */
if(TEST_ORIGEN === 'chat'){
  const p = document.querySelector('#chatStart .start-welcome');
  if(p){ p.textContent = START_WELCOME_FROM_CHAT; document.querySelector('#chatStart h3').textContent = 'Hola de nuevo'; }
}
if(APP_VIEW){
  document.body.classList.remove('landing-view');
  document.body.classList.add('app-view');
  setFocus(true);
  if(PATH === '/chat' && AGENT_ENABLED){ track('cta_click', {source:'ruta_chat'}); openAiChat(); }
}

/* ---------- Landing (src/landing.js) ---------- */
if(!APP_VIEW){
  const digits = WHATSAPP_NUMBER.replace(/\D/g, '');
  initLanding({
    track, api, mountTurnstile, backendOn:BACKEND_ON, consentVersion:CONSENT_VERSION, isTest:TEST_MODE, origin:ORIGIN,
    chatAvailable:AGENT_ENABLED,
    whatsappHref:whatsappUrl(WHATSAPP_NUMBER, WHATSAPP_TEXT.landing),
    whatsappDisplay: digits.length === 11 && digits.startsWith('51') ? `+51 ${digits.slice(2,5)} ${digits.slice(5,8)} ${digits.slice(8)}` : (digits ? '+' + digits : ''),
  });
}

track('page_view');

