/* Panel interno: lee la vista `funnel` a través de la Edge Function `funnel-stats`
   (la vista está cerrada para la clave pública). La clave del panel vive solo en el
   localStorage de este navegador. */
// Los números llegan por /api/stats (servidor): el navegador no tiene claves de Supabase.
const KEY_STORE = 'mindi_panel_key';
const TESTER_STORE = 'mindi_tester'; // mismo que src/main.js: marca este navegador como del equipo
const FILTER_STORE = 'mindi_panel_filters';
const TAB_STORE = 'mindi_panel_tab';
// Bloque "Interés en el plan a S/30": oculto mientras la pregunta de precio no esté en el chat.
const SHOW_PRICE = false;

const $ = (id) => document.getElementById(id);
const gate = $('gate'), dash = $('dash'), statusEl = $('status'), tooltip = $('tooltip');

function getKey(){ try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; } }
function setKey(v){ try { v ? localStorage.setItem(KEY_STORE, v) : localStorage.removeItem(KEY_STORE); } catch {} }

const fmt = (n) => Number(n || 0).toLocaleString('es-PE');
const pct = (a, b) => b > 0 ? Math.round((a / b) * 1000) / 10 : null;
const pctTxt = (p) => p === null ? '—' : `${p.toLocaleString('es-PE')}%`;

/* ---------- Filtros (se recuerdan en este navegador) ---------- */
const filters = (()=>{
  try { return Object.assign({period:'all', includeTest:false, origin:'all'}, JSON.parse(localStorage.getItem(FILTER_STORE) || '{}')); }
  catch { return {period:'all', includeTest:false, origin:'all'}; }
})();
function saveFilters(){ try { localStorage.setItem(FILTER_STORE, JSON.stringify(filters)); } catch {} }

const ORIGIN_LABEL = {all:'', tiktok:' · solo TikTok', facebook:' · solo Facebook', none:' · solo sin origen'};
/* Periodos por experimento (6 nov. 2026). EXP1: fechas PROVISIONALES hasta que Aracely confirme las del
   primer y último evento (consulta en el resumen del 6 nov.); se cambian solo aquí. */
const EXP1 = { start: null, end: '2026-09-30T00:00:00-05:00', label: 'Experimento 1 (hasta el 29 sep. 2026)' };
const EXP2 = { start: '2026-11-05T00:00:00-05:00', label: 'Experimento 2 · Lanzamiento (desde el 5 nov. 2026)' };
const PERIOD_LABEL = {today:'hoy', '7d':'últimos 7 días', '30d':'últimos 30 días', all:'desde el inicio', exp1: EXP1.label, exp2: EXP2.label};
function untilFor(period){ return period === 'exp1' ? EXP1.end : null; }
// Días en hora de Lima (UTC-5, sin horario de verano): "Hoy" empieza a las 00:00 de Lima.
function sinceFor(period){
  if(period === 'all') return null;
  if(period === 'exp1') return EXP1.start;
  if(period === 'exp2') return EXP2.start;
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Lima'}).format(new Date()); // AAAA-MM-DD
  const start = new Date(`${today}T00:00:00-05:00`);
  const back = period === '7d' ? 6 : period === '30d' ? 29 : 0;
  return new Date(start.getTime() - back * 86400000).toISOString();
}
function syncFilterUI(enabled){
  document.querySelectorAll('#periodSeg button').forEach((b)=>{
    const on = b.dataset.period === filters.period;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
    b.disabled = !enabled;
  });
  document.querySelectorAll('#originSeg button').forEach((b)=>{
    const on = b.dataset.origin === filters.origin;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
    b.disabled = !enabled;
  });
  $('testToggle').checked = filters.includeTest;
  $('testToggle').disabled = !enabled;
  $('filtersNote').hidden = enabled;
  $('testBanner').hidden = !(enabled && filters.includeTest);
}

