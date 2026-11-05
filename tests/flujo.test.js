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
  assert.match(main, /if\(reply\.action === 'recommend_test'\) recommendTest\(\);/);
  const fn = main.slice(main.indexOf('function recommendTest('), main.indexOf('function recommendTest(') + 600);
  assert.match(fn, /if\(chatResult \|\| testRecommendations >= MAX_TEST_RECOMMENDATIONS\) return;/);
  assert.match(fn, /href="\/test\?origen=chat"/);
  assert.match(fn, /track\('chat_test_recommended'/);
  assert.match(main, /const MAX_TEST_RECOMMENDATIONS = 2;/);
  assert.match(main, /track\('chat_to_test'\);\s*releaseSessionId\(\);/);
});

test('al terminar el test o la salida del filtro se ofrece ir al chat con IA', () => {
  assert.match(main, /channelInvite\('final'\)\)\.then\(\(\)=> afterGuided\(true\)\)/);
  assert.equal(count(/channelInvite\('filtro'\)\)\.then\(\(\)=> afterGuided\(false\)\)/g), 2);
});

test('reporte: banderas rojas en palabras y "Compartir con mi médico" comparte /reporte (30 días), no el PDF', () => {
  assert.match(main, /señal' : 'señales'\} de alerta/);
  const share = main.slice(main.indexOf('function requestShareLink('), main.indexOf('/* Del resultado al chat con IA'));
  assert.match(share, /action:'share'/);
  assert.doesNotMatch(share, /pdfUrl|files:/);
  assert.match(main, /Copiamos el enlace a tu reporte\. Vence en 30 días\./);
  assert.match(main, />Compartir con mi médico</);
});

test('chat: sin botón "Empecemos"; la primera pregunta o una sugerencia aceptan el aviso', () => {
  assert.doesNotMatch(main, /START_LABEL|Empecemos/);
  assert.match(main, /if\(t\)\{ acceptChat\(\);/);
  assert.match(main, /btn\.onclick = \(\)=>\{ acceptChat\(\);/);
  assert.match(main, /track\('agent_consent'/);
});
