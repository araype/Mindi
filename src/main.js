import './landing.css';

/* ---------- Medición (hooks listos para conectar a analítica real) ---------- */
/* ---------- Backend (Supabase vía REST, solo INSERT con la clave pública) ----------
   Los valores vienen de .env (VITE_*). Vacío = modo prototipo (no envía nada). */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const CONSENT_VERSION = import.meta.env.VITE_CONSENT_VERSION || 'v1';
const BACKEND_ON = !!(SUPABASE_URL && SUPABASE_KEY);
/* Marca cada sesión como de prueba mientras seguimos probando el flujo (por defecto,
   ON — así no hace falta hacer nada ahora). Antes del lanzamiento real, poner
   VITE_TEST_MODE=false en .env (y en las variables de entorno de Vercel) para que
   las sesiones reales no se mezclen con las de prueba al medir el 15% de conversión. */
const TEST_MODE = (import.meta.env.VITE_TEST_MODE ?? 'true') !== 'false';

function newId(){
  return (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);}));
}
const SESSION_ID = newId(); // anónimo, vive solo en memoria de esta visita

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
  sb('events', {session_id:SESSION_ID, name:event, props:Object.assign({is_test:TEST_MODE}, props||{})});
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
function saveLead(){
  if(!state.contact) return Promise.resolve();
  // Espera a que la sesión exista (clave foránea) antes de guardar el contacto.
  return (state.sessionSaved || Promise.resolve()).then(()=>
    sb('leads', {session_id:SESSION_ID, name:state.name || null, contact:state.contact, consent:true, consent_text_version:CONSENT_VERSION, is_test:TEST_MODE}));
}

/* Pide a la Edge Function `send-report` que arme y envíe el reporte de esta sesión.
   Se llama solo después de que la sesión y el lead ya quedaron guardados en Supabase,
   porque la función los lee de ahí (nunca recibe respuestas ni contacto por este canal). */
function requestReport(){
  if(!BACKEND_ON) return;
  fetch(`${SUPABASE_URL}/functions/v1/send-report`, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY},
    body:JSON.stringify({session_id:SESSION_ID}),
  }).then(r=>r.json()).then(res=>{
    if(res && res.ok){
      track('report_sent', {channel:res.channel});
      if(res.channel === 'link' && res.url){
        const pdfBtn = res.pdfUrl ? `<a class="btn btn-sm btn-ghost" href="${res.pdfUrl}" target="_blank" rel="noopener">Descargar PDF</a>` : '';
        addCard(
          '<h3>Tu reporte está listo</h3>Como dejaste un número, te lo dejo aquí — en PDF, para que lo abras, lo guardes o lo reenvíes por WhatsApp cuando quieras.' +
          `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">` +
          `<a class="btn btn-sm" href="${res.wa}" target="_blank" rel="noopener">Abrir en WhatsApp</a>` +
          pdfBtn +
          `<a class="btn btn-sm btn-ghost" href="${res.url}" target="_blank" rel="noopener">Ver como página</a></div>`,
          'report'
        );
      }
    } else {
      track('report_failed', {error: (res && res.error) || 'unknown'});
    }
  }).catch(()=> track('report_failed', {error:'network'}));
}

/* Para quien prefiere no dejar contacto: igual arma el PDF (con el apodo que haya
   escrito, si escribió alguno) y lo ofrece para descargar directo, sin guardar lead
   ni fila en `reports` — nada queda asociado a un correo o número. */
function requestDownloadOnly(){
  if(!BACKEND_ON) return;
  (state.sessionSaved || Promise.resolve()).then(()=>
    fetch(`${SUPABASE_URL}/functions/v1/send-report`, {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY},
      body:JSON.stringify({session_id:SESSION_ID, name: state.name || undefined, download_only:true}),
    })
  ).then(r=>r.json()).then(res=>{
    if(res && res.ok && res.pdfUrl){
      track('report_sent', {channel:'download'});
      addCard(
        '<h3>Tu reporte está listo</h3>No guardamos ningún dato de contacto — aquí tienes tu reporte en PDF para descargar directamente.' +
        `<div style="margin-top:12px;"><a class="btn btn-sm" href="${res.pdfUrl}" target="_blank" rel="noopener">Descargar mi reporte (PDF)</a></div>`,
        'report'
      );
    } else {
      track('report_failed', {error:(res && res.error) || 'unknown', channel:'download'});
    }
  }).catch(()=> track('report_failed', {error:'network', channel:'download'}));
}