/* ---------- Pestañas: el chat y el conversatorio se leen por separado ---------- */
const TABS = ['chat', 'eventos', 'temas', 'listas'];
const TAB_HASH = {eventos:'#conversatorio', temas:'#chat-ia', listas:'#listas'};
let tab = (()=>{
  const fromHash = Object.keys(TAB_HASH).find((t)=> TAB_HASH[t] === location.hash) || (location.hash === '#temas' ? 'temas' : null);
  if(fromHash) return fromHash;
  try { const t = localStorage.getItem(TAB_STORE); return TABS.includes(t) ? t : 'chat'; } catch { return 'chat'; }
})();
const TAB_TITLE = {chat:'Embudo del test', eventos:'Conversatorio', temas:'Chat con IA', listas:'Listas'};
function syncTabs(){
  document.querySelectorAll('.tabs [role="tab"]').forEach((b)=>{
    const on = b.dataset.tab === tab;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  $('tabChat').hidden = tab !== 'chat';
  $('tabEventos').hidden = tab !== 'eventos';
  $('tabTemas').hidden = tab !== 'temas';
  $('tabListas').hidden = tab !== 'listas';
  $('pageTitle').textContent = TAB_TITLE[tab];
}
function pickTab(t){
  if(t === tab) return;
  tab = t;
  try { localStorage.setItem(TAB_STORE, t); } catch {}
  history.replaceState(null, '', TAB_HASH[t] || location.pathname);
  syncTabs(); load();
}

function showStatus(text){ statusEl.textContent = text; statusEl.hidden = !text; }

function showGate(error){
  dash.hidden = true;
  $('headActions').hidden = true;
  gate.hidden = false;
  $('gateError').hidden = !error;
  $('gateError').textContent = error || '';
  $('keyInput').focus();
}

async function load(){
  const key = getKey();
  if(!key){ showStatus(''); showGate(); return; }

  // Listas: no se piden números; la clave se revisa al exportar.
  if(tab === 'listas'){ gate.hidden = true; $('headActions').hidden = false; dash.hidden = false; showStatus(''); syncTabs(); syncFilterUI(true); return; }
  const btn = $('refreshBtn');
  btn.disabled = true;
  showStatus(dash.hidden ? 'Cargando…' : '');
  try {
    const ask = (view) => fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ since: sinceFor(filters.period), until: untilFor(filters.period), include_test: filters.includeTest, view, origin: filters.origin === 'all' ? null : filters.origin }),
    });
    const r = await ask(tab);
    const extra = tab === 'temas' ? await ask('chat').then((x)=> x.ok ? x.json() : null).catch(()=> null) : null;
    if(r.status === 401){ setKey(''); showStatus(''); showGate('Esa clave no coincide con ADMIN_KEY (o ADMIN_KEY aún no está configurada en Supabase).'); return; }
    const res = await r.json().catch(() => null);
    if(!r.ok || !res?.ok){ showStatus(`No se pudo leer el embudo (${res?.error || 'error ' + r.status}). Vuelve a intentarlo con "Actualizar".`); $('headActions').hidden = false; return; }
    // Quien entra al panel es del equipo: sus visitas a la landing no deben contar como reales.
    try { if(!localStorage.getItem(TESTER_STORE)) localStorage.setItem(TESTER_STORE, 'panel'); } catch {}
    gate.hidden = true;
    $('headActions').hidden = false;
    showStatus('');
    syncTabs();
    if(tab === 'temas'){
      syncFilterUI(true);
      const exp1 = filters.period === 'exp1';
      $('iaExp1').hidden = !exp1;
      $('convBlock').hidden = exp1; $('splitWhatsapp').hidden = exp1;
      if(extra && extra.ok && !exp1){ renderConv(extra.conversaciones); renderChatIA(extra.funnel || {}); }
      renderTemas(res.temas, res.generated_at, res.missing, res.preguntas);
    } else if(tab === 'eventos'){
      syncFilterUI(true);
      renderEventos(res.eventos, res.generated_at, res.missing);
    } else {
      syncFilterUI(res.filters !== false);
      render(res.funnel, res.generated_at, res.filters !== false);
    }
  } catch {
    showStatus('Sin conexión con Supabase. Revisa tu internet y vuelve a intentarlo con "Actualizar".');
    $('headActions').hidden = false;
  } finally {
    btn.disabled = false;
  }
}

/* ---------- Dibujo ---------- */
/* `leads` no va en el embudo: el reporte también se puede descargar sin dejar contacto,
   así que "obtienen reporte" puede ser mayor que "dejan contacto". Va como cifra aparte. */
const STEPS = [
  ['visitas', 'Visitas'],
  ['inician_chat', 'Inician el test'],
  ['completan_sintomas', 'Completan síntomas'],
  ['ven_resultado', 'Ven su resultado'],
  ['eligen_metas', 'Eligen metas'],
  ['reportes', 'Ven su reporte'],
];
/* Embudo estricto (013): cada paso solo cuenta visitas que pasaron por todos los anteriores,
   así ningún paso supera al previo. Si 013 no se corrió, se usan los conteos sueltos. */
