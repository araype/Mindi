// Tests del flujo del chat: el test es el MISMO de siempre, sin copias, y el chat con IA (/chat) es
// una sesión aparte que solo puede recomendar el test con un botón (handoff 10.5.1). Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const count = (re) => (main.match(re) || []).length;

test('cada paso del test está definido una sola vez', () => {
  for (const fn of ['start', 'askAge', 'askCycle', 'afterStageQuestions', 'startDomain', 'askItem', 'finishMrs',
    'askSmoking', 'askObesity', 'askFamilyHistory', 'askMigraine', 'askCurrentTreatment', 'askRedFlags',
    'computeScores', 'computeLevel', 'showResultsTopics', 'showSafetyMessage', 'showReport']) {
    assert.equal(count(new RegExp(`(?:async )?function ${fn}\\(`, 'g')), 1, fn);
  }
  assert.equal(count(/const MRS_ITEMS = \[/g), 1);
  assert.equal(count(/const RED_FLAGS = \[/g), 1);
});

test('el test tiene una sola entrada, después del consentimiento; nunca dentro del chat con IA', () => {
  const startBtn = main.slice(main.indexOf("getElementById('startBtn').addEventListener"));
  assert.match(startBtn.slice(0, 800), /track\('consent_accept'[\s\S]*start\(\);/);
  assert.equal(count(/\bstart\(\);/g), 1); // solo el botón "Empezar"
  assert.doesNotMatch(main, /startTestFromAgent|Hacer mi test aquí/);
});

test('el puntaje y el nivel salen solo del módulo compartido', () => {
  assert.match(main, /function computeScores\(\)\{ Object\.assign\(state\.scores, mrsScores\(state\.answers\)\); \}/);
  assert.match(main, /function computeLevel\(\)\{ return mrsLevel\(state\.scores\); \}/);
  assert.match(main, /from '\.\.\/supabase\/functions\/_shared\/mrs\.js'/);
});

test('el campo de texto del chat con IA nunca aparece durante el test (sesiones separadas, 10.5)', () => {
  const steps = main.slice(main.indexOf('function askAge('), main.indexOf('/* ---------- Al terminar el test'));
  assert.doesNotMatch(steps, /renderQuestionInput\(/);
  const ai = main.slice(main.indexOf('/* ---------- Chat con IA: /chat'), main.indexOf('/* ---------- Entrada'));
  assert.doesNotMatch(ai, /\bstart\(|askAge\(/);
});

test('del chat al test: botón solo con recommend_test, máximo dos veces, nunca con resultado; abre /test?origen=chat', () => {
  assert.match(main, /if\(reply\.action === 'recommend_test' && recommendTest\(\)\) chatLog\.push\(\{r:'cta', t:''\}\);/);
  const fn = main.slice(main.indexOf('function recommendTest('), main.indexOf('function recommendTest(') + 600);
  assert.match(fn, /if\(chatResult \|\| testRecommendations >= MAX_TEST_RECOMMENDATIONS\) return false;/);
  assert.match(fn, /href="\/test\?origen=chat"/);
  assert.match(fn, /track\('chat_test_recommended'/);
  assert.match(main, /const MAX_TEST_RECOMMENDATIONS = 2;/);
  assert.match(main, /track\('chat_to_test'\);\s*releaseSessionId\(\);/);
});

test('al terminar el test o la salida del filtro se ofrece ir al chat con IA', () => {
  // Sin la invitación al canal de WhatsApp (16 nov. 2026): del cierre va directo al chat.
  assert.doesNotMatch(main, /channelInvite/);
  assert.match(main, /botSay\(\['Fue un gusto\. Cuídate mucho\.'\]\)\.then\(\(\)=> afterGuided\(true\)\)/);
  assert.equal(count(/\]\)\.then\(\(\)=> afterGuided\(false\)\)/g), 2);
});

test('reporte: "Descargar PDF" principal, y correo y WhatsApp (verde) debajo (PDF en el celular, wa.me con /reporte si no)', () => {
  assert.match(main, /señal' : 'señales'\} de alerta/);
  const report = main.slice(main.indexOf('function showReport('), main.indexOf('/* "Enviar a mi correo"'));
  assert.ok(report.indexOf('Preparando tu PDF…') < report.indexOf('>Enviar a mi correo<'));
  assert.match(report, />Enviar a mi correo</);
  assert.match(report, /class="rbtn rbtn-wa" id="\$\{id\}w">\$\{ICON_WHATSAPP\}<span>Compartir por WhatsApp<\/span>/);
  assert.match(report, /setupDownloadButton\(document\.getElementById\(id \+ 'd'\), pdf\);/);
  // Descargar solo descarga (mide report_download); compartir es del botón de WhatsApp.
  const dl = main.slice(main.indexOf('function setupDownloadButton('), main.indexOf('/* ¿Este navegador puede compartir un PDF?'));
  assert.match(dl, /track\('report_download', \{in_app: IN_APP_BROWSER, method:'download'\}\);/);
  assert.doesNotMatch(dl, /navigator\.share/);
  assert.doesNotMatch(main, />Compartir con mi médico<|acompañamiento\./);
  const share = main.slice(main.indexOf('function requestShareLink('), main.indexOf('/* Del resultado al chat con IA'));
  assert.match(share, /action:'share'/);
  assert.match(share, /https:\/\/wa\.me\/\?text=/);
  assert.match(share, /navigator\.share\(\{files:\[file\]/);
  // Turnstile solo aparece al tocar "Enviar a mi correo".
  const email = main.slice(main.indexOf('function setupEmailButton('), main.indexOf('function mountEmailForm('));
  assert.match(email, /if\(!box\.firstChild\) mountEmailForm\(box\);/);
  assert.doesNotMatch(report, /mountEmailForm\(|mountTurnstile\(/);
});

test('chat: sin botón "Empecemos"; la primera pregunta o una sugerencia aceptan el aviso', () => {
  assert.doesNotMatch(main, /bSTART_LABEL|Empecemos/);
  assert.match(main, /if\(t\)\{ acceptChat\(\);/);
  assert.match(main, /btn\.onclick = \(\)=>\{ acceptChat\(\);/);
  assert.match(main, /track\('agent_consent'/);
});

test('permiso de investigación: casilla opcional y desmarcada en el inicio, aparte de los Términos', async () => {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const start = html.slice(html.indexOf('id="chatStart"'), html.indexOf('id="tsBox"'));
  assert.match(start, /<input type="checkbox" id="researchStart">/); // sin "checked" ni "required"
  assert.doesNotMatch(start, /checked|required/);
  // inicio-v4: tarjeta destacada encima de "Empezar".
  assert.ok(start.indexOf('id="researchStart"') < start.indexOf('id="startBtn"'));
  assert.match(start, /class="start-research-title">¿Nos ayudas a investigar la menopausia en el Perú\?</);
  assert.match(start, /<summary>Más información<\/summary>/);
  assert.match(main, /const RESEARCH_VERSION = 'inicio-v4';/);
  // Segunda oportunidad en el reporte: solo si no la marcó, con un botón (nada marcado de antemano).
  assert.match(main, /\(BACKEND_ON && !state\.research \? researchAgainHtml\(id \+ 'r'\) : ''\)/);
  assert.match(main, /sendLead\(\{research:true, version:RESEARCH_AGAIN_VERSION\}\)/);
  assert.match(main, /track\('research_consent', \{captured:true, desde:'reporte'\}\);/);
  assert.doesNotMatch(main, /¿Me ayudas a mejorar Mindi\?|askResearchConsent/);
  assert.match(main, /state\.research = !!\(box && box\.checked\);/);
  assert.match(main, /if\(state\.research\) sendLead\(\{research:true, version:RESEARCH_VERSION\}\);/);
  assert.doesNotMatch(main, /data-chat-share|share-opt-inline/);
  // Sin burbuja tras la primera respuesta: enlace en la letra chica y una sola pregunta al salir o tras 2 min.
  assert.doesNotMatch(main, /maybeAskChatShare/);
  assert.match(main, /if\(!CHAT_RESEARCH_ENABLED \|\| chatShareOn \|\| chatShareAsked \|\| !chatPending\.length\) return Promise\.resolve\(\);/);
  assert.match(main, /idleT = setTimeout\(askShareAtEnd, 120000\)/);
});

test('chat: tarjeta de un botón (Aceptar) y la opción "Prefiero no compartir esta conversación" (chat-v3)', () => {
  assert.match(main, /class="consent-accept" data-accept>Aceptar<\/button>/);
  assert.match(main, /data-accept="sin">Prefiero no compartir esta conversación<\/button>/);
  assert.match(main, /me responda con IA \(OpenAI\)` \+\n\s+\(share \? ` y guarde esta conversación, sin mis datos de contacto`/);
  assert.match(main, /botSay\(\[greeting\.text, CONSENT_LEAD\]\)/);
  assert.match(main, /const SHARE_ACCEPT_VERSION = 'chat-v4';/);
  // El código de usuaria (recurrencia) solo existe si comparte con el texto de la tarjeta.
  assert.match(main, /const conv = chatShareOn && chatShareVersion === SHARE_ACCEPT_VERSION \? \{conversacion:chatConvId, usuaria:userCode\(\)\} : \{\};/);
  assert.match(main, /try\{ localStorage\.setItem\(USER_CODE_STORE, chatUserCode\); \}catch\{\}/);
  assert.match(main, /if\(share\) setChatShare\(!sin, sin \? null : SHARE_ACCEPT_VERSION\);/);
  assert.match(main, /const sin = btn\.dataset\.accept === 'sin';\n\s+acceptChat\(\);/);
});

test('chat: "¿Te sirvió?" una sola vez, tras la 2.ª respuesta, y se quita al tocarlo', () => {
  assert.match(main, /if\(agentReplies === 2\) askFeedback\(/);
  assert.match(main, /track\('agent_feedback', \{answer: b\.dataset\.fb, area, source:chatSource\}\);\n\s+row\.remove\(\);/);
});

test('inicio del test: saludo y nombre (opcional) antes de la primera pregunta', () => {
  const start = main.slice(main.indexOf('async function start('), main.indexOf('function askAge('));
  assert.match(start, /'¡Hola! Qué bueno tenerte aquí\.'/);
  assert.match(start, /\{text:'Antes de empezar, ¿cómo te gustaría que te llame\?', cls:'question'\}/);
  assert.match(start, /skipLabel:'Prefiero no decirlo'/);
  assert.ok(start.indexOf('¡Hola! Qué bueno tenerte aquí.') < start.indexOf('.then(askAge)'));
  assert.doesNotMatch(main, /function askName\(/);
});

test('cierre-v3: metas → ¿usarías una herramienta? → reporte (con satisfacción adentro) → cierre', () => {
  assert.match(main, /const FLOW_VERSION = 'cierre-v3';/);
  assert.match(main, /askToolInterest\(\); \/\/ cierre-v3/);
  const tool = main.slice(main.indexOf('function askToolInterest('), main.indexOf('function setupToggleForm('));
  assert.match(tool, /track\('tool_interest', \{answer:v\}\);/);
  assert.match(tool, /mountInlineWaitlist\(box, 'plus', \{origin:'reporte_diario'/);
  assert.equal((tool.match(/showReport/g) || []).length >= 3, true); // sí, tal vez/no y sin metas llegan al reporte
  assert.match(main, /closeFlow\(\); \/\/ cierre-v3: la satisfacción va dentro de la tarjeta del reporte/);
  // Evento nuevo para no mezclar con la serie anterior (otra pregunta y otro lugar).
  assert.match(main, /track\('report_satisfaction', \{answer:label, score\}\);/);
  assert.doesNotMatch(main, /track\('satisfaction'/);
  assert.match(main, /const SATISFACTION_QUESTION = '¿Te sirvió este resultado\?';/);
});

test('resultado: un solo desplegable "Entender mi resultado" con las tres áreas', () => {
  const card = main.slice(main.indexOf('function resultCard('), main.indexOf('const MENTAL_HEALTH_LINE'));
  assert.match(card, /<summary>Entender mi resultado<\/summary>/);
  assert.match(card, /const areaRows = AREAS\.map\(/); // las tres, no solo las que pasan el corte
  assert.doesNotMatch(card, /<summary>Ver las tres áreas en detalle|<summary>Qué significa este resultado/);
  assert.match(card, /Va de 0 a 44: tu puntaje es/);
});

test('reporte: "Tus metas", agendar cita (lista consultas) y diario (lista plus)', async () => {
  const { goalSteps, GOAL_OPTIONS } = await import('../supabase/functions/_shared/autocuidado.js');
  assert.equal(GOAL_OPTIONS.length, 9);
  assert.deepEqual(goalSteps(['Dormir mejor', 'otra cosa']).map(x => x[1]), ['Para dormir mejor']);
  assert.equal(goalSteps(GOAL_OPTIONS).length, 9); // cada meta tiene su primer paso
  assert.match(main, /mountInlineWaitlist\(box, 'consultas', \{origin:'reporte'/);
  assert.match(main, /mountInlineWaitlist\(box, 'plus', \{origin:'reporte_diario'/);
  assert.match(main, /const \{ error \} = waitlistRow\(list, values\);/);
});

test('el reporte no se pierde al volver a la página (sessionStorage, 24 h) y WhatsApp no saca de la página', () => {
  assert.match(main, /const REPORT_STORE = 'mindi_reporte';/);
  assert.match(main, /Date\.now\(\) - r\.ts < 864e5/);
  assert.match(main, /else if\(SAVED_REPORT\) restoreReport\(\);/);
  assert.match(main, /sessionStorage\.removeItem\(REPORT_STORE\); sessionStorage\.removeItem\(SESSION_STORE\);/);
  assert.doesNotMatch(main, /else location\.href = waShareUrl/);
  assert.doesNotMatch(main, /localStorage\.setItem\(REPORT_STORE/);
});

test('resultado corto: síntomas propios bajo cada barra y "pesan por igual" si empatan', () => {
  const card = main.slice(main.indexOf('function resultCard('), main.indexOf('const MENTAL_HEALTH_LINE'));
  assert.match(card, /<span class="area-symptoms/);
  assert.match(card, /const marked = markedSymptoms\(a\.key\);/);
  assert.match(card, /title = 'Tus tres áreas pesan por igual'/);
  assert.doesNotMatch(card, /class="result-chip"|class="area-also"|class="marked-title"/);
  assert.match(card, /if\(notes\.some\(n=> n\.key === 'psicologico'\)\) html \+= `<p class="mh-note">/);
});

test('pregunta de la herramienta: nombra todas las metas que eligió', () => {
  const src = main.slice(main.indexOf('function toolQuestion('), main.indexOf('function askToolInterest('));
  const toolQuestion = new Function(`${src}; return toolQuestion;`)();
  assert.equal(toolQuestion(['Dormir mejor']), 'Elegiste “Dormir mejor”. ¿Usarías una herramienta que te ayude a lograrlo día a día?');
  assert.equal(toolQuestion(['Aliviar la sequedad vaginal', 'Aliviar el dolor articular']),
    'Elegiste “Aliviar la sequedad vaginal” y “Aliviar el dolor articular”. ¿Usarías una herramienta que te ayude a lograrlas día a día?');
  assert.equal(toolQuestion(['a', 'b', 'c', 'd']), 'Elegiste 4 metas. ¿Usarías una herramienta que te ayude a lograrlas día a día?');
});

test('resumen del reporte: "Síntoma principal" no elige uno al azar si hay empate', () => {
  const src = main.slice(main.indexOf('function topSymptomRow('), main.indexOf('function reportSummary('));
  const items = [{id:'p3', short:'Bochornos / calores'}, {id:'p4', short:'Molestias del corazón'}, {id:'p9', short:'Ansiedad'}];
  const row = new Function('MRS_ITEMS', 'SCALE_LABELS', `${src}; return topSymptomRow;`)(items, ['Nada','Leve','Moderado','Fuerte','Muy fuerte']);
  assert.deepEqual(row({p3:3, p4:1, p9:2}), ['Síntoma principal', 'Bochornos / calores']);
  assert.deepEqual(row({p3:3, p4:1, p9:3}), ['Síntomas más fuertes', 'Bochornos / calores y Ansiedad']);
  assert.deepEqual(row({p3:3, p4:3, p9:3}), ['Síntomas más fuertes', '3 en nivel fuerte']);
  assert.deepEqual(row({}), ['Síntoma principal', 'Ninguno']);
});

test('reporte: sin "Ver el reporte completo"; dice qué trae el PDF y mantiene el aviso de orientación', () => {
  assert.doesNotMatch(main, /<summary>Ver el reporte completo<\/summary>/);
  assert.match(main, /<p class="card-note">\$\{pdfContents\(\)\}<\/p>/);
  assert.match(main, /`<p class="topics-disclaimer">\$\{DISCLAIMER\}<\/p>`, 'report'/);
});

test('scroll del chat: tarjetas largas desde su título y sin arrastrar a quien sube a leer', () => {
  assert.match(main, /if\(el\.offsetHeight <= chat\.clientHeight \* 0\.6\) return scrollBottom\(\);/);
  assert.match(main, /setChatScroll\(Math\.max\(0, topInChat\(el\.parentElement \|\| el\) - 12\)\);/);
  assert.match(main, /function addCard[\s\S]*?showFromTop\(c\);/);
  assert.match(main, /if\(followBottom\)\{ setChatScroll\(chat\.scrollHeight\); newBelow\.hidden = true; \}/);
  assert.match(main, /\['touchstart', 'wheel', 'keydown'\]\.forEach/);
  assert.match(main, /if\(who === 'user'\)\{ scrollAnchor = null; followBottom = true; \}/);
});

test('agendar cita: horarios tentativos (lun a sáb), opcionales y sin prometer una cita confirmada', async () => {
  const { tentativeDays, slotLabel, citaDoneText, SLOT_NOTE, SLOT_TIMES } = await import('../src/citas.js');
  const days = tentativeDays(new Date(2026, 10, 21)); // sábado 21
  assert.equal(days.length, 5);
  assert.ok(days.every((d) => d.getDay() !== 0)); // sin domingos
  assert.equal(days[0].getDate(), 23); // salta el domingo 22
  assert.equal(slotLabel(days[0], SLOT_TIMES[1]), 'lunes 23 · 3:00 p. m.');
  assert.ok(slotLabel(days[0], SLOT_TIMES[1]).length <= 40); // cabe en las props del evento
  assert.match(SLOT_NOTE, /te escribiremos para confirmar/);
  assert.equal(citaDoneText('lunes 23 · 3:00 p. m.'), '¡Listo! Guardamos tu horario preferido (lunes 23 · 3:00 p. m.). Te escribiremos para confirmar tu cita.');
  assert.doesNotMatch(citaDoneText('x'), /confirmada/);
  assert.match(main, /mountInlineWaitlist\(box, 'consultas', \{origin:'reporte'[^}]*slots:true\}\)/);
});

test('agendar cita: WhatsApp obligatorio, correo opcional, horario junto al contacto y aviso en lugar de casilla', async () => {
  const { waitlistRow, waitlistFields, WAITLIST_NOTICE } = await import('../src/landing.js');
  assert.deepEqual(waitlistFields('consultas').map((f) => [f.f, f.required]), [['name', true], ['whatsapp', true], ['email', false]]);
  assert.equal(waitlistFields('consultas')[2].label, 'Correo (opcional)');
  assert.deepEqual(waitlistRow('consultas', { name: 'Ana', whatsapp: '987 654 321', consent: true, horario: 'jueves 19 · 3:00 p. m.' }).row,
    { segment: 'consultas', name: 'Ana', whatsapp: '987654321', horario: 'jueves 19 · 3:00 p. m.' });
  assert.match(waitlistRow('consultas', { name: 'Ana', email: 'ana@mail.com', consent: true }).error, /WhatsApp/);
  assert.match(waitlistRow('plus', { name: 'Ana', whatsapp: '987654321', consent: true }).error, /Correo/); // el diario sigue pidiendo correo
  assert.equal(waitlistRow('plus', { name: 'Ana', email: 'a@b.co', consent: true, horario: 'x' }).row.horario, undefined);
  assert.match(WAITLIST_NOTICE, /Al enviar, aceptas/);
  assert.doesNotMatch(main, /name="consent"/);
  const { readFile } = await import('node:fs/promises');
  const sql = await readFile(new URL('../supabase/029_cita_whatsapp_horario.sql', import.meta.url), 'utf8');
  assert.match(sql, /alter column contact drop not null/);
  assert.match(sql, /check \(contact is not null or whatsapp is not null\)/);
});

test('agendar por WhatsApp: mensaje con el horario y sin datos de salud; landing y reporte', async () => {
  const { citaWhatsappText, SLOT_NOTE_WA } = await import('../src/citas.js');
  assert.equal(citaWhatsappText(null), 'Hola Mindi, quiero agendar una cita con un especialista.');
  assert.equal(citaWhatsappText('jueves 19 · 3:00 p. m.'),
    'Hola Mindi, quiero agendar una cita con un especialista. Horario que prefiero: jueves 19 · 3:00 p. m.');
  assert.doesNotMatch(citaWhatsappText('x'), /resultado|puntaje|síntoma|MRS/i); // sin datos de salud
  assert.match(SLOT_NOTE_WA, /coordinamos tu cita contigo por WhatsApp/);
  assert.match(main, /if\(WHATSAPP_NUMBER\) mountCitaWhatsapp\(box, \{waUrl:\(t\)=> whatsappUrl\(WHATSAPP_NUMBER, t\), desde:'reporte', track\}\);/);
  const { readFile } = await import('node:fs/promises');
  const landing = await readFile(new URL('../src/landing.js', import.meta.url), 'utf8');
  assert.match(landing, /if \(list === 'consultas' && whatsappTo\) \{/);
  assert.match(landing, /mountCitaWhatsapp\(dialog\.querySelector\('\.l-cita-body'\), \{ waUrl: whatsappTo, desde: 'landing', track \}\);/);
});

test('origen de la visita: TikTok, Instagram (antes que Facebook), Facebook, WhatsApp, Google y atajos ?src=', async () => {
  const { detectOrigin } = await import('../src/origen.js');
  const IG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.32.112 (iPhone14,5; iOS 17_0; es_PE)';
  const FB = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/440.0.0.33.111]';
  const TT = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 musical_ly_2023100030 BytedanceWebview/d8a21c6';
  const CHROME = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
  assert.equal(detectOrigin({ ua: TT }), 'tiktok');
  assert.equal(detectOrigin({ ua: IG }), 'instagram');
  assert.equal(detectOrigin({ ua: IG, search: '?fbclid=abc' }), 'instagram'); // Instagram también pone fbclid
  assert.equal(detectOrigin({ ua: CHROME, referrer: 'https://l.instagram.com/' }), 'instagram');
  assert.equal(detectOrigin({ ua: FB }), 'facebook');
  assert.equal(detectOrigin({ ua: CHROME, search: '?fbclid=abc' }), 'facebook');
  assert.equal(detectOrigin({ ua: CHROME, referrer: 'https://www.google.com/' }), 'google');
  assert.equal(detectOrigin({ ua: CHROME, referrer: 'https://www.google.com.pe/' }), 'google');
  assert.equal(detectOrigin({ ua: CHROME + ' WhatsApp/2.24' }), 'whatsapp');
  assert.equal(detectOrigin({ ua: CHROME, search: '?src=wa' }), 'whatsapp');
  assert.equal(detectOrigin({ ua: CHROME, search: '?src=ig' }), 'instagram');
  assert.equal(detectOrigin({ ua: CHROME, search: '?utm_source=TikTok' }), 'tiktok');
  assert.equal(detectOrigin({ ua: CHROME }), null); // WhatsApp sin navegador propio: no se puede saber
  assert.equal(detectOrigin({ ua: CHROME, referrer: 'https://mindifem.com/' }), null);
});


test('chat: la conversación se guarda en la pestaña (24 h) y se retoma con la misma sesión del agente', async () => {
  assert.match(main, /const CHAT_STORE = 'mindi_chat';/);
  assert.match(main, /if\(restoreChat\(topic\)\) return;/);
  assert.match(main, /Date\.now\(\) - s\.ts > 864e5 \|\| s\.key !== chatKey\(topic\)/);
  assert.match(main, /clearChat\(\); \/\/ con el resultado nuevo, el chat empieza de nuevo/);
  assert.doesNotMatch(main, /localStorage\.setItem\(CHAT_STORE/);
  const { createAgentClient } = await import('../src/agente.js');
  const calls = [];
  const fetchImpl = async (_, o) => { const b = JSON.parse(o.body); calls.push(b.action); return { ok: true, status: 200, json: async () => (b.action === 'message' ? { text: 'hola' } : { ok: true }) }; };
  const a = createAgentClient({ newId: () => '11111111-2222-4333-8444-555555555555', fetchImpl });
  await a.ask('primera');
  const snap = a.snapshot();
  const b = createAgentClient({ newId: () => '99999999-2222-4333-8444-555555555555', fetchImpl });
  assert.equal(b.restore(snap), true);
  calls.length = 0;
  await b.ask('segunda'); // misma sesión: no abre una nueva
  assert.deepEqual(calls, ['message']);
  assert.equal(b.snapshot().session, '11111111-2222-4333-8444-555555555555');
  assert.equal(b.restore({ session: 'no-es-un-uuid' }), false);
});

test('chat: el detalle del reporte va al agente solo con valores de listas cerradas', async () => {
  const { cleanResultado, SYMPTOM_IDS, AGE_OPTIONS, CYCLE_OPTIONS } = await import('../api/_lib/agente.js');
  const base = { total: 21, somatico: 10, psicologico: 8, urogenital: 3, senal_alerta: false };
  assert.deepEqual(cleanResultado({ ...base, sintomas: [{ id: 'p3', nivel: 4 }, { id: 'p99', nivel: 3 }, { id: 'p9', nivel: 1 }],
    metas: ['Dormir mejor', 'Recétame'], edad: '46 a 52', ciclo: 'otra cosa', nombre: 'Ana' }),
    { ...base, sintomas: [{ id: 'p3', nivel: 4 }], metas: ['Dormir mejor'], edad: '46 a 52' });
  assert.deepEqual(cleanResultado(base), base); // sin detalle, igual que antes
  // Las listas son las mismas opciones del test.
  for (const id of SYMPTOM_IDS) assert.match(main, new RegExp(`id:'${id}'`));
  for (const a of AGE_OPTIONS) assert.ok(main.includes(`label:'${a}'`), a);
  for (const c of CYCLE_OPTIONS) assert.ok(main.includes(`label:'${c}'`), c);
  assert.match(main, /sessionStorage\.setItem\(RESULT_STORE, JSON\.stringify\(agentTestContext\(\)\)\);/);
});
