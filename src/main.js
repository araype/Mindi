import './landing.css';
// Puntaje MRS y cortes de la Guía HNHU: un solo módulo compartido con send-report y los tests.
import {
  computeScores as mrsScores, computeLevel as mrsLevel, levelMessage, CUTS,
  AREAS, areaStatus, AREA_TAG, SKIPPED_INTIMATE_NOTE, doctorRecommendation,
} from '../supabase/functions/_shared/mrs.js';
import { selfCareItems, SELF_CARE_SOURCE } from '../supabase/functions/_shared/autocuidado.js';
import { stageFilter, STAGE_EXIT } from './etapa.js';

/* ---------- Medición (hooks listos para conectar a analítica real) ---------- */
/* ---------- Backend (Supabase vía REST, solo INSERT con la clave pública) ----------
   Los valores vienen de .env (VITE_*). Vacío = modo prototipo (no envía nada). */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const CONSENT_VERSION = import.meta.env.VITE_CONSENT_VERSION || 'v1';
const BACKEND_ON = !!(SUPABASE_URL && SUPABASE_KEY);
/* Marca cada sesión como de prueba. VITE_TEST_MODE es el interruptor general (en
   producción ya está en false: cuenta como real por defecto). Aparte, ?test=<lo que sea>
   en la URL fuerza is_test:true para ESA sesión sin importar VITE_TEST_MODE — es el link
   que se comparte entre el equipo para seguir probando sin mezclarse con usuarias reales,
   sin tocar variables de entorno ni desplegar. Cualquier valor sirve (?test=1, ?test=ara,
   ?test=lo-que-sea): no hace falta que sea exactamente "1" — se guarda tal cual en los
   eventos (campo "tester") por si más adelante quieren ver quién probó qué.
   Ej.: mindi-beta.vercel.app/?test=ara y mindi-beta.vercel.app/?test=compa
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
const SESSION_ID = newId(); // anónimo, vive solo en memoria de esta visita

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

function sb(table, row){
  if(!BACKEND_ON) return Promise.resolve(false);
  return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Prefer':'return=minimal'},
    body:JSON.stringify(row),
    keepalive:true,
  }).then(r=>r.ok).catch(()=>false);
}

window.dataLayer = window.dataLayer || [];
function track(event, props){
  const payload = Object.assign({event:'mindi_'+event, ts:Date.now()}, props||{});
  window.dataLayer.push(payload);
  if(window.console) console.debug('[mindi]', payload);
  const base = {is_test:TEST_MODE};
  if(TEST_PARAM) base.tester = TEST_PARAM;
  if(ORIGIN) base.origin = ORIGIN;
  sb('events', {session_id:SESSION_ID, name:event, props:Object.assign(base, props||{})});
}

function saveSession(level){
  const s = state.scores;
  state.sessionSaved = sb('sessions', {
    id:SESSION_ID,
    age_range:state.age, cycle:state.cycle,
    smoking:state.smoking, obesity:state.obesity, family_breast_ca:state.familyBreastCa,
    migraine:state.migraine, current_treatment:state.currentTreatment,
    answers:state.answers,
    score_somatico:s.somatico, score_psicologico:s.psicologico, score_urogenital:s.urogenital, score_total:s.total,
    level, red_flags:state.redFlags, skipped_intimate:state.skippedIntimate,
    is_test:TEST_MODE,
  });
}
function saveLead(news){
  if(!state.contact) return Promise.resolve();
  const lead = {session_id:SESSION_ID, name:state.name || null, contact:state.contact, consent:true, consent_text_version:CONSENT_VERSION, is_test:TEST_MODE};
  // Espera a que la sesión exista (clave foránea) antes de guardar el contacto. Si la columna
  // opt_news aún no existe (015 sin correr), se reintenta sin ella: nunca se pierde el correo.
  return (state.sessionSaved || Promise.resolve()).then(()=>
    sb('leads', {...lead, opt_news:!!news}).then(ok => ok || sb('leads', lead)));
}
/* Casilla de investigación: una fila sin nombre ni contacto (research_consents, SQL 015). */
function saveResearchConsent(){
  return (state.sessionSaved || Promise.resolve()).then(()=>
    sb('research_consents', {session_id:SESSION_ID, consent_text_version:CONSENT_VERSION, is_test:TEST_MODE}));
}

/* Pide a la Edge Function `send-report` que envíe una copia del reporte por correo.
   Se llama solo después de que la sesión y el lead ya quedaron guardados en Supabase,
   porque la función los lee de ahí (nunca recibe respuestas ni contacto por este canal). */
function requestReport(){
  if(!BACKEND_ON) return;
  fetch(`${SUPABASE_URL}/functions/v1/send-report`, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY},
    body:JSON.stringify({session_id:SESSION_ID}),
  }).then(r=>r.json()).then(res=>{
    if(res && res.ok) track('report_sent', {channel:res.channel});
    else track('report_failed', {error: (res && res.error) || 'unknown'});
  }).catch(()=> track('report_failed', {error:'network'}));
}