const STRICT_KEYS = ['embudo_visitas', 'embudo_chat', 'embudo_sintomas', 'embudo_resultado', 'embudo_metas', 'embudo_reporte'];

function setMeta(at, filtered){
  const time = at ? new Date(at).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const who = filtered && filters.includeTest ? 'Sesiones reales y de prueba' : 'Sesiones reales — las de prueba no cuentan';
  const when = filtered ? `, ${PERIOD_LABEL[filters.period]}` : '';
  const from = filtered ? ORIGIN_LABEL[filters.origin] || '' : '';
  $('meta').textContent = `${who}${when}${from}.${time ? ' Actualizado: ' + time : ''}`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- Temas del chat: barras por mes, de mayor a menor ---------- */
const TEMA_LABEL = {bochornos:'Bochornos', sueno:'Sueño', animo:'Ánimo', peso:'Peso', vida_intima:'Vida íntima',
  terapia_hormonal:'Terapia hormonal', remedios_naturales:'Remedios naturales', edad_inicio:'Edad de inicio',
  duracion:'Duración', trabajo:'Trabajo', otro:'Otro'};
let temaSel = null, pregRows = null;
function renderTemas(rows, at, missing, preguntas){
  setMeta(at, true);
  $('temasMissing').hidden = !missing;
  $('temasBody').hidden = !!missing;
  $('preguntasBody').hidden = !!missing;
  dash.hidden = false;
  if(missing) return;
  pregRows = preguntas;
  const shared = {};
  for(const q of preguntas || []) shared[q.tema] = (shared[q.tema] || 0) + 1;
  const byMonth = {};
  for(const r of rows || []) (byMonth[r.mes] ||= []).push(r);
  const months = Object.keys(byMonth).sort().reverse();
  $('temasEmpty').hidden = months.length > 0;
  $('temasChart').innerHTML = months.map((m)=>{
    const list = byMonth[m].sort((a, b)=> b.n - a.n);
    const max = Math.max(...list.map((r)=> Number(r.n)));
    const total = list.reduce((s, r)=> s + Number(r.n), 0);
    const raw = new Date(`${m}-01T12:00:00`).toLocaleDateString('es-PE', {month:'long', year:'numeric'});
    const title = raw.charAt(0).toUpperCase() + raw.slice(1); // Noviembre de 2026
    return `<div class="temas-mes"><h3>${esc(title)} <span class="tile-sub">${fmt(total)} preguntas</span></h3>` +
      list.map((r)=> `<button type="button" class="tema-row${temaSel === r.tema ? ' is-sel' : ''}" data-tema="${esc(r.tema)}" aria-pressed="${temaSel === r.tema}">` +
        `<span class="tema-name">${esc(TEMA_LABEL[r.tema] || r.tema)}</span>` +
        `<span class="tema-track"><span class="tema-bar" style="width:${Math.max(2, Math.round(Number(r.n) / max * 100))}%"></span></span>` +
        `<span class="tema-n">${fmt(r.n)}<small>${shared[r.tema] ? ` · ${fmt(shared[r.tema])} compartidas` : ''}</small></span></button>`).join('') + `</div>`;
  }).join('');
  renderPreguntas();
}
function renderPreguntas(){
  const missing = pregRows == null;
  $('preguntasMissing').hidden = !missing;
  $('preguntasList').hidden = missing;
  if(missing){ $('preguntasEmpty').hidden = true; return; }
  const list = temaSel ? pregRows.filter((q)=> q.tema === temaSel) : pregRows;
  $('preguntasTitle').textContent = temaSel ? `Preguntas compartidas · ${TEMA_LABEL[temaSel] || temaSel}` : 'Preguntas compartidas';
  $('preguntasAll').hidden = !temaSel;
  $('preguntasEmpty').hidden = list.length > 0;
  $('preguntasEmpty').textContent = temaSel ? 'Nadie compartió todavía preguntas de este tema en el periodo.' : 'Todavía no hay preguntas compartidas en este periodo.';
  $('preguntasList').innerHTML = list.map((q)=>{
    const fecha = new Date(`${q.fecha}T12:00:00`).toLocaleDateString('es-PE', {day:'numeric', month:'short'});
    return `<li><span class="preg-meta">${esc(fecha)}${temaSel ? '' : ` · ${esc(TEMA_LABEL[q.tema] || q.tema)}`}</span><span class="preg-text">${esc(q.pregunta)}</span></li>`;
  }).join('');
}
$('temasChart').addEventListener('click', (e)=>{
  const b = e.target.closest('[data-tema]'); if(!b) return;
  temaSel = temaSel === b.dataset.tema ? null : b.dataset.tema;
  document.querySelectorAll('#temasChart [data-tema]').forEach((x)=>{ const on = x.dataset.tema === temaSel; x.classList.toggle('is-sel', on); x.setAttribute('aria-pressed', on); });
  renderPreguntas();
  $('preguntasBody').scrollIntoView({behavior:'smooth', block:'start'});
});
$('preguntasAll').addEventListener('click', ()=>{ temaSel = null; document.querySelectorAll('#temasChart [data-tema]').forEach((x)=>{ x.classList.remove('is-sel'); x.setAttribute('aria-pressed', 'false'); }); renderPreguntas(); });

/* ---------- Listas: descarga del CSV descifrado ---------- */
if(import.meta.env.VITE_CHAT_RESEARCH_ENABLED === 'true') document.querySelectorAll('[data-research]').forEach((b)=>{ b.hidden = false; });
document.querySelectorAll('#exportGrid [data-list]').forEach((b)=> b.addEventListener('click', async ()=>{
  const key = getKey();
  if(!key){ showGate(); return; }
  const status = $('exportStatus');
  status.hidden = false; status.textContent = 'Preparando…';
  b.disabled = true;
  try {
    const r = await fetch('/api/export', { method:'POST', headers:{'Content-Type':'application/json', 'x-admin-key':key}, body:JSON.stringify({list:b.dataset.list, include_test:filters.includeTest}) });
    if(r.status === 401){ setKey(''); status.hidden = true; showGate('Esa clave no coincide con ADMIN_KEY.'); return; }
    if(!r.ok){ status.textContent = 'No se pudo exportar. Vuelve a intentarlo.'; return; }
    const url = URL.createObjectURL(await r.blob());
    const a = Object.assign(document.createElement('a'), {href:url, download:`mindi-${b.dataset.list}.csv`});
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 10000);
    status.textContent = `Descargado: mindi-${b.dataset.list}.csv`;
  } catch {
    status.textContent = 'Sin conexión. Vuelve a intentarlo.';
  } finally {
    b.disabled = false;
  }
}));

