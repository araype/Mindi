import './landing.css';

/* ---------- Medición (hooks listos para conectar a analítica real) ---------- */
/* ---------- Backend (Supabase vía REST, solo INSERT con la clave pública) ----------
   Los valores vienen de .env (VITE_*). Vacío = modo prototipo (no envía nada). */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const CONSENT_VERSION = import.meta.env.VITE_CONSENT_VERSION || 'v1';
const BACKEND_ON = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

function newId(){
  return (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);}));
}
const SESSION_ID = newId(); // anónimo, vive solo en memoria de esta visita

function sb(table, row){
  if(!BACKEND_ON) return Promise.resolve(false);
  return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY,'Prefer':'return=minimal'},
    body:JSON.stringify(row),
    keepalive:true,
  }).then(r=>r.ok).catch(()=>false);
}

window.dataLayer = window.dataLayer || [];
function track(event, props){
  const payload = Object.assign({event:'mindi_'+event, ts:Date.now()}, props||{});
  window.dataLayer.push(payload);
  if(window.console) console.debug('[mindi]', payload);
  sb('events', {session_id:SESSION_ID, name:event, props:props||{}});
}

function saveSession(level){
  const s = state.scores;
  state.sessionSaved = sb('sessions', {
    id:SESSION_ID,
    age_range:state.age, cycle:state.cycle, menopause_years:state.menopauseYears,
    smoking:state.smoking, obesity:state.obesity, family_breast_ca:state.familyBreastCa,
    migraine:state.migraine, current_treatment:state.currentTreatment,
    answers:state.answers,
    score_somatico:s.somatico, score_psicologico:s.psicologico, score_urogenital:s.urogenital, score_total:s.total,
    level, red_flags:state.redFlags, skipped_intimate:state.skippedIntimate,
  });
}
function saveLead(){
  if(!state.contact) return;
  // Espera a que la sesión exista (clave foránea) antes de guardar el contacto.
  (state.sessionSaved || Promise.resolve()).then(()=>
    sb('leads', {session_id:SESSION_ID, name:state.name || null, contact:state.contact, consent:true, consent_text_version:CONSENT_VERSION}));
}

function computeLevel(){
  const s = state.scores;
  if(s.total >= 15) return 'C';
  if(s.total >= 8 || s.somatico >= 8 || s.psicologico >= 6 || s.urogenital >= 3) return 'B';
  return 'A';
}