/* El PDF que toda usuaria puede descargar al terminar (con el apodo que haya escrito, si
   escribió alguno). No guarda lead ni fila en `reports`. → Promise<url del PDF | null>. */
function requestDownloadOnly(){
  if(!BACKEND_ON) return Promise.resolve(null);
  return (state.sessionSaved || Promise.resolve()).then(()=>
    fetch(`${SUPABASE_URL}/functions/v1/send-report`, {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY},
      body:JSON.stringify({session_id:SESSION_ID, name: state.name || undefined, download_only:true}),
    })
  ).then(r=>r.json()).then(res=>{
    if(res && res.ok && res.pdfUrl){ track('report_sent', {channel:'download'}); return res.pdfUrl; }
    track('report_failed', {error:(res && res.error) || 'unknown', channel:'download'});
    return null;
  }).catch(()=>{ track('report_failed', {error:'network', channel:'download'}); return null; });
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
let started = false;
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
function syncFocus(){ if(started && !focusDismissed) setFocus(true); }
function setProgress(n){ progressFill.style.width = Math.min(100, Math.round((n/TOTAL_STEPS)*100)) + '%'; }
function advance(){ step++; setProgress(step); }
function scrollBottom(){ requestAnimationFrame(()=>{ chat.scrollTop = chat.scrollHeight; }); }

