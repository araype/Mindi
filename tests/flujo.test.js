// Tests del modo guiado del chat: debe ser el MISMO test que siempre, sin copias.
// El flujo vive una sola vez en src/main.js; el modo libre (agente) solo lo llama. Correr con: npm test
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

test('las dos entradas al test usan el mismo start(), después del consentimiento', () => {
  const startBtn = main.slice(main.indexOf("getElementById('startBtn').addEventListener"));
  assert.match(startBtn.slice(0, 300), /track\('consent_accept'[\s\S]*start\(\);/);
  const fromAgent = main.slice(main.indexOf('function startTestFromAgent('));
  assert.match(fromAgent.slice(0, 700), /Acepto y empiezo[\s\S]*track\('consent_accept'[\s\S]*start\(\);/);
});

test('el puntaje y el nivel salen solo del módulo compartido', () => {
  assert.match(main, /function computeScores\(\)\{ Object\.assign\(state\.scores, mrsScores\(state\.answers\)\); \}/);
  assert.match(main, /function computeLevel\(\)\{ return mrsLevel\(state\.scores\); \}/);
  assert.match(main, /from '\.\.\/supabase\/functions\/_shared\/mrs\.js'/);
});

test('el modo libre no muestra el campo de texto durante el test', () => {
  // start() (modo guiado) apaga el modo libre; el campo solo se dibuja en renderQuestionInput,
  // que se llama desde el modo libre, nunca desde los pasos del test.
  assert.match(main.slice(main.indexOf('async function start('), main.indexOf('async function start(') + 300), /freeActive = false/);
  const steps = main.slice(main.indexOf('function askAge('), main.indexOf('/* ---------- Modo libre'));
  assert.doesNotMatch(steps, /renderQuestionInput\(/);
});

test('al terminar el test o la salida del filtro, la conversación sigue en modo libre', () => {
  assert.match(main, /channelInvite\('final'\)\)\.then\(\(\)=> afterGuided\(true\)\)/);
  assert.equal(count(/channelInvite\('filtro'\)\)\.then\(\(\)=> afterGuided\(false\)\)/g), 2);
});