function computeLevel(){
  const s = state.scores;
  if(s.total >= 15) return 'C';
  if(s.total >= 8 || s.somatico >= 8 || s.psicologico >= 6 || s.urogenital >= 3) return 'B';
  return 'A';
}

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
    scaleLabels:['No las siento','Las noto de vez en cuando','Se sienten con cierta frecuencia','Me preocupan cuando pasan','Me asustan cada vez que ocurren']},
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
    scaleLabels:['No he notado cambios','Un poco menos de interés que antes','Noto un cambio que me incomoda un poco','Me preocupa el cambio que he notado','Siento que ya no es como antes']},
  {id:'p12', sub:'urogenital', short:'Molestias al orinar',
    question:'¿Qué tanto te han molestado los problemas al orinar?',
    example:'Por ejemplo: ir con más frecuencia, urgencia repentina o pequeños escapes.',
    scaleLabels:['Sin molestias','Voy un poco más seguido de lo normal','Siento urgencia algunas veces','Se me escapa un poco en ocasiones','Me preocupa, pasa varias veces al día']},
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

const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_SEND  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';

/* ---------- Estado ---------- */
const state = {
  answers:{}, redFlags:[],
  age:null, cycle:null, name:null, contact:null,
  smoking:null, obesity:null, familyBreastCa:null, migraine:null, currentTreatment:null,
  priceInterest:null, satisfaction:null, goals:null,
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
const TYPING_MS = reduceMotion ? 0 : 550;
const TOTAL_STEPS = 27;
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

function addBubble(text, who, cls, subText){
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
function revealCard(html, kind){
  return new Promise(resolve=>{
    showTyping();
    setTimeout(()=>{
      hideTyping();
      addCard(html, kind);
      setTimeout(resolve, reduceMotion ? 0 : 220);
    }, reduceMotion ? 0 : TYPING_MS);
  });
}

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
        if(typeof m === 'string') addBubble(m, 'bot'); else addBubble(m.text, 'bot', m.cls, m.sub);
        i++;
        setTimeout(next, reduceMotion ? 0 : 260);
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

/* Escala de satisfacción de 1 a 5 con carita — mismos tonos que ya usa el resto de la
   app para intensidad (s0..s4), no colores nuevos. Excepción deliberada a "sin emojis"
   del sistema de diseño: decisión explícita para esta pantalla, no un patrón a repetir. */
const FACE_LABELS = ['Muy insatisfecha','Insatisfecha','Neutral','Satisfecha','Muy satisfecha'];
const FACE_MOUTHS = [
  'M7,17 Q12,13 17,17',
  'M7,16.3 Q12,14 17,16.3',
  'M7,16 L17,16',
  'M7,15 Q12,18 17,15',
  'M7,14.3 Q12,19 17,14.3',
];
function renderFaceScale(onPick){
  clearComposer();
  const wrap = document.createElement('div');
  wrap.className = 'face-scale';
  wrap.setAttribute('role','group');
  wrap.setAttribute('aria-label','Qué tan satisfecha quedaste, de 1 a 5');
  for(let i=0;i<5;i++){
    const color = `var(--s${4-i}-border)`; // 4=verde (feliz) ... 0=rosa (insatisfecha), igual que la escala de síntomas
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'face-btn';
    btn.setAttribute('aria-label', FACE_LABELS[i]);
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="${color}" opacity=".3"/>
        <circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="1.6"/>
        <circle cx="8.3" cy="10" r="1.15" fill="${color}"/>
        <circle cx="15.7" cy="10" r="1.15" fill="${color}"/>
        <path d="${FACE_MOUTHS[i]}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`;
    btn.onclick = ()=>{
      addBubble(FACE_LABELS[i], 'user');
      advance();
      clearComposer();
      onPick(i, FACE_LABELS[i]);
    };
    wrap.appendChild(btn);
  }
  composer.appendChild(wrap);
  const bar = document.createElement('div');
  bar.className = 'face-scale-bar';
  bar.setAttribute('aria-hidden','true');
  for(let i=0;i<5;i++){
    const seg = document.createElement('span');
    seg.style.background = `var(--s${4-i}-border)`;
    bar.appendChild(seg);
  }
  composer.appendChild(bar);
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
  input.focus({preventScroll:true});
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
  await botSay([
    'Hola, soy Mindi.',
    'Vamos a repasar juntas cómo te has sentido últimamente, con una escala que también usan los ginecólogos. Toma unos 3 minutos.',
  ]);
  addCard('<h3>Antes de empezar</h3>Tú decides qué compartir conmigo, y siempre quiero que entiendas cómo usamos tu información. Esto no reemplaza una consulta médica: si en algún momento necesitas ayuda urgente, no esperes al resultado y acude a un servicio de urgencias.', 'calm');
  renderChips([{label:'Entiendo, empecemos', primary:true}], ()=> askAge());
}

function askAge(){
  setSection('Sobre ti');
  botSay([
    {text:'Te pregunto tu edad porque las etapas de esta transición suelen ubicarse en rangos distintos, y así el reporte se ajusta mejor a ti.'},
    '¿En qué rango de edad estás?',
  ]).then(()=>{
    renderChips([{label:'Menor de 40'},{label:'40 a 45'},{label:'46 a 52'},{label:'Mayor de 52'}],
      (v)=>{ state.age = v; track('answer',{q:'p1'}); askCycle(); });
  });
}

function askCycle(){
  botSay(['Gracias. Ahora, sobre tu ciclo: te lo pregunto porque cómo ha cambiado tu regla ayuda a ubicar en qué punto de la transición podrías estar.', 'En los últimos 12 meses, ¿cómo ha estado tu periodo?']).then(()=>{
    renderChips([
      {label:'Sigue regular'},
      {label:'Es irregular (varía o se retrasa)'},
      {label:'Más de 60 días sin regla'},
      {label:'Más de 12 meses sin regla'},
      {label:'Me hicieron una histerectomía'},
    ], (v)=>{ state.cycle = v; track('answer',{q:'p2'}); showStageNote(); });
  });
}

/* Ubica a la usuaria en su etapa a partir de P1 (edad) + P2 (ciclo), usando solo la
   definición clínica de la guía (6.2.1) — nunca STRAW+10 (necesita FSH/AMH que no
   recolectamos). Mismo contenido que supabase/functions/send-report/index.ts (stageNote). */
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

function showStageNote(){
  setSection('Sobre tu etapa');
  botSay([PERU_AGE_NOTE, stageNote()]).then(()=> startDomain('somatico'));
}

const DOMAIN_BRIDGE = {
  somatico: ['Vamos a repasar cómo te has sentido físicamente en el último mes.', 'Para cada síntoma, dime qué tanto te ha molestado.'],
  psicologico: ['Gracias por contarme, esto es útil. Ahora hablemos un poco de tu estado de ánimo.'],
  urogenital: ['Ya casi terminamos esta parte.', 'Las próximas preguntas son más íntimas. Respóndelas solo si te sientes cómoda; no hay respuesta incorrecta y puedes saltarlas.'],
};

const DOMAIN_LABEL = {somatico:'Cómo se siente tu cuerpo', psicologico:'Ánimo y energía', urogenital:'Lo íntimo'};
function startDomain(domain){
  setSection(DOMAIN_LABEL[domain]);
  const items = MRS_ITEMS.filter(i=>i.sub===domain);
  if(domain === 'somatico'){
    botSay([...DOMAIN_BRIDGE[domain], 'Cada síntoma es distinto: puede que uno te moleste mucho y otro nada. Tómate un segundo para pensar cada uno por separado.']).then(()=>{
      renderChips([{label:'Entiendo, continuemos', primary:true}], ()=> askItem(items, 0, domain));
    });
  } else {
    botSay(DOMAIN_BRIDGE[domain]).then(()=> askItem(items, 0, domain));
  }
}

function askItem(items, idx, domain){
  if(idx >= items.length){
    if(domain === 'somatico') return startDomain('psicologico');
    if(domain === 'psicologico') return startDomain('urogenital');
    if(domain === 'urogenital') return finishMrs();
  }
  const item = items[idx];
  const msgs = [];
  if(item.why) msgs.push(item.why);
  msgs.push({text:item.question, sub:item.example, cls:'question'});
  botSay(msgs).then(()=>{
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

function askSmoking(){
  setSection('Contexto para tu reporte');
  botSay(['Ahora unas últimas preguntas para completar tu reporte. No suman puntos: dan contexto sobre qué opciones de cuidado podrías conversar con tu médico(a). Te las hago porque algunos hábitos y antecedentes cambian qué vía de tratamiento suele preferirse.', '¿Fumas actualmente?']).then(()=>{
    renderChips([{label:'No fumo'},{label:'Fumo ocasionalmente'},{label:'Fumo a diario'},{label:'Fumaba antes, ya no'}],
      (v)=>{ state.smoking = v; askObesity(); });
  });
}
function askObesity(){
  botSay(['¿Un médico te ha dicho alguna vez que tienes obesidad (IMC entre 30 y 40)?']).then(()=>{
    renderChips([{label:'Sí'},{label:'No'},{label:'No estoy segura'}], (v)=>{ state.obesity = v; askFamilyHistory(); });
  });
}
function askFamilyHistory(){
  botSay(['¿Tu mamá o alguna hermana ha tenido cáncer de mama?']).then(()=>{
    renderChips([{label:'Sí'},{label:'No'},{label:'No sé / no tengo ese dato'}], (v)=>{ state.familyBreastCa = v; askMigraine(); });
  });
}
const MIGRAINE_AURA = 'Sí, con aura (destellos, luces u otros síntomas antes del dolor)';
function askMigraine(){
  botSay(['¿Sufres de migrañas?']).then(()=>{
    renderChips([{label:'No'},{label:'Sí, sin aura'},{label:MIGRAINE_AURA}], (v)=>{ state.migraine = v; askCurrentTreatment(); });
  });
}
/* P18 (tiempo desde la última regla/cirugía) se quitó: solo servía para la "ventana
   terapéutica" de la guía, contenido que se decidió no comunicar todavía (ver
   docs/guia-hnhu-climaterio-2024.md) — y para histerectomizadas, "tiempo desde la
   cirugía" no es un buen indicador de "tiempo desde la menopausia" (la guía excluye
   a este grupo de STRAW+10 por la misma razón). No se usaba en ningún resultado. */
function askCurrentTreatment(){
  botSay(['Por último de este bloque: ¿actualmente usas algún tratamiento para estos síntomas?']).then(()=>{
    renderChips([
      {label:'No uso ningún tratamiento'},
      {label:'Sí, tratamiento hormonal'},
      {label:'Sí, tratamiento no hormonal (plantas, suplementos, etc.)'},
      {label:'No estoy segura'},
    ], (v)=>{ state.currentTreatment = v; askRedFlags(); });
  });
}

function askRedFlags(){
  setSection('Por tu seguridad');
  botSay(['Ya casi terminamos. Te pregunto esto por tu seguridad: algunos antecedentes cambian por completo qué conviene revisar primero con tu médico(a). Marca todo lo que aplique.']).then(()=>{
    renderMultiSelect(RED_FLAGS, (selected)=>{
      state.redFlags = selected;
      computeScores();
      saveSession(hasFlag() ? 'alert' : computeLevel());
      track('redflags_answered',{any: selected.length>0 && !selected.includes('none')});
      if(hasFlag()) showSafetyMessage(); else showResultsTopics();
    }, 'none');
  });
}

function computeScores(){
  const sum = (ids)=> ids.reduce((acc,id)=> acc + (state.answers[id] || 0), 0);
  state.scores.somatico    = sum(['p3','p4','p5','p6']);
  state.scores.psicologico = sum(['p7','p8','p9','p10']);
  state.scores.urogenital  = sum(['p11','p12','p13']);
  state.scores.total = state.scores.somatico + state.scores.psicologico + state.scores.urogenital;
}

function hasFlag(){ return state.redFlags.length && !state.redFlags.includes('none'); }

/* ---------- Lo que se detectó: contenido de cada "tema" desplegable ---------- */
const AREAS = [
  {key:'somatico',    label:'Cuerpo',           max:16, cut:8},
  {key:'psicologico', label:'Ánimo y energía',  max:16, cut:6},
  {key:'urogenital',  label:'Lo íntimo',        max:12, cut:3},
];
/* Cuerpo de cada tarjeta — SIN su propio <h3>: ahora viven dentro de un desplegable
   (<summary>) que ya trae el título, para no repetirlo. */
function areasBody(){
  const s = state.scores;
  const rows = AREAS.map(a=>{
    const v = s[a.key];
    const pct = Math.max(4, Math.round((v/a.max)*100));
    const notable = v >= a.cut;
    const desc = a.key==='urogenital' && state.skippedIntimate && v===0 ? 'Sin responder' : (notable ? 'Conviene comentarlo' : 'En un nivel leve');
    return `<div class="area">
      <div class="area-top"><span>${a.label}</span><span class="area-tag ${notable ? 'hi' : ''}">${desc}</span></div>
      <div class="meter" role="img" aria-label="${a.label}: ${desc}"><span style="width:${pct}%" class="${notable ? 'hi' : ''}"></span></div>
    </div>`;
  }).join('');
  let html = `<p class="card-note">Es una mirada de conjunto, no una calificación.</p>${rows}`;
  if(s.psicologico >= 6){
    html += `<div class="area-note">Tu puntaje en la parte emocional pesa bastante en el conjunto. Cerca del 30% de las mujeres de 45 a 64 años presenta síntomas depresivos en esta etapa — no estás sola en eso. Vale la pena comentarlo también con un profesional de salud mental.<span class="cite">Fuente: Guía HNHU (RD N° 211-2024-DG/HNHU), sección 6.4.1.2.</span></div>`;
  }
  if(state.skippedIntimate){
    html += `<p style="margin-top:10px;">Preferiste no responder alguna pregunta íntima, y está bien. Si quieres, coméntalo directamente en la consulta.</p>`;
  }
  return html;
}

/* Autocuidado seguro para cualquier nivel (A/B/C) — no reemplaza tratamiento.
   Mismo contenido que supabase/functions/send-report/index.ts — mantener sincronizado. */
function selfCareBody(){
  const items = [
    ['Para los bochornos', 'ropa en capas de fibras naturales, evitar bebidas muy calientes, café, alcohol y comidas muy condimentadas cuando puedas, y respirar lento y profundo en el momento del calor.'],
    ['Para dormir mejor', 'horarios fijos para acostarte, y un ambiente fresco y ventilado.'],
    ['Para la alimentación', 'un patrón mediterráneo: legumbres, frutas, verduras, pescado y aceite de oliva.'],
    ['Para el cuerpo en general', 'unos 150 minutos a la semana de actividad moderada (caminar rápido, nadar, bailar) — ayuda con el sueño, el ánimo y los huesos a la vez.'],
    ['Para los huesos', '1,200 mg de calcio al día (dieta o suplementos) y al menos 800 UI de vitamina D — coméntalo con tu médico(a) antes de tomar suplementos.'],
    ['Para la sequedad íntima', 'lubricantes o humectantes de base acuosa y pH neutro, sin receta.'],
  ];
  const rows = items.map(([t,d])=>`<li><b>${t}:</b> ${d}</li>`).join('');
  return `<p class="card-note">No reemplazan un tratamiento si tu médico(a) lo indica — son medidas seguras para cualquier momento de esta etapa.</p>` +
    `<ul>${rows}</ul>` +
    `<span class="cite">Fuente: Guía de Práctica Clínica para Diagnóstico y Tratamiento del Climaterio, Hospital Nacional Hipólito Unanue (RD N° 211-2024-DG/HNHU), sección 6.4.1 · dato inicial: Ayala-Peralta, 2020.</span>`;
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
    `<ul>${generic.map(g=>`<li>${g}</li>`).join('')}</ul>`;
  if(pts.length){
    html += `<p style="margin-top:10px;font-weight:600;">También ten en cuenta:</p><ul>${pts.map(p=>`<li>${p}</li>`).join('')}</ul>` +
      `<span class="cite">Estas sugerencias son de la guía (Figura 6 y 7) — la decisión final siempre es de tu médico(a), evaluando tu caso completo.</span>`;
  }
  return html;
}

const LEVEL_COPY = {
  A:{title:'Tus síntomas están en un nivel leve',
     text:'Es normal experimentar algunos cambios en esta etapa. A este nivel, cuidar algunos hábitos básicos suele ser suficiente — revisa "Quiero ver mis recomendaciones" para ideas concretas.', kind:'calm'},
  B:{title:'Sería útil que converses esto con tu ginecólogo(a)',
     text:'Tus síntomas alcanzan un nivel en el que conviene evaluar contigo si un tratamiento (hormonal o no) tiene sentido para tu caso.<br><br>Puede que ningún síntoma se sienta insoportable por separado, pero tener varios presentes a la vez, incluso en un nivel moderado, suma una carga real. Por eso lo que noto toma en cuenta el conjunto, no solo el síntoma más fuerte.', kind:'notice'},
  C:{title:'Lo que sientes es real y tiene tratamiento',
     text:'Tu nivel de síntomas es alto según la escala clínica utilizada. En este rango, el tratamiento suele ser muy recomendable.<br><br>Puede que ningún síntoma se sienta insoportable por separado, pero tener varios presentes a la vez suma una carga real. Por eso lo que noto toma en cuenta el conjunto, no solo el síntoma más fuerte.', kind:'notice'},
};

/* Lista desplegable de resultados — se muestra colapsada para no volcar toda la
   información de una vez; cada tema se abre solo si la usuaria quiere leerlo ahora.
   Todo queda igual, completo, en el reporte por correo/WhatsApp. */
function resultTopicsCard(){
  const level = computeLevel();
  const m = LEVEL_COPY[level];
  const stageBody = `<p>${stageNote()}</p><span class="cite">${PERU_AGE_NOTE} Fuente: Guía HNHU (RD N° 211-2024-DG/HNHU), secciones 5.4 y 6.2.1.</span>`;
  const topics = [
    [m.title, `<p>${m.text}</p>`],
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
  botSay(['Gracias por contarme todo esto.']).then(async ()=>{
    await revealCard(resultTopicsCard(), '');
    track('result',{level:computeLevel()});
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
    await botSay(['De todas formas, esto es lo que notamos en el resto de tus respuestas:']);
    await revealCard(resultTopicsCard(), '');
    continueToGoals();
  });
}

/* ---------- Metas + validación de precio + datos + satisfacción ----------
   Comparten el mismo cierre sin importar si hubo bandera roja: ya se mostró la
   información que corresponde (resultados o aviso de seguridad) antes de llegar aquí. */
const DOMAIN_PHRASES = {
  p3:'los bochornos y sudores', p4:'las palpitaciones', p5:'los dolores musculares o articulares',
  p6:'tu sueño', p7:'tu ánimo', p8:'la irritabilidad', p9:'la ansiedad',
  p10:'el cansancio y la concentración', p11:'tu vida íntima', p12:'las molestias al orinar', p13:'la sequedad íntima',
};
function dominantSymptomPhrase(){
  let best = null, bestVal = -1;
  for(const item of MRS_ITEMS){
    const v = state.answers[item.id];
    if(v != null && v > bestVal){ bestVal = v; best = item.id; }
  }
  if(best == null || bestVal <= 0) return 'estos cambios';
  return DOMAIN_PHRASES[best];
}

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
  const dominio = dominantSymptomPhrase();
  askGoals(dominio);
}

function askGoals(dominio){
  setSection('Tus metas');
  botSay([`Vimos que ${dominio} es lo que más te está afectando hoy.`]).then(()=>{
    addCard('<h3>¿Qué te gustaría lograr a partir de ahora?</h3><p class="card-note">Elige todas las que apliquen — no hay una respuesta correcta.</p>', 'goals');
    const options = GOAL_OPTIONS.map((text,i)=>({id:'g'+i, text}));
    renderMultiSelect(options, (selected)=>{
      const labels = selected.map(id => GOAL_OPTIONS[+id.slice(1)]);
      state.goals = labels;
      track('goals', {selected:labels});
      askPriceValidation(dominio);
    });
  });
}

function askPriceValidation(dominio){
  setSection('Precio');
  botSay(['Una última pregunta, si me lo permites.']).then(()=>{
    addCard(`<h3>¿Un acompañamiento así te sería útil?</h3>Ya que ${dominio} es lo que más te afecta hoy, y nos contaste varias cosas que te gustaría mejorar, estamos armando un plan personalizado con seguimiento continuo y acceso a especialistas para ayudarte con eso, por S/29 al mes. Aún no está disponible; tu respuesta nos ayuda a decidir si vale la pena construirlo. ¿Qué tan probable es que lo probaras?`, 'notice');
    renderChips([{label:'Sí, lo probaría'},{label:'Tal vez, depende'},{label:'No lo probaría'}], (v)=>{
      state.priceInterest = v;
      track('price_validation',{answer:v, price:29});
      const replies = {
        'Sí, lo probaría':'Qué bueno saberlo. Si nos dejas tus datos, te avisaremos cuando esté listo.',
        'Tal vez, depende':'Gracias por la honestidad. Si nos dejas tus datos, te avisaremos cuando esté listo, sin compromiso.',
        'No lo probaría':'Gracias por decírmelo; de verdad ayuda a construir algo que tenga sentido para ti.',
      };
      botSay([replies[v]]).then(()=> askName());
    });
  });
}

function askName(){
  setSection('Tu reporte');
  botSay(['¿Cómo te gustaría que te llame en tu reporte?']).then(()=>{
    renderTextInput('Tu nombre o un apodo', {skipLabel:'Prefiero usar un apodo', skipValue:''}, (val)=>{
      state.name = val || '';
      askContact();
    });
  });
}

function validContact(v){
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const phone = v.replace(/\D/g,'').length >= 9;
  return email || phone;
}

function askContact(){
  botSay(['Para terminar, ¿a qué correo o número de WhatsApp te envío tu reporte completo? Es opcional — si prefieres no dejarlo, igual te dejo tu reporte para descargar.']).then(()=>{
    renderTextInput('correo@ejemplo.com o WhatsApp', {
      skipLabel:'Prefiero no dejar mis datos',
      validate:validContact,
      errorText:'Revisa el correo o el número (mínimo 9 dígitos), o elige no dejar tus datos.',
      hint:'Solo lo usamos para enviarte tu reporte y avisarte del acompañamiento. Tus respuestas se guardan sin tu nombre, separadas de tu contacto.',
    }, (val)=>{
      state.contact = val;
      track('lead', {captured: !!val});
      if(val){
        saveLead().then(requestReport);
      } else {
        requestDownloadOnly();
      }
      askSatisfaction();
    });
  });
}

/* Mide cómo se sintió la conversación en sí (distinto de si pagaría) — se guarda como
   evento, igual que price_validation, sin necesidad de tocar el esquema de Supabase.
   Excepción deliberada a "sin emojis" del sistema de diseño (ver renderFaceScale). */
function askSatisfaction(){
  setSection('¿Qué tal estuvo?');
  botSay(['Una última cosa, antes de despedirnos.']).then(()=>{
    addCard('<h3>¿Qué tal te pareció esta experiencia?</h3>', '');
    renderFaceScale((score, label)=>{
      state.satisfaction = label;
      track('satisfaction', {answer:label, score});
      const reply = score >= 3 ? 'Qué bueno saberlo, gracias por contarme.'
        : score === 2 ? 'Gracias por decírmelo — lo tomo en cuenta.'
        : 'Gracias por la honestidad, de verdad ayuda a mejorar esto.';
      const saludo = state.name ? `Gracias, ${state.name}. ` : '';
      botSay([reply, `${saludo}Fue un gusto acompañarte. Cuídate mucho.`]);
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
  start();
  syncFocus(); // por si el chat ya estaba iniciado antes (start() no hace nada en ese caso)
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
      sb('event_signups', {
        name: name || null, contact, consent:true, consent_text_version:CONSENT_VERSION, is_test:TEST_MODE,
      }).then(ok=>{
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
document.getElementById('startBtn').addEventListener('click', ()=>{ track('cta_click',{source:'chat'}); start(); });
track('page_view');
