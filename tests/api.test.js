// Tests de las rutas /api de la Fase 4 (validación, cifrado, límites, Turnstile, Cloud Run privado,
// cabeceras). Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { sessionRow, eventRow, leadRequest, interestRow, OPTIONS } from '../api/_lib/validar.js';
import { encryptContact, decryptContact } from '../api/_lib/cifrado.js';
import { limit } from '../api/_lib/limite.js';
import { verifyTurnstile } from '../api/_lib/turnstile.js';
import { agentAuthorization } from '../api/_lib/gcp.js';

const ID = '11111111-2222-4333-8444-555555555555';
const answers = { p3: 3, p4: 1, p5: 2, p6: 3, p7: 2, p8: 3, p9: 1, p10: 2, p11: null, p12: 1, p13: 2 };
const session = {
  id: ID, age_range: '46 a 52', cycle: 'Es irregular (varía o se retrasa)', smoking: 'No fumo', obesity: 'No',
  family_breast_ca: 'No', migraine: 'Sí, sin aura', current_treatment: 'No uso ningún tratamiento', answers, red_flags: ['none'], is_test: true,
};

test('sesión: el puntaje y el nivel se recalculan en el servidor; lo que manda el navegador no cuenta', () => {
  const { row } = sessionRow({ ...session, score_total: 0, level: 'A' });
  assert.equal(row.score_total, 20);
  assert.equal(row.score_somatico, 9);
  assert.equal(row.level, 'C');
  assert.equal(row.skipped_intimate, true);
  assert.equal(sessionRow({ ...session, red_flags: ['rf2'] }).row.level, 'alert');
});

test('sesión: rechaza respuestas fuera de 0–4, ítems de más o de menos, opciones inventadas y banderas raras', () => {
  assert.ok(sessionRow({ ...session, answers: { ...answers, p3: 5 } }).error);
  assert.ok(sessionRow({ ...session, answers: { ...answers, p3: null } }).error); // solo p11 y p13 se pueden omitir
  assert.ok(sessionRow({ ...session, answers: { ...answers, p99: 1 } }).error);
  assert.ok(sessionRow({ ...session, smoking: 'A veces' }).error);
  assert.ok(sessionRow({ ...session, red_flags: ['none', 'rf1'] }).error);
  assert.ok(sessionRow({ ...session, red_flags: ['rf9'] }).error);
  assert.ok(sessionRow({ ...session, id: 'x' }).error);
});

test('las opciones que valida el servidor son exactamente las que muestra el test', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const [k, list] of Object.entries(OPTIONS)) for (const o of list) assert.ok(main.includes(`'${o}'`), `${k}: ${o}`);
});

test('eventos: solo nombre y datos de uso; nunca nivel, señales, metas, correos ni campos desconocidos', () => {
  const r = eventRow({ session_id: ID, name: 'cta_click', props: { source: 'hero', email: 'a@b.pe', foo: 1, q: 'x@y.com', is_test: true } });
  assert.deepEqual(r.row.props, { is_test: true, source: 'hero' });
  assert.deepEqual(eventRow({ session_id: ID, name: 'result', props: { level: 'C', emergency: true } }).row.props, { is_test: false });
  assert.deepEqual(eventRow({ session_id: ID, name: 'goals', props: { selected: ['Dormir mejor'] } }).row.props, { is_test: false });
  assert.ok(eventRow({ session_id: ID, name: 'DROP TABLE' }).error);
});

test('copia por correo: correo válido; avisos sin correo no; investigación sola sí', () => {
  assert.equal(leadRequest({ session_id: ID, email: 'ana@mail.com', consent_text_version: 'v1' }).lead.email, 'ana@mail.com');
  assert.ok(leadRequest({ session_id: ID, email: 'ana@', consent_text_version: 'v1' }).error);
  assert.ok(leadRequest({ session_id: ID, news: true, consent_text_version: 'v1' }).error);
  const r = leadRequest({ session_id: ID, research: true, consent_text_version: 'v1' });
  assert.equal(r.research, true); assert.equal(r.lead, undefined);
  assert.ok(interestRow({ email: 'a@b.pe', segment: 'plus', consent_text_version: 'v1' }).error);
});