/* ---------- Contenido clínico: MRS oficial (11 ítems, 3 subescalas) — sin cambios de lógica ---------- */
const MRS_ITEMS = [
  {id:'p3',  sub:'somatico', short:'Bochornos / calores',
    question:'¿Qué tanto te han molestado los bochornos, la sudoración o los calores repentinos?',
    example:'Por ejemplo: oleadas de calor en la cara, el cuello o el pecho, a veces con sudoración nocturna.'},
  {id:'p4',  sub:'somatico', short:'Molestias del corazón',
    question:'¿Y las molestias del corazón?',
    example:'Por ejemplo: sentir los latidos, palpitaciones repentinas o una opresión en el pecho.'},
  {id:'p5',  sub:'somatico', short:'Dolores musculares o articulares',
    question:'¿Qué tanto te han molestado los dolores musculares o articulares?',
    example:'Por ejemplo: dolor en huesos o articulaciones, rigidez al levantarte.'},
  {id:'p6',  sub:'somatico', short:'Sueño',
    question:'¿Cómo has dormido últimamente?',
    example:'Por ejemplo: te cuesta conciliar el sueño, te despiertas a medianoche o sientes que no descansas.'},
  {id:'p7',  sub:'psicologico', short:'Ánimo decaído',
    question:'¿Qué tanto te has sentido decaída o con el ánimo bajo?',
    example:'Por ejemplo: triste, sin energía, o con ganas de llorar sin razón aparente.'},
  {id:'p8',  sub:'psicologico', short:'Irritabilidad',
    question:'¿Y la irritabilidad?',
    example:'Por ejemplo: sentirte más tensa, explotar con facilidad o sentirte intolerante.'},
  {id:'p9',  sub:'psicologico', short:'Ansiedad',
    question:'¿Qué tanto te ha molestado la ansiedad?',
    example:'Por ejemplo: sentirte angustiada, inquieta o con tendencia al pánico.'},
  {id:'p10', sub:'psicologico', short:'Cansancio físico o mental',
    question:'¿Y el cansancio físico o mental?',
    example:'Por ejemplo: rendir menos, cansarte rápido, olvidos frecuentes o dificultad para concentrarte.'},
  {id:'p11', sub:'urogenital', skippable:true, short:'Deseo o vida sexual',
    why:'Te pregunto esto porque los cambios hormonales también pueden afectar el deseo y la vida sexual, y es algo que muchas mujeres no se atreven a comentar. Puedes no responder.',
    question:'¿Has notado cambios en tu deseo o tu vida sexual?',
    example:'Por ejemplo: menos ganas, menor frecuencia o menor satisfacción.'},
  {id:'p12', sub:'urogenital', short:'Molestias al orinar',
    question:'¿Qué tanto te han molestado los problemas al orinar?',
    example:'Por ejemplo: ir con más frecuencia, urgencia repentina o pequeños escapes.'},
  {id:'p13', sub:'urogenital', skippable:true, short:'Sequedad o molestia íntima',
    why:'Te pregunto esto porque la sequedad íntima es una de las molestias más comunes en esta etapa y tiene alternativas. Puedes no responder.',
    question:'¿Y la sequedad o molestia íntima?',
    example:'Por ejemplo: sensación de sequedad, ardor o molestia durante las relaciones.'},
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
  smoking:null, obesity:null, familyBreastCa:null, migraine:null, menopauseYears:null, currentTreatment:null,
  priceInterest:null,
  scores:{somatico:0, psicologico:0, urogenital:0, total:0},
  skippedIntimate:false,
};

const chat = document.getElementById('chat');
const composer = document.getElementById('composer');
const progressFill = document.getElementById('progressFill');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TYPING_MS = reduceMotion ? 0 : 550;
const TOTAL_STEPS = 27;
let step = 0;
let started = false;

const sectionLabel = document.getElementById('sectionLabel');
const chatMeta = document.getElementById('chatMeta');
function setSection(label){ if(sectionLabel) sectionLabel.textContent = label; }
function setFocus(on){
  document.getElementById('conversar').classList.toggle('focus', on);
  document.body.classList.toggle('no-scroll', on);
}
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
function clearComposer(){ composer.innerHTML = ''; }
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
  focusFirst();
}

let scaleKeyHandler = null;
function stopScaleKeys(){ if(scaleKeyHandler){ document.removeEventListener('keydown', scaleKeyHandler); scaleKeyHandler = null; } }
function renderScale(onPick, allowSkip, heading){
  stopScaleKeys();
  clearComposer();
  if(heading){
    const hd = document.createElement('p'); hd.className = 'composer-heading'; hd.textContent = heading; composer.appendChild(hd);
  }
  const row = document.createElement('div');
  row.className = 'scale-row';
  row.setAttribute('role','group');
  row.setAttribute('aria-label','Intensidad de 0 a 4');
  SCALE_LABELS.forEach((label, val)=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.setAttribute('aria-label', `${label}, ${val} de 4`);
    btn.innerHTML = `<span>${label}</span><span class="scale-badge s${val}">${val}</span>`;
    btn.onclick = ()=>{
      stopScaleKeys();
      if(!heading){ addBubble(`${label} (${val}/4)`, 'user'); advance(); }
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
  focusFirst();
}

function renderMultiSelect(options, onConfirm){
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
      if(opt.id === 'none'){ selected.clear(); selected.add('none'); }
      else {
        selected.delete('none');
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
    const labelText = list.includes('none') ? NONE_TEXT : list.map(id=>RED_FLAGS.find(f=>f.id===id).text).join('. ');
    addBubble(labelText, 'user');
    clearComposer();
    advance();
    onConfirm(list);
  };
  confirmWrap.appendChild(confirmBtn);
  composer.appendChild(confirmWrap);
  composer.querySelector('button')?.focus({preventScroll:true});
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
  input.focus({preventScroll:true});
}

/* ---------- Flujo ---------- */
async function start(){
  if(started) return;
  started = true;
  track('chat_start');
  const s = document.getElementById('chatStart'); if(s) s.remove();
  chatMeta.hidden = false;
  setSection('Bienvenida');
  if(window.matchMedia('(max-width:640px)').matches) setFocus(true);
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
    ], (v)=>{ state.cycle = v; track('answer',{q:'p2'}); startDomain('somatico'); });
  });
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
    if(domain === 'urogenital') return showMrsSummary();
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
    }, !!item.skippable);
  });
}