function renderEventos(e, at, missing){
  setMeta(at, !!e);
  if(missing) $('eventosMissingFile').textContent = 'supabase/' + missing;
  $('eventosMissing').hidden = !!e;
  $('eventosBody').hidden = !e;
  dash.hidden = false;
  if(!e) return;

  $('eClics').textContent = fmt(e.clic_en_registrarse);
  $('eCompletan').textContent = fmt(e.completan_registro);
  const rate = pct(e.completan_registro, e.clic_en_registrarse);
  $('eCompletanSub').textContent = rate === null ? '' : `${pctTxt(rate)} de quienes tocaron el botón`;
  $('eInscritas').textContent = fmt(e.inscritas);
  $('eInscritasSub').textContent = `${fmt(e.inscritas_total)} en total en la lista`;

  const lista = e.lista || [];
  $('eLista').innerHTML = lista.map((r) => {
    const fecha = new Date(r.fecha).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' });
    return `<tr>
      <td>${esc(fecha)}</td>
      <td>${r.nombre && !String(r.nombre).startsWith('v1:') ? esc(r.nombre) : '<span class="tile-sub">Sin nombre</span>'}${r.origen ? `<span class="tag-origin">${esc(r.origen)}</span>` : ''}${r.prueba ? '<span class="tag-test">prueba</span>' : ''}</td>
      <td class="contact">${String(r.contacto || '').startsWith('v1:') ? '<span class="tile-sub">Cifrado: descárgalo en Listas → Conversatorios</span>' : esc(r.contacto)}</td>
    </tr>`;
  }).join('');
  $('eLista').closest('.table-wrap').hidden = !lista.length;
  $('eListaEmpty').hidden = !!lista.length;
}