test('el correo se guarda cifrado (AES-256-GCM) y solo se lee con la clave', () => {
  process.env.LEADS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
  const enc = encryptContact('ana@mail.com');
  assert.match(enc, /^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  assert.ok(!enc.includes('ana'));
  assert.notEqual(encryptContact('ana@mail.com'), enc); // IV aleatorio
  assert.equal(decryptContact(enc), 'ana@mail.com');
  assert.ok(enc.length <= 400); // cabe en leads.contact (SQL 019)
  process.env.LEADS_ENC_KEY = Buffer.alloc(32, 8).toString('base64');
  assert.throws(() => decryptContact(enc));
  delete process.env.LEADS_ENC_KEY;
  assert.throws(() => encryptContact('x@y.pe'), /LEADS_ENC_KEY/);
});

test('límite por IP: corta al pasar el máximo (contador en memoria sin Upstash)', async () => {
  const ip = '203.0.113.' + Math.floor(Math.random() * 200);
  for (let i = 0; i < 3; i++) assert.ok((await limit('t', ip, 3, 60)).ok);
  assert.equal((await limit('t', ip, 3, 60)).ok, false);
  assert.ok((await limit('t', ip + '9', 3, 60)).ok); // otra IP, otro contador
});

test('Turnstile: sin secreto no se pide; con secreto, sin token válido no pasa', async () => {
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal(await verifyTurnstile('', '1.1.1.1'), true);
  process.env.TURNSTILE_SECRET_KEY = 'secreto';
  const fake = (ok) => async () => ({ json: async () => ({ success: ok }) });
  assert.equal(await verifyTurnstile('', '1.1.1.1', fake(true)), false);
  assert.equal(await verifyTurnstile('tok', '1.1.1.1', fake(false)), false);
  assert.equal(await verifyTurnstile('tok', '1.1.1.1', fake(true)), true);
  delete process.env.TURNSTILE_SECRET_KEY;
});

test('Cloud Run privado: firma el JWT con la cuenta de servicio y manda el ID token', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.GCP_SA_KEY = JSON.stringify({ client_email: 'web@mindi.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
  let sent;
  const fakeFetch = async (url, init) => { sent = { url, body: new URLSearchParams(init.body) }; return { ok: true, json: async () => ({ id_token: 'IDTOKEN' }) }; };
  assert.equal(await agentAuthorization('https://agente.run.app', fakeFetch), 'Bearer IDTOKEN');
  assert.equal(sent.url, 'https://oauth2.googleapis.com/token');
  const [h, p, sig] = sent.body.get('assertion').split('.');
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
  assert.equal(claims.target_audience, 'https://agente.run.app');
  assert.ok(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, sig, 'base64url'));
  delete process.env.GCP_SA_KEY;
  assert.equal(await agentAuthorization('https://otro.run.app', fakeFetch), ''); // sin cuenta: sin token
});

test('el navegador no tiene claves de Supabase ni le escribe directo', async () => {
  for (const f of await readdir(new URL('../src/', import.meta.url))) {
    if (!f.endsWith('.js')) continue;
    const s = await readFile(new URL(`../src/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(s, /VITE_SUPABASE|\/rest\/v1|\/functions\/v1|service_role/, f);
  }
});

test('cabeceras de seguridad en vercel.json (11.3)', async () => {
  const v = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const all = Object.fromEntries(v.headers.find((h) => h.source === '/(.*)').headers.map((h) => [h.key, h.value]));
  for (const k of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) assert.ok(all[k], k);
  const csp = all['Content-Security-Policy'];
  const script = csp.split(';').find((d) => d.trim().startsWith('script-src'));
  assert.doesNotMatch(script, /unsafe-inline|unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /font-src 'self'/); // fuentes alojadas en el sitio
  for (const page of ['index.html', 'terminos.html', 'privacidad.html', 'reporte.html', 'panel.html']) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/, page);
    assert.doesNotMatch(html, /<script>(?!<\/script>)/, page); // sin scripts en línea
  }
});

test('listas de espera: nombres de lista raros no rompen la validación del servidor', async () => {
  const { waitlistRow } = await import('../src/landing.js');
  for (const list of ['__proto__', 'constructor', 'toString', 1, null]) assert.match(waitlistRow(list, {}).error, /desconocida/);
  assert.match(waitlistRow('plus', null).error, /desconocida/);
});