function showMrsSummary(){
  setSection('Repaso');
  const card = document.createElement('div');
  card.className = 'card';
  function rowsHtml(){
    return MRS_ITEMS.map(item=>{
      const val = state.answers[item.id];
      const has = !(val === null || val === undefined);
      return `<div class="summary-row"><span>${item.short}</span>
        <button type="button" class="pill-btn ${has ? 's'+val : ''}" data-edit="${item.id}" aria-label="${item.short}: ${has ? SCALE_LABELS[val] : 'sin responder'}. Cambiar respuesta">${has ? SCALE_LABELS[val] : 'Sin responder'}</button></div>`;
    }).join('');
  }
  function continueChip(){
    renderChips([{label:'Se ve bien, continuemos', primary:true}], ()=>{ track('mrs_complete'); askSmoking(); });
  }
  function bind(){
    card.innerHTML = `<h3>Lo que me contaste hasta ahora</h3><p class="card-note">Toca una respuesta si quieres cambiarla.</p>${rowsHtml()}`;
    card.querySelectorAll('[data-edit]').forEach(btn=>{
      btn.onclick = ()=>{
        const item = MRS_ITEMS.find(i=>i.id===btn.dataset.edit);
        renderScale((val)=>{
          state.answers[item.id] = val;
          state.skippedIntimate = ['p11','p13'].some(id=>state.answers[id] === null);
          bind();
          continueChip();
        }, !!item.skippable, `Cambiar: ${item.short}`);
      };
    });
  }
  botSay(['Antes de seguir, revisa rápido lo que marcaste. Si algo no refleja cómo te sientes, puedes cambiarlo ahora.']).then(()=>{
    const row = document.createElement('div');
    row.className = 'row bot';
    row.appendChild(card);
    chat.appendChild(row);
    bind();
    scrollBottom();
    continueChip();
  });
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
    renderChips([{label:'No'},{label:'Sí, sin aura'},{label:MIGRAINE_AURA}], (v)=>{ state.migraine = v; askMenopauseYearsIfNeeded(); });
  });
}
function askMenopauseYearsIfNeeded(){
  const needs = ['Más de 60 días sin regla','Más de 12 meses sin regla','Me hicieron una histerectomía'].includes(state.cycle);
  if(!needs) return askCurrentTreatment();
  botSay(['¿Hace cuánto tiempo aproximadamente fue tu última regla (o tu cirugía)?']).then(()=>{
    renderChips([{label:'Hace menos de 1 año'},{label:'Entre 1 y 10 años'},{label:'Hace más de 10 años'}],
      (v)=>{ state.menopauseYears = v; askCurrentTreatment(); });
  });
}
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
      askName();
    });
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
  const msg = hasFlag()
    ? 'Antes de mostrarte lo que noto, ¿me dejas un correo o WhatsApp? Así puedo enviarte información de seguimiento y qué preguntarle a tu médico(a).'
    : '¿A qué correo o número de WhatsApp te envío tu reporte?';
  botSay([msg, 'Es opcional. Al dejarlo, aceptas que lo usemos solo para enviarte tu reporte y avisarte cuando el acompañamiento esté listo. Tus respuestas se guardan sin tu nombre, separadas de tus datos de contacto. Tú decides qué compartir.']).then(()=>{
    renderTextInput('correo@ejemplo.com o WhatsApp', {
      skipLabel:'Prefiero no dejar mis datos',
      validate:validContact,
      errorText:'Revisa el correo o el número (mínimo 9 dígitos), o elige no dejar tus datos.',
    }, (val)=>{
      state.contact = val;
      saveLead();
      track('lead', {captured: !!val});
      if(hasFlag()) showAlertResult(); else showResult();
    });
  });
}