function render(f, at, filtered){
  setMeta(at, filtered);

  $('tVisitas').textContent = fmt(f.visitas);
  $('tReportes').textContent = f.reportes == null ? '—' : fmt(f.reportes);
  $('tReportesSub').textContent = f.reportes == null ? '' : `${pctTxt(pct(f.reportes, f.visitas))} de las visitas`;
  $('tLeads').textContent = fmt(f.leads);
  $('tConvChat').textContent = pctTxt(pct(f.reportes, f.inician_chat));
  const v2 = f.version >= 2;
  $('panelV2Missing').hidden = v2 || !filtered;
  $('tConvSub').textContent = v2 && f.descargan_pdf != null ? `${fmt(f.descargan_pdf)} descargan el PDF` : '';

  renderFunnel(f);

  // Con el PDF precargado, report_sent (descarga) contaba a todas: desde 023 se usan los toques reales.
  if(filters.period === 'exp1') renderSplit($('splitReport'), 'Cómo reciben el reporte', 'Experimento 1: correo, WhatsApp o descarga del PDF.', [
    ['Correo', f.reporte_correo, 'var(--cat-1)'],
    ['WhatsApp', f.reporte_whatsapp, 'var(--cat-2)'],
    ['Descarga PDF', f.reporte_descarga, 'var(--cat-3)'],
  ]);
  else renderRel($('splitReport'), 'Qué hacen con su reporte', 'Una misma persona puede hacer varias cosas.', [
    ['Descargan el PDF', f.descargan_pdf],
    ['Piden copia por correo', f.reporte_correo],
    ['Comparten el enlace con su médico', f.enlace_medico],
  ], f.ven_reporte, 'quienes ven su reporte', v2 ? null : 'Corre supabase/023_panel_v2.sql para ver este desglose.');

  // La pregunta de precio ya no está en el chat (la oferta irá en la landing, más adelante):
  // el bloque se oculta para no contar ese paso. Los datos anteriores siguen en la base.
  const priceEl = $('splitPrice');
  const showOld = SHOW_PRICE || filters.period === 'exp1';
  priceEl.hidden = !showOld;
  if(showOld) renderSplit(priceEl, 'Interés en el plan a S/30', 'Respuestas a la pregunta de precio.', [
    ['Sí, lo probaría', f.precio_si, 'var(--div-pos)'],
    ['Tal vez, depende', f.precio_tal_vez, 'var(--div-mid)'],
    ['No lo probaría', f.precio_no, 'var(--div-neg)'],
  ]);

  const waOld = $('splitWaOld');
  waOld.hidden = filters.period !== 'exp1';
  if(!waOld.hidden) renderSplit(waOld, 'Clics en WhatsApp', 'Experimento 1: cuántas veces tocaron el botón, según desde dónde (clics, no personas).', [
    ['Landing ("Tengo una duda")', f.whatsapp_landing, 'var(--cat-1)'],
    ['Resultado del test', f.whatsapp_resultado, 'var(--cat-2)'],
    ['Salida del filtro de etapa', f.whatsapp_filtro, 'var(--cat-3)'],
  ]);
  $('splitResearch').hidden = filters.period === 'exp1';
  if(filters.period !== 'exp1') renderSplit($('splitResearch'), 'Permiso de investigación', 'Respuesta a "¿Me ayudas a mejorar Mindi?", después del resultado.', [
    ['Sí, compartir', f.investigacion_si, 'var(--div-pos)'],
    ['No, gracias', f.investigacion_no, 'var(--div-neg)'],
  ], v2 ? null : 'Corre supabase/023_panel_v2.sql para ver este desglose.');

  renderSplit($('splitSat'), filters.period === 'exp1' ? '¿Qué tal te pareció esta experiencia?' : '¿Te sirvió este resultado?', `${filters.period === 'exp1' ? 'Experimento 1: al final del test.' : 'Satisfacción, antes del reporte.'}${v2 && f.ven_resultado ? ` Responden ${pctTxt(pct((f.satisfaccion_alta || 0) + (f.satisfaccion_neutra || 0) + (f.satisfaccion_baja || 0), f.ven_resultado))} de quienes ven su resultado.` : ''}`, [
    ['Alta', f.satisfaccion_alta, 'var(--div-pos)'],
    ['Neutra', f.satisfaccion_neutra, 'var(--div-mid)'],
    ['Baja', f.satisfaccion_baja, 'var(--div-neg)'],
    ...(v2 && filters.period !== 'exp1' ? [['Prefiero no responder', f.satisfaccion_omitida, 'var(--cat-5, #9a8a95)']] : []),
  ]);

  const noSessions = filtered ? null : 'Corre supabase/009_panel_stats.sql para ver este desglose.';
  // Mismos nombres que ve la usuaria (acción según la guía HNHU, no intensidad). A se divide
  // por el total ya guardado (014); si 014 no se corrió, A se muestra sin dividir.
  const splitA = f.nivel_a0 != null;
  renderSplit($('splitLevel'), 'Nivel de resultado', 'De quienes terminaron el test. Puntos de corte de la Guía HNHU (Escala MRS).', [
    ...(splitA
      ? [['Sin molestias importantes (A, total 0-4)', f.nivel_a0, 'var(--ord-1)'],
         ['Síntomas leves (A, total 5-7)', f.nivel_a1, 'var(--ord-2)']]
      : [['Sin molestias importantes o leves (A)', f.nivel_a, 'var(--ord-1)']]),
    ['Conviene evaluarlo con su médico (B)', f.nivel_b, 'var(--ord-3)'],
    ['El tratamiento suele ser muy recomendable (C)', f.nivel_c, 'var(--ord-4)'],
    ['Señal de alerta', f.nivel_alerta, 'var(--critical)'],
  ], noSessions);

  renderSplit($('splitAge'), 'Rango de edad', 'De quienes terminaron el test.', [
    ['Menor de 40', f.edad_menor_40, 'var(--ord-1)'],
    ['40 a 45', f.edad_40_45, 'var(--ord-2)'],
    ['46 a 52', f.edad_46_52, 'var(--ord-3)'],
    ['Mayor de 52', f.edad_mayor_52, 'var(--ord-4)'],
  ], noSessions);

  dash.hidden = false;
}

