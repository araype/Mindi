// Tests del puente con el agente (api/_lib/agente.js y api/agent.js), sin red. Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanResultado, cleanText, extractReply, callAgent, validSession, MAX_TEXT } from '../api/_lib/agente.js';
import handler from '../api/agent.js';
import { agentMrsResult, computeScores } from '../supabase/functions/_shared/mrs.js';

const SESSION = '3f2b8a1e-4c5d-4e6f-8a9b-0c1d2e3f4a5b';

test('resultado_mrs: pasa lo que arma la web y nada más', () => {
  const web = agentMrsResult(computeScores({ p3: 4, p7: 3, p12: 2 }), true);
  assert.deepEqual(cleanResultado(web), web);
  assert.deepEqual(cleanResultado({ ...web, nombre: 'Ana', respuestas: { p3: 4 } }), web);
  assert.equal(cleanResultado({ ...web, somatico: 99 }), null);
  assert.equal(cleanResultado({ total: '9' }), null);
  assert.equal(cleanResultado(null), null);
});

test('mensaje: sin vacíos y con largo máximo', () => {
  assert.equal(cleanText('  hola  '), 'hola');
  assert.equal(cleanText('   '), null);
  assert.equal(cleanText('a'.repeat(MAX_TEXT + 1)), null);
  assert.equal(cleanText(42), null);
});

test('sesión: solo UUID', () => {
  assert.ok(validSession(SESSION));
  assert.ok(!validSession('ana@correo.com'));
  assert.ok(!validSession(undefined));
});

test('respuesta del agente: el último texto y el área que respondió', () => {
  const events = [
    { author: 'mindi', content: { parts: [{ functionCall: { name: 'transfer_to_agent' } }] } },
    { author: 'hormonal', content: { parts: [{ text: 'Los bochornos ' }, { text: 'son frecuentes.' }] } },
  ];
  assert.deepEqual(extractReply(events), { text: 'Los bochornos son frecuentes.', area: 'hormonal' });
  assert.equal(extractReply([]), null);
  assert.equal(extractReply({}), null);
});

function fakeFetch(handlerFn) {
  const calls = [];
  const f = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return handlerFn(url); };
  f.calls = calls;
  return f;
}
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

test('crear sesión: manda resultado_mrs en el estado', async () => {
  const f = fakeFetch(() => json(200, {}));
  const r = { total: 9, somatico: 4, psicologico: 3, urogenital: 2, senal_alerta: false };
  await callAgent({ agentUrl: 'https://agente.test/', action: 'start', session: SESSION, resultado: r }, f);
  assert.equal(f.calls[0].url, `https://agente.test/apps/mindi_agent/users/${SESSION}/sessions`);
  assert.deepEqual(f.calls[0].body, { session_id: SESSION, state: { resultado_mrs: r } });
});

test('errores del agente: sesión perdida (404) y caída (500)', async () => {
  await assert.rejects(callAgent({ agentUrl: 'https://a.test', action: 'message', session: SESSION, text: 'hola' }, fakeFetch(() => json(404, {}))), /session_lost/);
  await assert.rejects(callAgent({ agentUrl: 'https://a.test', action: 'message', session: SESSION, text: 'hola' }, fakeFetch(() => json(500, {})), 45000, 0), /agent_unavailable/);
  await assert.rejects(callAgent({ agentUrl: '', action: 'start', session: SESSION }), /agent_not_configured/);
});

function fakeRes() {
  const res = { code: 0, body: null };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

test('la ruta rechaza lo que no debe llegar al agente', async () => {
  for (const body of [
    { action: 'message', session: 'no-uuid', text: 'hola' },
    { action: 'message', session: SESSION, text: '' },
    { action: 'start', session: SESSION, resultado_mrs: { total: 'mucho' } },
    { action: 'borrar', session: SESSION },
  ]) {
    const res = fakeRes();
    await handler({ method: 'POST', body }, res);
    assert.equal(res.code, 400, JSON.stringify(body));
  }
  const res = fakeRes();
  await handler({ method: 'GET' }, res);
  assert.equal(res.code, 405);
});

test('el texto del agente se muestra sin HTML propio: solo párrafos, viñetas y negrita', async () => {
  const { agentHtml } = await import('../src/agenteChat.js');
  assert.equal(agentHtml('Hola **Ana**.\n\nOtra idea'), '<p>Hola <strong>Ana</strong>.</p><p>Otra idea</p>');
  assert.equal(agentHtml('- uno\n- dos'), '<ul><li>uno</li><li>dos</li></ul>');
  assert.equal(agentHtml('<img src=x onerror=alert(1)>'), '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
});

test('si el agente falla al despertar (5xx), se reintenta una sola vez', async () => {
  let n = 0;
  const f = fakeFetch(() => (++n === 1 ? json(503, {}) : json(200, [{ author: 'mindi', content: { parts: [{ text: 'Hola' }] } }])));
  const r = await callAgent({ agentUrl: 'https://a.test', action: 'message', session: SESSION, text: 'hola' }, f, 45000, 0);
  assert.equal(r.text, 'Hola');
  assert.equal(f.calls.length, 2);
  const g = fakeFetch(() => json(400, {}));
  await assert.rejects(callAgent({ agentUrl: 'https://a.test', action: 'message', session: SESSION, text: 'hola' }, g, 45000, 0), /agent_unavailable/);
  assert.equal(g.calls.length, 1); // ante 4xx no se reintenta
});