function showAlertResult(){
  setSection('Un paso de cuidado');
  clearComposer();
  const hasEmergency = state.redFlags.includes('rf2');
  botSay(['Gracias por confiarme esto.']).then(()=>{
    if(hasEmergency){
      addCard(
        '<h3>No estás sola en esto</h3>Marcaste algo que conviene revisar cuanto antes.' +
        '<div class="emergency">Si en este momento tienes dolor de pecho intenso o te falta el aire de repente, no esperes: busca atención médica ya.</div>' +
        'Para el resto de señales que marcaste, agenda una cita ginecológica lo antes posible.' +
        '<br><br>Esto no reemplaza la valoración de un profesional de salud.', 'notice');
    } else {
      addCard(
        '<h3>No estás sola en esto</h3>Marcaste algo que vale la pena conversar con tu médico(a) antes de considerar cualquier tratamiento. Es un paso de cuidado, no una emergencia. Te recomendamos agendar una cita ginecológica en los próximos días para revisarlo con calma.' +
        '<br><br>Esto no reemplaza la valoración de un profesional de salud.', 'notice');
    }
    track('result',{level:'alert', emergency:hasEmergency});
    renderChips([{label:'Entendido', primary:true}], ()=>{
      botSay(['Cuídate mucho. Aquí estaré si quieres repasar algo más.']);
    });
  });
}

const AREAS = [
  {key:'somatico',    label:'Cuerpo',           max:16, cut:8},
  {key:'psicologico', label:'Ánimo y energía',  max:16, cut:6},
  {key:'urogenital',  label:'Lo íntimo',        max:12, cut:3},
];
function areasCard(){
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
  return `<h3>Lo que noto por áreas</h3><p class="card-note">Es una mirada de conjunto, no una calificación.</p>${rows}`;
}
function showResult(){
  setSection('Lo que noto');
  clearComposer();
  const s = state.scores;
  const level = computeLevel();

  const carga = '<br><br>Puede que ningún síntoma se sienta insoportable por separado, pero tener varios presentes a la vez, incluso en un nivel moderado, suma una carga real. Por eso lo que noto toma en cuenta el conjunto, no solo el síntoma más fuerte.';
  const messages = {
    A:{title:'Tus síntomas están en un nivel leve',
       text:'Es normal experimentar algunos cambios en esta etapa. En este nivel, la guía clínica recomienda medidas de estilo de vida: alimentación, actividad física y buen descanso. Te enviaremos estas recomendaciones si nos dejaste tus datos.', kind:'calm'},
    B:{title:'Sería útil que converses esto con tu ginecólogo(a)',
       text:'Tus síntomas alcanzan un nivel en el que conviene evaluar contigo si un tratamiento (hormonal o no) tiene sentido para tu caso. Te prepararemos un reporte con el detalle por área (físico, emocional, íntimo) para que lo lleves a tu consulta.' + carga, kind:'notice'},
    C:{title:'Lo que sientes es real y tiene tratamiento',
       text:'Tu nivel de síntomas es alto según la escala clínica utilizada. En este rango, el tratamiento suele ser muy recomendable. Te prepararemos un reporte detallado para tu próxima consulta.' + carga, kind:'notice'},
  };
  const m = messages[level];
  const nombre = state.name ? `, ${state.name}` : '';

  botSay([`Gracias${nombre}. Esto es lo que noto en lo que me contaste.`]).then(()=>{
    addCard(`<h3>${m.title}</h3>${m.text}`, m.kind);
    addCard(areasCard(), '');

    if(s.psicologico >= 6){
      addCard('<h3>Sobre tu bienestar emocional</h3>Lo que me contaste sobre tu ánimo pesa bastante en el conjunto. Esta etapa puede venir con síntomas emocionales importantes, y no estás sola en eso. Vale la pena comentarlo también con un profesional de salud mental, además de tu ginecólogo(a).', 'calm');
    }
    if(state.skippedIntimate){
      addCard('Preferiste no responder alguna pregunta íntima, y está bien. Si quieres, coméntalo directamente en la consulta; a veces es más fácil decirlo en persona.', '');
    }

    const pts = [];
    if(state.smoking && state.smoking !== 'No fumo') pts.push('Fumas o fumabas: esto puede influir en la vía de tratamiento que te recomienden.');
    if(state.obesity === 'Sí') pts.push('Tienes indicación médica de obesidad: también puede influir en la vía de tratamiento.');
    if(state.familyBreastCa === 'Sí') pts.push('Antecedente familiar de cáncer de mama: coméntalo con tu médico(a), podría sugerir un tamizaje adicional.');
    if(state.migraine === MIGRAINE_AURA) pts.push('Migraña con aura: es un dato relevante para elegir la vía de tratamiento.');
    if(state.currentTreatment && state.currentTreatment.startsWith('Sí')) pts.push('Ya usas un tratamiento: cuéntaselo a tu médico(a) para evaluar ajustarlo en vez de partir de cero.');
    if(pts.length) addCard('<h3>Puntos para comentar en tu consulta</h3>' + pts.map(p=>`<div style="margin-top:6px;">${p}</div>`).join(''), '');

    addCard('Esto es solo orientación informativa. Solo un profesional de salud puede evaluarte con exámenes clínicos.', 'calm');
    track('result',{level});
    askPriceValidation();
  });
}