function renderFunnel(raw){
  const strict = raw.embudo_visitas != null;
  const f = strict ? Object.fromEntries(STEPS.map(([k], i) => [k, raw[STRICT_KEYS[i]]])) : raw;
  const steps = STEPS.filter(([k]) => f[k] != null);
  const max = Math.max(1, ...steps.map(([k]) => f[k] || 0));
  // El paso con menor retención (excluye el primero) se marca para leerlo de un vistazo.
  const rates = steps.map(([k], i) => i === 0 ? null : pct(f[k] || 0, f[steps[i-1][0]] || 0));
  const valid = rates.filter((r) => r !== null);
  const worst = valid.length ? Math.min(...valid) : null;

  const head = `<div class="f-row f-head" role="row">
    <span role="columnheader">Paso</span><span aria-hidden="true"></span>
    <span class="f-count" role="columnheader">Sesiones</span>
    <span class="f-step" role="columnheader">Del paso anterior</span></div>`;

  const rows = steps.map(([k, label], i) => {
    const v = f[k] || 0;
    const w = (v / max) * 100;
    const rate = rates[i];
    const isLow = rate !== null && rate === worst && valid.length > 1;
    const tip = `${label}: ${fmt(v)} sesiones${rate !== null ? ` · ${pctTxt(rate)} del paso anterior` : ''} · ${pctTxt(pct(v, f.visitas))} de las visitas`;
    return `<div class="f-row" role="row">
      <span class="f-label" role="cell">${label}</span>
      <span class="f-track" aria-hidden="true"><span class="f-bar" style="width:${w}%" data-tip="${tip}"></span></span>
      <span class="f-count" role="cell">${fmt(v)}</span>
      <span class="f-step${isLow ? ' low' : ''}" role="cell">${i === 0 ? '—' : pctTxt(rate)}</span>
    </div>`;
  }).join('');
  $('funnel').innerHTML = head + rows;
}

function renderSplit(el, title, note, parts, missing){
  const total = parts.reduce((a, [, n]) => a + (n || 0), 0);
  const segs = total ? parts.filter(([, n]) => n > 0).map(([label, n, color]) =>
    `<span style="width:${(n / total) * 100}%;background:${color}" data-tip="${label}: ${fmt(n)} (${pctTxt(pct(n, total))})"></span>`).join('') : '';
  const legend = parts.map(([label, n, color]) => `<li>
      <span class="swatch" style="background:${color}"></span>
      <span>${label}</span>
      <span class="n">${n == null ? '—' : fmt(n)}</span>
      <span class="pct">${total ? pctTxt(pct(n || 0, total)) : '—'}</span>
    </li>`).join('');
  el.innerHTML = `<h2>${title}</h2><p class="block-note">${note}</p>
    <div class="stack${total ? '' : ' empty'}" aria-hidden="true">${segs}</div>
    <ul class="legend">${legend}</ul>
    ${missing ? `<p class="split-empty">${missing}</p>` : (!total ? '<p class="split-empty">Todavía no hay respuestas.</p>' : '')}`;
}