/* Teclado en mobile: en pantallas táctiles no se enfoca el campo de texto solo (abriría el
   teclado encima de la pregunta antes de que la usuaria la lea) — lo abre ella al tocarlo.
   Y cuando el teclado aparece, el chat se achica al área visible (--app-h / --app-top, ver
   landing.css) y baja al final, para que la pregunta y el campo queden justo encima.
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

/* more: [{q, a, id}] — explicaciones que se abren al tocarlas ("¿Qué significa esto?",
   "¿Qué es el aura?"), para que el texto extra no aparezca entre pregunta y pregunta. */
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
  (more || []).forEach(({q, a, id})=>{
    const d = document.createElement('details');
    d.className = 'more';
    const s = document.createElement('summary');
    s.textContent = q;
    const p = document.createElement('span');
    p.className = 'more-body';
    p.textContent = a;
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
}
function showTyping(){
  const row = document.createElement('div');
  row.className = 'row bot'; row.id = 'typingRow';
  row.setAttribute('aria-hidden','true');
  row.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  chat.appendChild(row); scrollBottom();
}
function hideTyping(){ const t = document.getElementById('typingRow'); if(t) t.remove(); }

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
  await revealCardWithPause(null,                                         levelCard(msg), BAND_KIND[msg.band], false, 'Ver mis resultados por área');
  await revealCardWithPause('Así se ve por áreas:',                        areasCard(),         '',      false, '¿Y qué hago con esto?');
  await revealCardWithPause('Preguntas para tu médico(a):',                consultCard(),       '',      false, 'Muy útil, ¿algo más?');
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
    btn.innerHTML = `<span>${label}</span><span class="scale-badge s${val}">${val}</span>`;
    btn.onclick = ()=>{
      stopScaleKeys();
      if(!heading){ addBubble(label, 'user'); advance(); }
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
async function start(){
  if(started) return;
  started = true;
  track('chat_start');
  const s = document.getElementById('chatStart'); if(s) s.remove();
  document.querySelector('.chat-shell').classList.remove('idle');
  chatMeta.hidden = false;
  setSection('Bienvenida');
  syncFocus();
  setProgress(1);
  // La bienvenida y el consentimiento ya se vieron en la tarjeta de inicio (index.html):
  // aquí solo queda el aviso de emergencias, en una línea, y la primera pregunta.
  await botSay(['Si es una emergencia, llama al 106.']);
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
  botSay([{text:'En los últimos 12 meses, ¿cómo ha estado tu periodo?', cls:'question', more:[
    {id:'p2', q:'¿Qué es una histerectomía?', a:'Es la cirugía en la que se retira el útero. Después de ella ya no hay regla.'},
  ]}]).then(()=>{
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
    return 'Como te hicieron una histerectomía, no se puede ubicar tu etapa por los cambios del ciclo — eso se conversa mejor con tu médico(a), tomando en cuenta tus síntomas.';
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
  return 'Tu ciclo sigue regular, aunque desde los 45 años es común que otros síntomas empiecen antes que los cambios en la regla. Vale la pena comentarlo con tu médico(a) igual.';
}
const PERU_AGE_NOTE = 'En Perú, la edad promedio de la menopausia es 47 años — cada cuerpo tiene su propio ritmo, así que esto es orientativo.';

/* Filtro de etapa (src/etapa.js): una menor de 40 nunca llega al test ni ve un puntaje. */
function afterStageQuestions(){
  const exit = stageFilter(state.age, state.cycle);
  if(exit === STAGE_EXIT.continue) return startDomain('somatico');
  track('stage_filter_exit', {segment:exit});
  showStageExit(exit);
}

const STAGE_EXIT_CARD = {
  [STAGE_EXIT.under40Regular]: {kind:'calm',
    title:'Mindi está pensada para mujeres desde los 40',
    body:'Las preguntas y el puntaje de Mindi miden los cambios de la transición a la menopausia, que suelen empezar después de los 40. Con un ciclo regular antes de esa edad no aplican, así que no te mostraré un puntaje.'},
  [STAGE_EXIT.under40Irregular]: {kind:'notice',
    title:'Te recomendamos consultar con un médico',
    body:'Antes de los 40, los cambios en la regla deben evaluarse con tu ginecóloga u obstetra, para encontrar la causa. Por eso no te mostraré un puntaje: las preguntas de Mindi están pensadas para mujeres desde los 40.'},
};
function showStageExit(segment){
  setSection('Sobre tu etapa');
  const c = STAGE_EXIT_CARD[segment];
  revealCard(`<h3>${c.title}</h3><p>${c.body}</p>`, c.kind).then(()=> askInterest(segment));
}

/* Lista de interés de quienes salen por el filtro: solo correo + segmento (tabla
   interest_signups, SQL 015). No hay sesión ni respuestas de salud guardadas. */
function askInterest(segment){
  setSection('Lista de interés');
  botSay([{text:'¿Quieres que te avisemos cuando Mindi tenga algo para tu etapa?', cls:'question'}]).then(()=>{
    renderTextInput('correo@ejemplo.com', {
      inputType:'email',
      skipLabel:'No, gracias',
      validate:validEmail,
      errorText:'Revisa el correo, o elige "No, gracias".',
      hint:'Usaremos tu correo solo para avisarte de novedades de Mindi.',
    }, (val)=>{
      setProgress(TOTAL_STEPS);
      if(val){
        sb('interest_signups', {contact:val, segment, consent:true, consent_text_version:CONSENT_VERSION, is_test:TEST_MODE});
        track('interest_signup', {segment});
        botSay(['Listo, te avisaremos. Cuídate.']);
      } else {
        track('interest_skip', {segment});
        botSay(['Está bien. Cuídate mucho.']);
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
  botSay(['Ahora, unas preguntas de contexto.', {text:'¿Fumas actualmente?', cls:'question', more:[
    {id:'ctx_fuma', q:'¿Por qué te pregunto esto?', a:'No suma puntos. Algunos hábitos y antecedentes cambian qué tratamiento suele preferirse, y así tu reporte lo incluye.'},
  ]}]).then(()=>{
    renderChips([{label:'No fumo'},{label:'Fumo ocasionalmente'},{label:'Fumo a diario'},{label:'Fumaba antes, ya no'}],
      (v)=>{ state.smoking = v; track('answer',{q:'ctx_fuma'}); askObesity(); });
  });
}
function askObesity(){
  botSay([{text:'¿Un médico te ha dicho alguna vez que tienes obesidad (IMC entre 30 y 40)?', cls:'question', more:[
    {id:'ctx_imc', q:'¿Qué es el IMC?', a:'El índice de masa corporal relaciona tu peso con tu talla: peso en kilos dividido entre la talla en metros al cuadrado. Entre 30 y 40 se considera obesidad.'},
  ]}]).then(()=>{
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
  botSay([{text:'¿Sufres de migrañas?', cls:'question', more:[
    {id:'ctx_aura', q:'¿Qué es el aura?', a:'Son señales que aparecen antes del dolor de cabeza y duran unos minutos: destellos, luces o líneas en zigzag, o un hormigueo en la cara o la mano.'},
  ]}]).then(()=>{
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
  botSay(['Por último, algo de seguridad.', {text:'¿Tienes alguno de estos antecedentes? Marca todo lo que aplique.', cls:'question', more:[
    {id:'rf_terminos', q:'¿Qué significan algunos términos?', a:'ACV: un derrame o infarto cerebral. Hormono-dependiente: un cáncer que crece con las hormonas, como algunos de mama o de endometrio.'},
  ]}]).then(()=>{
    renderMultiSelect(RED_FLAGS, (selected)=>{
      state.redFlags = selected;
      computeScores();
      saveSession(hasFlag() ? 'alert' : computeLevel());
      track('redflags_answered',{any: selected.length>0 && !selected.includes('none')});
      if(hasFlag()) showSafetyMessage(); else showResultsTopics();
    }, 'none');
  });
}

function computeScores(){ Object.assign(state.scores, mrsScores(state.answers)); }

function hasFlag(){ return state.redFlags.length && !state.redFlags.includes('none'); }

/* ---------- Lo que se detectó: contenido de cada "tema" desplegable ---------- */
/* AREAS (etiqueta, máximo y corte de cada subescala) viene del módulo compartido. */
function areasCard(){
  const s = state.scores;
  const rows = AREAS.map(a=>{
    const v = s[a.key];
    const pct = Math.round((v/a.max)*100);
    const status = areaStatus(a.key, v, state.skippedIntimate);
    const notable = status === 'over';
    const desc = AREA_TAG.user[status];
    return `<div class="area">
      <div class="area-top">
        <span class="area-name"><strong>${a.label}</strong></span>
        <span class="area-tag ${notable ? 'hi' : ''}">${desc}</span>
      </div>
      <div class="meter-wrap">
        <div class="meter" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <span style="width:${pct}%" class="${notable ? 'hi' : ''}"></span>
        </div>
        <span class="meter-pct">${pct}%</span>
      </div>
    </div>`;
  }).join('');
  let html = `<h3>Lo que noto por áreas</h3><p class="card-note">Evaluación gráfica de conjunto según la Escala MRS (Menopause Rating Scale), no una calificación.</p>${rows}`;
  if(s.psicologico >= CUTS.psicologico){
    html += `<div class="area-note">
      <div class="area-note-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <strong>Sobre tu bienestar emocional</strong>
      </div>
      <p>Tu puntaje en la parte emocional pesa bastante en el conjunto. Cerca del 30% de las mujeres de 45 a 64 años presenta síntomas depresivos en esta etapa — no estás sola en eso. Vale la pena comentarlo también con un profesional de salud mental.</p>
      <span class="cite">Fuente: Guía HNHU (RD N° 211-2024-DG/HNHU), sección 6.4.1.2.</span>
    </div>`;
  }
  if(state.skippedIntimate){
    html += `<p style="margin-top:12px;font-size:13px;color:var(--ink-soft);">${SKIPPED_INTIMATE_NOTE}</p>`;
  }
  return html;
}

function areasBody(){ return areasCard(); }

/* Badge, título y texto describen la acción que sugiere la guía, no la intensidad
   (los cortes HNHU son umbrales de tratamiento). Ver levelMessage en el módulo compartido. */
const BAND_CLASS = {A0:'level-a', A1:'level-a', B:'level-b', C:'level-c'};
const BAND_KIND = {A0:'calm', A1:'calm', B:'notice', C:'notice'};
const levelText = (msg)=> msg.paragraphs.join('<br><br>');
/* Nivel para la recomendación médica: con una señal de alerta manda la indicación del aviso. */
const recoLevel = ()=> hasFlag() ? 'alert' : computeLevel();
const doctorReco = ()=> `<p class="doctor-reco">${doctorRecommendation(recoLevel())}</p>`;
function levelCard(msg){
  return `<div class="result-badge-row"><span class="result-level-badge ${BAND_CLASS[msg.band]}">${msg.badge}</span></div>` +
    `<h3>${msg.title}</h3>` +
    doctorReco() +
    `<p>${levelText(msg)}</p>`;
}

function stageCard(){
  return `<h3>Sobre tu etapa clínica</h3>` +
    `<p>${stageNote()}</p>` +
    `<span class="cite">${PERU_AGE_NOTE} Fuente: Guía HNHU (RD N° 211-2024-DG/HNHU), secciones 5.4 y 6.2.1.</span>`;
}

function consultCard(){
  return `<h3>¿Qué preguntarle a tu médico(a)?</h3>` + consultBody();
}

/* Recomendaciones de autocuidado del reporte (lista completa, desde
   supabase/functions/_shared/autocuidado.js, igual que send-report). */
function selfCareBody(){
  const rows = selfCareItems(state.answers).map(([t,d])=>`<li><strong>${t}:</strong> ${d}</li>`).join('');
  return `<p class="card-note">No reemplazan un tratamiento si tu médico(a) lo indica — son medidas seguras para cualquier momento de esta etapa.</p>` +
    `<ul class="card-list">${rows}</ul>` +
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
  if(state.currentTreatment && state.currentTreatment.startsWith('Sí')) pts.push('Ya usas un tratamiento: cuéntaselo a tu médico(a) para evaluar ajustarlo en vez de partir de cero.');

  const generic = [
    '¿Qué opciones de tratamiento, hormonales y no hormonales, tendrían sentido para mi caso?',
    '¿Me corresponde algún examen de rutina de esta etapa (hormonal, mamografía, densitometría)?',
  ];
  let html = `<p class="card-note">Puedes llevar contigo lo que viste en "Ver mis resultados por área" y, si quieres, estas preguntas:</p>` +
    `<ul class="card-list">${generic.map(g=>`<li>${g}</li>`).join('')}</ul>`;
  if(pts.length){
    html += `<p style="margin-top:10px;font-weight:600;">También ten en cuenta:</p><ul class="card-list">${pts.map(p=>`<li>${p}</li>`).join('')}</ul>` +
      `<span class="cite">Estas sugerencias son de la guía (Figura 6 y 7) — la decisión final siempre es de tu médico(a), evaluando tu caso completo.</span>`;
  }
  return html;
}


/* Respaldo en acordeón por si se requiere en otras vistas */
function resultTopicsCard(){
  const msg = levelMessage(state.scores);
  const stageBody = `<p>${stageNote()}</p><span class="cite">${PERU_AGE_NOTE} Fuente: Guía HNHU (RD N° 211-2024-DG/HNHU), secciones 5.4 y 6.2.1.</span>`;
  const topics = [
    [msg.title, `<p>${levelText(msg)}</p>`],
    ['Sobre tu etapa', stageBody],
    ['¿Qué preguntarle a mi médico?', consultBody()],
    ['Ver mis resultados por área', areasBody()],
    ['Quiero ver mis recomendaciones', selfCareBody()],
  ];
  const rows = topics.map(([title, body])=>
    `<details class="result-topic"><summary>${title}</summary><div class="result-topic-body">${body}</div></details>`
  ).join('');
  return `<p class="topics-intro">Estos son algunos resultados y recomendaciones en base a tus respuestas:</p>${rows}` +
    `<p class="topics-outro">Puedes desplegarlas o leerlas cuando quieras en tu reporte personalizado.</p>` +
    `<p class="topics-disclaimer">Esto es solo orientación informativa. Solo un profesional de salud puede evaluarte con exámenes clínicos.</p>`;
}

function showResultsTopics(){
  setSection('Lo que noto');
  clearComposer();
  const level = computeLevel();

  botSay(['Esto es lo que noto:']).then(async ()=>{
    await showResultsCardSequence();
    track('result',{level});
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
        '<h3>No estás sola en esto</h3>Marcaste algo que conviene revisar cuanto antes.' +
        '<div class="emergency">Si en este momento tienes dolor de pecho intenso o te falta el aire de repente, no esperes: busca atención médica ya.</div>' +
        'Para el resto de señales que marcaste, agenda una cita ginecológica lo antes posible.' +
        '<br><br>Esto no reemplaza la valoración de un profesional de salud.', 'notice');
    } else {
      await revealCard(
        '<h3>No estás sola en esto</h3>Marcaste algo que vale la pena conversar con tu médico(a) antes de considerar cualquier tratamiento. Es un paso de cuidado, no una emergencia. Te recomendamos agendar una cita ginecológica en los próximos días para revisarlo con calma.' +
        '<br><br>Esto no reemplaza la valoración de un profesional de salud.', 'notice');
    }
    track('result',{level:'alert', emergency:hasEmergency});
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
      track('goals', {selected:labels});
      askName();
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
function reportFullHtml(){
  const msg = levelMessage(state.scores);
  const alertNote = hasFlag()
    ? `<p class="card-note"><strong>Marcaste una señal de alerta.</strong> Conviene revisarla con tu médico(a) antes de considerar cualquier tratamiento.</p>` : '';
  return `<div class="report-full">` +
    `<section>${alertNote}${levelCard(msg)}</section>` +
    `<section><h3>Sobre tu etapa</h3><p>${stageNote()}</p><span class="cite">${PERU_AGE_NOTE} Fuente: Guía HNHU (RD N° 211-2024-DG/HNHU), secciones 5.4 y 6.2.1.</span></section>` +
    `<section>${areasCard()}</section>` +
    `<section><h3>Recomendaciones de autocuidado</h3>${selfCareBody()}</section>` +
    `<section><h3>Para tu consulta</h3>${consultBody()}</section>` +
    `<section><h3>Tus 11 respuestas</h3>${reportAnswersList()}</section>` +
    `<p class="topics-disclaimer">${DISCLAIMER}</p>` +
    `</div>`;
}

let reportSeq = 0;
function showReport(){
  setSection('Tu reporte');
  const id = 'pdfBtn' + (++reportSeq);
  const inApp = IN_APP_BROWSER
    ? `<p class="report-inapp">Si la descarga no abre aquí, abre esta página en tu navegador (menú ··· › Abrir en el navegador) o recíbelo en tu correo.</p>` : '';
  revealCard(
    `<h3>Tu reporte</h3><p class="card-note">Todo lo que vimos, para llevarlo a tu consulta.</p>` +
    `<div class="report-actions"><a class="btn btn-sm" id="${id}" aria-disabled="true">Preparando tu PDF…</a></div>` +
    inApp + reportFullHtml(), 'report'
  ).then(()=>{
    track('report_shown', {in_app: IN_APP_BROWSER});
    requestDownloadOnly().then(url=>{
      const btn = document.getElementById(id);
      if(!btn) return;
      if(url){
        btn.href = url; btn.target = '_blank'; btn.rel = 'noopener';
        btn.removeAttribute('aria-disabled');
        btn.textContent = 'Descargar mi reporte';
        btn.addEventListener('click', ()=> track('report_download', {in_app: IN_APP_BROWSER}));
      } else {
        btn.textContent = 'No se pudo preparar el PDF';
        btn.insertAdjacentHTML('afterend', '<p class="card-note">Déjanos tu correo abajo y te enviamos una copia.</p>');
      }
    });
    askEmailCopy();
  });
}

/* Copia opcional por correo + las dos casillas opcionales (avisos e investigación).
   Si no deja el correo, igual ya vio y puede descargar su reporte. */
function askEmailCopy(){
  botSay([{text:'¿Quieres recibirlo también en tu correo? Así no lo pierdes.', cls:'question'}]).then(()=>{
    clearComposer();
    const form = document.createElement('form');
    form.className = 'email-offer';
    form.noValidate = true;
    form.innerHTML =
      `<div class="inputRow"><input type="email" name="email" placeholder="correo@ejemplo.com" autocomplete="email" aria-label="Tu correo">` +
      `<button type="submit" class="sendBtn" aria-label="Enviarme una copia">${ICON_SEND}</button></div>` +
      `<p class="hint">Usaremos tu correo solo para enviarte una copia de tu reporte.</p>` +
      `<label class="opt"><input type="checkbox" name="news"><span>(Opcional) Avísenme por correo cuando lancen el acompañamiento de Mindi.</span></label>` +
      `<label class="opt"><input type="checkbox" name="research"><span>(Opcional) Acepto que mis respuestas, sin mi nombre ni mi contacto, se usen para mejorar Mindi y para estudios sobre la menopausia.</span></label>` +
      `<div class="chips suggestRow"><button type="button" class="chip quiet" data-skip>No, gracias</button></div>`;
    composer.appendChild(form);
    const input = form.elements.email;
    const showErr = (text)=>{
      let err = form.querySelector('.hint.err');
      if(!err){ err = document.createElement('p'); err.className = 'hint err'; err.setAttribute('role','alert'); form.querySelector('.inputRow').after(err); }
      err.textContent = text;
      scrollBottom();
    };
    const finish = (email)=>{
      const news = !!email && form.elements.news.checked;
      const research = form.elements.research.checked;
      addBubble(email || 'No, gracias', 'user');
      clearComposer();
      advance();
      state.contact = email || null;
      track('lead', {captured: !!email, news, research});
      if(research) saveResearchConsent();
      if(email){
        saveLead(news).then(requestReport);
        botSay(['Listo, te llegará en unos minutos.']).then(askSatisfaction);
      } else {
        askSatisfaction();
      }
    };
    form.onsubmit = (e)=>{
      e.preventDefault();
      const v = input.value.trim();
      if(!validEmail(v)) return showErr(v ? 'Revisa el correo, o elige "No, gracias".' : 'Escribe tu correo, o elige "No, gracias".');
      finish(v);
    };
    form.querySelector('[data-skip]').onclick = ()=>{
      if(form.elements.news.checked) return showErr('Para recibir avisos, escribe tu correo.');
      finish(null);
    };
    scrollBottom();
    if(!isTouch) input.focus({preventScroll:true});
  });
}

/* Mide cómo se sintió la conversación en sí (distinto de si pagaría) — se guarda como
   evento, sin necesidad de tocar el esquema de Supabase.
   Excepción deliberada a "sin emojis" del sistema de diseño (ver renderFaceScale). */
function askSatisfaction(){
  setSection('¿Qué tal estuvo?');
  botSay(['Una última cosa:']).then(()=>{
    addCard('<h3>¿Qué tal te pareció esta experiencia?</h3>', '');
    renderFaceScale((score, label)=>{
      state.satisfaction = label;
      track('satisfaction', {answer:label, score});
      const reply = score >= 3 ? 'Qué bueno, gracias por contarme.'
        : score === 2 ? 'Gracias, lo tomo en cuenta.'
        : 'Gracias, de verdad ayuda a mejorar.';
      botSay([reply, 'Fue un gusto. Cuídate mucho.']);
    });
  });
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

/* ---------- Entrada ---------- */
function openChat(source){
  document.getElementById('conversar').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block:'start'});
  // Volver a tocar "Hablar con Mindi" es una señal explícita de que quiere volver al chat
  // (a diferencia de un simple resize) — si antes tocó "Salir", esto sí puede reactivar
  // la pantalla completa en mobile.
  focusDismissed = false;
  // Sin aceptar los términos no se empieza: si el chat no arrancó, solo se lleva a la usuaria
  // a la tarjeta de inicio, donde está el botón "Acepto y empiezo".
  if(!started){ document.getElementById('startBtn')?.focus({preventScroll:true}); return; }
  syncFocus();
}
document.getElementById('heroCta').addEventListener('click', ()=>{ track('cta_click',{source:'hero'}); openChat('hero'); });
document.querySelectorAll('[data-open-chat]').forEach(el=>{
  el.addEventListener('click', ()=>{ track('cta_click',{source:el.dataset.track || 'section'}); openChat('section'); });
});
document.getElementById('restartBtn').addEventListener('click', ()=>{ track('restart'); location.hash = 'conversar'; location.reload(); });

/* ---------- Menú de mobile (hamburguesa) ----------
   En mobile no existe el .nav horizontal (no entra) — este panel es la única forma de
   llegar a "Cómo funciona"/"Preguntas frecuentes"/"Eventos" desde ahí. */
const navToggle = document.getElementById('navToggle');
const mobileNav = document.getElementById('mobileNav');
if(navToggle && mobileNav){
  const setNavOpen = (open)=>{
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    mobileNav.hidden = !open;
  };
  navToggle.addEventListener('click', ()=> setNavOpen(mobileNav.hidden));
  mobileNav.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=> setNavOpen(false)));
}

/* ---------- Lista de espera del conversatorio (sección "Eventos") ----------
   Aparte del chat: no es una evaluación de síntomas, solo separa un cupo. Guarda en
   `event_signups` (misma forma que `leads`: solo INSERT para anon, nadie lee con la
   clave pública). Reutiliza validContact/CONSENT_VERSION/TEST_MODE ya definidos arriba. */
const eventsSignupEl = document.getElementById('eventsSignup');
if(eventsSignupEl){
  document.getElementById('eventsJoinBtn').addEventListener('click', ()=>{
    track('cta_click', {source:'eventos'});
    eventsSignupEl.innerHTML = `
      <form class="events-form" id="eventsForm">
        <input type="text" id="eventsName" placeholder="Tu nombre (opcional)" autocomplete="name">
        <input type="text" id="eventsContact" placeholder="correo@ejemplo.com o WhatsApp" autocomplete="email" required>
        <button class="btn btn-sm" type="submit">Guardar mi cupo</button>
        <p class="hint">Solo lo usamos para avisarte de este conversatorio. Tú decides qué compartir.</p>
      </form>`;
    const form = document.getElementById('eventsForm');
    const contactInput = document.getElementById('eventsContact');
    contactInput.focus({preventScroll:true});
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = document.getElementById('eventsName').value.trim();
      const contact = contactInput.value.trim();
      let err = form.querySelector('.hint.err');
      if(!validContact(contact)){
        if(!err){ err = document.createElement('p'); err.className = 'hint err'; err.setAttribute('role','alert'); form.appendChild(err); }
        err.textContent = 'Revisa el correo o el número (mínimo 9 dígitos).';
        return;
      }
      if(err) err.remove();
      const submitBtn = form.querySelector('button');
      submitBtn.disabled = true;
      const signup = {name: name || null, contact, consent:true, consent_text_version:CONSENT_VERSION, is_test:TEST_MODE};
      // Si la columna `origin` aún no existe (012 sin correr), se reintenta sin ella: nunca se pierde un cupo.
      (ORIGIN ? sb('event_signups', {...signup, origin:ORIGIN}).then(ok => ok || sb('event_signups', signup)) : sb('event_signups', signup)).then(ok=>{
        track('event_waitlist_join', {captured: ok});
        eventsSignupEl.innerHTML = ok
          ? `<p class="events-confirm"><b>¡Listo, tienes tu cupo!</b>Te escribimos apenas tengamos la fecha del conversatorio.</p>`
          : `<p class="events-confirm"><b>Algo no salió bien</b>No pudimos guardar tu cupo — inténtalo de nuevo en un momento.</p>`;
      });
    });
  });
}
document.getElementById('exitBtn').addEventListener('click', ()=>{
  focusDismissed = true;
  setFocus(false);
  document.getElementById('conversar').scrollIntoView({block:'start'});
});
document.getElementById('startBtn').addEventListener('click', ()=>{
  track('cta_click',{source:'chat'});
  if(!started) track('consent_accept',{version:CONSENT_VERSION});
  start();
});

/* ==================================================================
   NUEVAS INTERACCIONES — Hero Simulator, Síntomas, FAQ, Mobile
   ================================================================== */

/* ---------- Simulador interactivo en el Hero ---------- */
const SIM_DATA = {
  sleep: {
    question: '¿Cómo has dormido últimamente?',
    example: 'Por ejemplo: te cuesta conciliar el sueño, te despiertas a medianoche o sientes que no descansas.',
    options: [
      { score: 0, text: 'Duermo bien y descanso' },
      { score: 2, text: 'Me despierto varias veces en la noche' },
      { score: 4, text: 'Casi no logro descansar nada' }
    ],
    reply: (score) => {
      if (score === 0) return 'Dormir bien es un pilar protector clave. En Mindi revisamos periódicamente si otros cambios físicos o de ánimo interfieren con tu descanso.';
      if (score === 2) return 'Despertarse a medianoche es muy frecuente: las caídas nocturnas de estrógeno alteran el sueño profundo. Mindi te orienta sobre medidas de higiene del sueño.';
      return 'Un descanso severamente interrumpido desgasta tu energía y memoria. La Guía Clínica HNHU contempla pautas específicas para este nivel de carga.';
    }
  },
  flashes: {
    question: '¿Qué tanto te molestan los bochornos o calores?',
    example: 'Por ejemplo: calor súbito en cuello o pecho, a veces acompañado de sudoración nocturna.',
    options: [
      { score: 0, text: 'No los he sentido' },
      { score: 2, text: 'Calor repentino que interrumpe mi día' },
      { score: 4, text: 'Muy intensos, con sudoración fuerte' }
    ],
    reply: (score) => {
      if (score === 0) return 'Muchas mujeres no presentan bochornos al inicio y debutan con otros cambios como fatiga o ánimo. Cada cuerpo tiene su propia secuencia.';
      if (score === 2) return 'Los bochornos son respuestas vasomotoras generadas por el hipotálamo frente a la variación hormonal. Reconocer sus momentos ayuda mucho.';
      return 'Bochornos de intensidad alta afectan tu bienestar laboral y cotidiano. Existen alternativas terapéuticas tanto no farmacológicas como médicas comprobadas.';
    }
  },
  mood: {
    question: '¿Has notado cambios en tu ánimo o irritabilidad?',
    example: 'Por ejemplo: sentirte más reactiva, desanimada o con ansiedad inexplicable.',
    options: [
      { score: 0, text: 'Me siento tranquila y con buen ánimo' },
      { score: 2, text: 'Cambios de humor y tensión frecuentes' },
      { score: 4, text: 'Me cuesta mucho controlar mi reacción' }
    ],
    reply: (score) => {
      if (score === 0) return 'Conservar el equilibrio emocional en esta transición es un gran recurso. Mindi te ayuda a registrar qué hábitos te permiten sostenerlo.';
      if (score === 2) return 'No es falta de paciencia: los estrógenos modulan directamente la serotonina cerebral. Entender el origen biológico alivia la culpa.';
      return 'Sentir irritabilidad o angustia constante merece escucha atenta y evaluación médica, no aislamiento. Juntas armamos un reporte con preguntas precisas.';
    }
  }
};

function initHeroSimulator(){
  const tabs = document.querySelectorAll('.sim-tab');
  const questionEl = document.getElementById('simQuestion');
  const exampleEl = document.getElementById('simExample');
  const optionsEl = document.getElementById('simOptions');
  const feedbackZone = document.getElementById('simFeedbackZone');
  const replyText = document.getElementById('simReplyText');
  const continueBtn = document.getElementById('simContinueBtn');

  if(!optionsEl) return;

  let currentTopic = 'sleep';

  /* preselectIndex: al cargar la página por primera vez, mostramos una opción ya elegida
     (con su respuesta) para que el simulador se vea "vivo" desde el primer momento, en vez
     de una pantalla vacía a la espera de que alguien haga clic. Al cambiar de tab sí
     arranca vacío otra vez — es una conversación nueva sobre ese síntoma. */
  function renderTopic(topicKey, preselectIndex){
    currentTopic = topicKey;
    const data = SIM_DATA[topicKey];
    if(!data) return;

    if(questionEl) questionEl.textContent = data.question;
    if(exampleEl) exampleEl.textContent = data.example;
    if(feedbackZone) feedbackZone.hidden = true;

    optionsEl.innerHTML = '';
    // Separado de la selección "real" (clic) a propósito: el preselect inicial actualiza
    // la vista pero no debe registrarse en analítica como si la usuaria hubiese elegido algo.
    function applySelection(i){
      const opt = data.options[i];
      const btn = optionsEl.children[i];
      optionsEl.querySelectorAll('.sim-option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if(replyText) replyText.textContent = data.reply(opt.score);
      if(feedbackZone) feedbackZone.hidden = false;
    }
    data.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sim-option-btn';
      btn.innerHTML = `<span>${opt.text}</span><span class="sim-scale-num">${opt.score}</span>`;
      btn.addEventListener('click', () => {
        applySelection(i);
        track('sim_option_select', { topic: currentTopic, score: opt.score });
      });
      optionsEl.appendChild(btn);
    });
    if(typeof preselectIndex === 'number') applySelection(preselectIndex);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      renderTopic(tab.dataset.simTopic);
      track('sim_tab_switch', { topic: tab.dataset.simTopic });
    });
  });

  if(continueBtn){
    continueBtn.addEventListener('click', () => {
      track('cta_click', { source: 'sim_continue' });
      openChat('sim_continue');
    });
  }

  renderTopic('sleep', 1); // preseleccionada la opción del medio ("Me despierto varias veces en la noche")
}

/* ---------- Filtros y Navegación del Carrusel de Síntomas ---------- */
function initSymptomsExplorer(){
  const filterChips = document.querySelectorAll('.filter-chip');
  const cards = document.querySelectorAll('.sym-card');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  const carousel = document.getElementById('symptoms');

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');

      const filter = chip.dataset.filter;
      track('symptoms_filter', { filter });

      cards.forEach(card => {
        if(filter === 'all' || card.dataset.category === filter){
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  if(prevBtn && carousel){
    prevBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: -300, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }
  if(nextBtn && carousel){
    nextBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: 300, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }
}

/* ---------- Búsqueda interactiva de FAQ ---------- */
function initFaqSearch(){
  const searchInput = document.getElementById('faqSearchInput');
  const faqItems = document.querySelectorAll('.faq-item');
  if(!searchInput || !faqItems.length) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    track('faq_search', { query });
    faqItems.forEach(item => {
      const summaryText = (item.querySelector('summary')?.textContent || '').toLowerCase();
      const bodyText = (item.querySelector('.faq-answer')?.textContent || '').toLowerCase();
      const matches = !query || summaryText.includes(query) || bodyText.includes(query);
      item.style.display = matches ? '' : 'none';
      if(query && matches){
        item.open = true;
      } else if (!query) {
        item.open = false;
      }
    });
  });
}

/* ---------- Barra flotante de acción para Mobile ---------- */
function initMobileStickyBar(){
  const bar = document.getElementById('mobileStickyBar');
  if(!bar) return;

  const onScroll = () => {
    const pastHero = window.scrollY > 340;
    const isMobile = window.innerWidth <= 820;
    const chatInFocus = document.getElementById('conversar')?.classList.contains('focus');
    bar.classList.toggle('visible', pastHero && isMobile && !chatInFocus);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
}

// Inicializar nuevos módulos interactivos
initHeroSimulator();
initSymptomsExplorer();
initFaqSearch();
initMobileStickyBar();

track('page_view');