function askPriceValidation(){
  botSay(['Una última pregunta, si me lo permites.']).then(()=>{
    addCard('<h3>¿Un acompañamiento así te sería útil?</h3>Estamos armando un plan mensual con seguimiento continuo y acceso a especialistas, por S/29 al mes. Aún no está disponible; tu respuesta nos ayuda a decidir si vale la pena construirlo. ¿Qué tan probable es que lo probaras?', 'notice');
    renderChips([{label:'Sí, lo probaría'},{label:'Tal vez, depende'},{label:'No lo creo'}], (v)=>{
      state.priceInterest = v;
      track('price_validation',{answer:v, price:29});
      const replies = {
        'Sí, lo probaría':'Qué bueno saberlo. Si nos dejaste tus datos, te avisaremos cuando esté listo.',
        'Tal vez, depende':'Gracias por la honestidad. Si nos dejaste tus datos, te avisaremos cuando esté listo, sin compromiso.',
        'No lo creo':'Gracias por decírmelo; de verdad ayuda a construir algo que tenga sentido para ti.',
      };
      botSay([replies[v], 'Fue un gusto acompañarte. Cuídate mucho.']);
    });
  });
}

/* ---------- Entrada ---------- */
function openChat(source){
  document.getElementById('conversar').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block:'start'});
  start();
}
document.getElementById('heroCta').addEventListener('click', ()=>{ track('cta_click',{source:'hero'}); openChat('hero'); });
document.querySelectorAll('[data-open-chat]').forEach(el=>{
  el.addEventListener('click', ()=>{ track('cta_click',{source:el.dataset.track || 'section'}); openChat('section'); });
});
document.getElementById('restartBtn').addEventListener('click', ()=>{ track('restart'); location.hash = 'conversar'; location.reload(); });
document.getElementById('exitBtn').addEventListener('click', ()=>{ setFocus(false); document.getElementById('conversar').scrollIntoView({block:'start'}); });
document.getElementById('startBtn').addEventListener('click', ()=>{ track('cta_click',{source:'chat'}); start(); });
track('page_view');