/* Pestaña "Chat con IA": qué hacen quienes abren /chat (cada apertura es su propia sesión de eventos). */
function renderChatIA(f){
  renderRel($('splitWhatsapp'), 'Actividad del chat', f.version >= 2 ? `${fmt(f.chat_mensajes)} mensajes · ${fmt(f.chat_desde_resultado)} llegan desde el resultado · ${fmt(f.chat_errores)} errores · ${fmt(f.whatsapp_total)} clics en WhatsApp (si el chat falla).` : '', [
    ['Hacen al menos una pregunta', f.chat_preguntan],
    ['Comparten sus preguntas', f.chat_comparten],
  ], f.chat_abren, 'quienes abren el chat', f.version >= 2 ? null : 'Corre supabase/023_panel_v2.sql para ver el chat con IA.');
}

/* Conversaciones del chat con IA (024): la definición de éxito acordada el 6 nov. 2026. */
function renderConv(c){
  const el = $('convBlock');
  if(c == null){ el.innerHTML = '<h2>Conversaciones del chat con IA</h2><p class="split-empty">Corre <code>supabase/024_conversaciones.sql</code> en Supabase para ver esta tarjeta.</p>'; return; }
  const ab = c.conv_abren || 0, fbT = (c.fb_si || 0) + (c.fb_no || 0);
  const sec = (ms)=> ms == null ? '—' : `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
  el.innerHTML = `<h2>Conversaciones del chat con IA</h2>
    <p class="block-note">Exitosa = acepta, hace 2 preguntas o más, sin errores ni límite, y termina con una señal de valor: "me sirvió", va al test que Mindi le recomendó, o llegó desde su resultado.</p>
    <div class="conv-hero"><span class="conv-big">${ab ? pctTxt(pct(c.conv_exitosas, ab)) : '—'}</span><span class="conv-sub">${fmt(c.conv_exitosas)} de ${fmt(ab)} conversaciones son exitosas</span></div>
    <div class="conv-steps" id="convSteps"></div>
    <dl class="conv-kpis">
      <div><dt>"¿Te sirvió?"</dt><dd>${fbT ? pctTxt(pct(c.fb_si, fbT)) : '—'} sí</dd><span>${fmt(c.fb_si)} sí · ${fmt(c.fb_no)} no</span></div>
      <div><dt>Preguntas por conversación</dt><dd>${c.conv_mediana_preguntas == null ? '—' : fmt(Math.round(c.conv_mediana_preguntas * 10) / 10)}</dd><span>mediana</span></div>
      <div><dt>Test que recomendó Mindi</dt><dd>${fmt(c.test_desde_chat)} de ${fmt(c.test_recomendado)}</dd><span>lo abren · ${fmt(c.test_completo_desde_chat)} lo completan</span></div>
      <div><dt>Tiempo de respuesta</dt><dd>${sec(c.latencia_mediana_ms)}</dd><span>mediana · 9 de cada 10 en menos de ${sec(c.latencia_p90_ms)}</span></div>
      <div><dt>Con algún error</dt><dd>${fmt(c.conv_con_error)}</dd><span>${fmt(c.conv_limite)} llegan al límite</span></div>
    </dl>`;
  renderRel($('convSteps'), '', '', [
    ['Abren el chat', c.conv_abren], ['Aceptan la tarjeta', c.conv_aceptan], ['Hacen 2 preguntas o más', c.conv_dos_preguntas], ['Exitosas', c.conv_exitosas],
  ], ab, 'quienes abren el chat');
  $('convSteps').querySelector('h2')?.remove(); $('convSteps').querySelector('.block-note:not(.rel-base)')?.remove();
}

/* Cifras que NO son partes de un todo (pasos o acciones que se suman): cada fila con su barra y su % sobre
   una base (quienes abren el chat, quienes ven el reporte), sin barra apilada. */
function renderRel(el, title, note, rows, base, baseLabel, missing){
  const b = base || 0;
  const items = rows.map(([label, n]) => `<li class="rel-row">
      <span class="rel-label">${label}</span>
      <span class="rel-track"><span class="rel-bar" style="width:${b ? Math.max(n ? 2 : 0, Math.round((n || 0) / b * 100)) : 0}%"></span></span>
      <span class="n">${n == null ? '—' : fmt(n)}</span>
      <span class="pct">${b && n != null ? pctTxt(pct(n, b)) : '—'}</span>
    </li>`).join('');
  el.innerHTML = `<h2>${title}</h2><p class="block-note">${note}</p>
    <ul class="legend rel">${items}</ul>
    <p class="block-note rel-base">% sobre ${baseLabel} (${b ? fmt(b) : '—'}).</p>
    ${missing ? `<p class="split-empty">${missing}</p>` : (!b ? '<p class="split-empty">Todavía no hay datos en este periodo.</p>' : '')}`;
}

/* Tooltip: un solo elemento flotante, alimentado por data-tip */
document.addEventListener('pointerover', (e) => {
  const t = e.target.closest?.('[data-tip]');
  if(!t){ tooltip.hidden = true; return; }
  tooltip.textContent = t.dataset.tip;
  tooltip.hidden = false;
});
document.addEventListener('pointermove', (e) => {
  if(tooltip.hidden) return;
  const x = Math.min(e.clientX + 12, window.innerWidth - tooltip.offsetWidth - 8);
  tooltip.style.left = Math.max(8, x) + 'px';
  tooltip.style.top = (e.clientY + 16) + 'px';
});
document.addEventListener('pointerout', (e) => { if(e.target.closest?.('[data-tip]')) tooltip.hidden = true; });

/* ---------- Modo claro / oscuro ---------- */
const THEME_STORE = 'mindi_panel_theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
function isDark(){
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : darkQuery.matches;
}
function syncThemeBtn(){
  const dark = isDark();
  document.body.classList.toggle('is-dark', dark);
  $('themeBtn').setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
}
$('themeBtn').addEventListener('click', ()=>{
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_STORE, next); } catch {}
  syncThemeBtn();
});
darkQuery.addEventListener?.('change', syncThemeBtn);
syncThemeBtn();

/* ---------- Eventos ---------- */
gate.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('keyInput').value.trim();
  if(!v) return;
  setKey(v);
  $('keyInput').value = '';
  $('keyInput').type = 'password';
  $('pwToggle').setAttribute('aria-pressed', 'false');
  $('pwToggle').setAttribute('aria-label', 'Mostrar clave');
  load();
});
$('refreshBtn').addEventListener('click', load);

const tabBtns = [...document.querySelectorAll('.tabs [role="tab"]')];
tabBtns.forEach((b, i)=>{
  b.addEventListener('click', ()=> pickTab(b.dataset.tab));
  b.addEventListener('keydown', (e)=>{
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if(!d) return;
    e.preventDefault();
    const next = tabBtns[(i + d + tabBtns.length) % tabBtns.length];
    next.focus(); pickTab(next.dataset.tab);
  });
});
syncTabs();

const periodBtns = [...document.querySelectorAll('#periodSeg button')];
function pickPeriod(p){
  if(p === filters.period) return;
  filters.period = p; saveFilters(); syncFilterUI(true); load();
}
periodBtns.forEach((b, i)=>{
  b.addEventListener('click', ()=> pickPeriod(b.dataset.period));
  // Flechas para moverse dentro del grupo (patrón de radio group)
  b.addEventListener('keydown', (e)=>{
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if(!d) return;
    e.preventDefault();
    const next = periodBtns[(i + d + periodBtns.length) % periodBtns.length];
    next.focus(); pickPeriod(next.dataset.period);
  });
});
const originBtns = [...document.querySelectorAll('#originSeg button')];
function pickOrigin(o){
  if(o === filters.origin) return;
  filters.origin = o; saveFilters(); syncFilterUI(true); load();
}
originBtns.forEach((b, i)=>{
  b.addEventListener('click', ()=> pickOrigin(b.dataset.origin));
  b.addEventListener('keydown', (e)=>{
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if(!d) return;
    e.preventDefault();
    const next = originBtns[(i + d + originBtns.length) % originBtns.length];
    next.focus(); pickOrigin(next.dataset.origin);
  });
});
$('testToggle').addEventListener('change', (e)=>{
  filters.includeTest = e.target.checked; saveFilters(); syncFilterUI(true); load();
});

$('pwToggle').addEventListener('click', ()=>{
  const input = $('keyInput');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  $('pwToggle').setAttribute('aria-pressed', String(show));
  $('pwToggle').setAttribute('aria-label', show ? 'Ocultar clave' : 'Mostrar clave');
  input.focus();
});
$('logoutBtn').addEventListener('click', () => { setKey(''); showGate(); });

load();
