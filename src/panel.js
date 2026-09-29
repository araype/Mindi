/* Panel interno: lee la vista `funnel` a través de la Edge Function `funnel-stats`
   (la vista está cerrada para la clave pública). La clave del panel vive solo en el
   localStorage de este navegador. */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const KEY_STORE = 'mindi_panel_key';
const TESTER_STORE = 'mindi_tester'; // mismo que src/main.js: marca este navegador como del equipo
const FILTER_STORE = 'mindi_panel_filters';
const TAB_STORE = 'mindi_panel_tab';

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
const PERIOD_LABEL = {today:'hoy', '7d':'últimos 7 días', '30d':'últimos 30 días', all:'desde el inicio'};
// Días en hora de Lima (UTC-5, sin horario de verano): "Hoy" empieza a las 00:00 de Lima.
function sinceFor(period){
  if(period === 'all') return null;
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
let tab = (()=>{
  if(location.hash === '#conversatorio') return 'eventos';
  try { return localStorage.getItem(TAB_STORE) === 'eventos' ? 'eventos' : 'chat'; } catch { return 'chat'; }
})();
const TAB_TITLE = {chat:'Embudo de conversación', eventos:'Conversatorio'};
function syncTabs(){
  document.querySelectorAll('.tabs [role="tab"]').forEach((b)=>{
    const on = b.dataset.tab === tab;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  $('tabChat').hidden = tab !== 'chat';
  $('tabEventos').hidden = tab !== 'eventos';
  $('pageTitle').textContent = TAB_TITLE[tab];
}
function pickTab(t){
  if(t === tab) return;
  tab = t;
  try { localStorage.setItem(TAB_STORE, t); } catch {}
  history.replaceState(null, '', t === 'eventos' ? '#conversatorio' : location.pathname);
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
  if(!SUPABASE_URL || !SUPABASE_KEY){ showStatus('Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.'); return; }

  const btn = $('refreshBtn');
  btn.disabled = true;
  showStatus(dash.hidden ? 'Cargando…' : '');
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/funnel-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'x-admin-key': key },
      body: JSON.stringify({ since: sinceFor(filters.period), include_test: filters.includeTest, view: tab, origin: filters.origin === 'all' ? null : filters.origin }),
    });
    if(r.status === 401){ setKey(''); showStatus(''); showGate('Esa clave no coincide con ADMIN_KEY (o ADMIN_KEY aún no está configurada en Supabase).'); return; }
    const res = await r.json().catch(() => null);
    if(!r.ok || !res?.ok){ showStatus(`No se pudo leer el embudo (${res?.error || 'error ' + r.status}). Vuelve a intentarlo con "Actualizar".`); $('headActions').hidden = false; return; }
    // Quien entra al panel es del equipo: sus visitas a la landing no deben contar como reales.
    try { if(!localStorage.getItem(TESTER_STORE)) localStorage.setItem(TESTER_STORE, 'panel'); } catch {}
    gate.hidden = true;
    $('headActions').hidden = false;
    showStatus('');
    syncTabs();
    if(tab === 'eventos'){
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
  ['inician_chat', 'Inician el chat'],
  ['completan_sintomas', 'Completan síntomas'],
  ['ven_resultado', 'Ven su resultado'],
  ['eligen_metas', 'Eligen metas'],
  ['reportes', 'Obtienen reporte'],
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
      <td>${r.nombre ? esc(r.nombre) : '<span class="tile-sub">Sin nombre</span>'}${r.origen ? `<span class="tag-origin">${esc(r.origen)}</span>` : ''}${r.prueba ? '<span class="tag-test">prueba</span>' : ''}</td>
      <td class="contact">${esc(r.contacto)}</td>
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

  renderFunnel(f);

  renderSplit($('splitReport'), 'Cómo reciben el reporte', 'Del total de reportes obtenidos.', [
    ['Correo', f.reporte_correo, 'var(--cat-1)'],
    ['WhatsApp', f.reporte_whatsapp, 'var(--cat-2)'],
    ['Descarga PDF', f.reporte_descarga, 'var(--cat-3)'],
  ], f.reportes == null ? 'Corre supabase/008_funnel_reportes.sql para ver este desglose.' : null);

  renderSplit($('splitPrice'), 'Interés en el plan a S/30', 'Respuestas a la pregunta de precio.', [
    ['Sí, lo probaría', f.precio_si, 'var(--div-pos)'],
    ['Tal vez, depende', f.precio_tal_vez, 'var(--div-mid)'],
    ['No lo probaría', f.precio_no, 'var(--div-neg)'],
  ]);

  renderSplit($('splitSat'), 'Satisfacción', 'Qué tan útil les pareció la conversación.', [
    ['Alta', f.satisfaccion_alta, 'var(--div-pos)'],
    ['Neutra', f.satisfaccion_neutra, 'var(--div-mid)'],
    ['Baja', f.satisfaccion_baja, 'var(--div-neg)'],
  ]);

  const noSessions = filtered ? null : 'Corre supabase/009_panel_stats.sql para ver este desglose.';
  renderSplit($('splitLevel'), 'Nivel de resultado', 'De quienes terminaron el chat (Escala MRS).', [
    ['Leve', f.nivel_a, 'var(--ord-1)'],
    ['Moderado', f.nivel_b, 'var(--ord-2)'],
    ['Alto', f.nivel_c, 'var(--ord-3)'],
    ['Señal de alerta', f.nivel_alerta, 'var(--critical)'],
  ], noSessions);

  renderSplit($('splitAge'), 'Rango de edad', 'De quienes terminaron el chat.', [
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
