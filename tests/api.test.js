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

test('evento chat_open: el tema va como dato de uso', () => {
  assert.deepEqual(eventRow({ session_id: ID, name: 'chat_open', props: { tema: 'peso', is_test: true } }).row.props, { is_test: true, tema: 'peso' });
});

// ---------- Fase 4, segunda vuelta: hallazgos 5, 6, 7 y 13 ----------
const fakeRes = () => { const r = { code: 0, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; }, end() { return r; }, setHeader() {} }; return r; };
const JSONH = { 'content-type': 'application/json', origin: 'https://mindifem.com' };

test('las rutas /api solo aceptan JSON (415 con text/plain o sin tipo)', async () => {
  const { default: track } = await import('../api/track.js');
  for (const headers of [{ 'content-type': 'text/plain' }, {}, { 'content-type': 'application/x-www-form-urlencoded' }]) {
    const res = fakeRes(); await track({ method: 'POST', url: '/api/track', headers, body: '{}' }, res);
    assert.equal(res.code, 415, JSON.stringify(headers));
  }
  const res = fakeRes(); await track({ method: 'POST', url: '/api/track', headers: { 'content-type': 'application/json; charset=utf-8' }, body: '{}' }, res);
  assert.equal(res.code, 400); // pasa el filtro de tipo; falla por el cuerpo vacío
});

test('en producción, si falta una variable de seguridad la ruta no atiende (falla cerrado)', async () => {
  const saved = { ...process.env };
  try {
    process.env.VERCEL_ENV = 'production';
    for (const k of ['SUPABASE_URL', 'SUPABASE_KEY', 'ALLOWED_ORIGINS', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'RATE_LIMIT_SALT', 'TURNSTILE_SECRET_KEY', 'SEND_REPORT_SECRET', 'LEADS_ENC_KEY', 'GCP_SA_KEY', 'AGENT_URL']) delete process.env[k];
    for (const name of ['track', 'session', 'lead', 'report', 'waitlist', 'stats', 'agent']) {
      const { default: h } = await import(`../api/${name}.js`);
      const res = fakeRes(); await h({ method: 'POST', url: `/api/${name}`, headers: JSONH, body: '{}' }, res);
      assert.equal(res.code, 503, name);
    }
    const { originAllowed } = await import('../api/_lib/http.js');
    assert.equal(originAllowed({ headers: { origin: 'https://otro.com' } }), false); // sin ALLOWED_ORIGINS: cerrado
    assert.equal(await verifyTurnstile('', '1.1.1.1'), false);                      // sin secreto: no pasa
    assert.equal((await limit('x', '9.9.9.9', 100, 60)).ok, false);                  // sin Upstash: no pasa
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
});

test('el token del reporte no va en la URL: /api/report lo recibe en el cuerpo y no registra la consulta', async () => {
  const report = await readFile(new URL('../api/report.js', import.meta.url), 'utf8');
  assert.doesNotMatch(report, /searchParams|methods: \['GET'/);
  const http = await readFile(new URL('../api/_lib/http.js', import.meta.url), 'utf8');
  assert.doesNotMatch(http, /console\.error\([^)]*req\.url/);
  const page = await readFile(new URL('../src/reporte.js', import.meta.url), 'utf8');
  assert.match(page, /location\.hash/);
  assert.doesNotMatch(page, /api\/report\?t=/);
  const fn = await readFile(new URL('../supabase/functions/send-report/index.ts', import.meta.url), 'utf8');
  assert.match(fn, /reporte\.html#t=\$\{token\}/);
});

test('límites: 15 por hora para la copia por correo y las listas de espera', async () => {
  const { LIMITS } = await import('../api/_lib/limite.js');
  assert.deepEqual(LIMITS.lead, [15, 3600]);
  assert.deepEqual(LIMITS.waitlist, [15, 3600]);
});

test('funciones de Supabase: usan la clave secreta nueva si está, y la service_role antigua si no', async () => {
  const { serverKey } = await import('../supabase/functions/_shared/clave.js');
  const env = (vars) => { globalThis.Deno = { env: { get: (k) => vars[k] } }; };
  try {
    env({ SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_nueva' }), SUPABASE_SERVICE_ROLE_KEY: 'eyJ.antigua' });
    assert.equal(serverKey(), 'sb_secret_nueva');
    env({ SUPABASE_SECRET_KEYS: JSON.stringify({ otra: 'sb_secret_otra' }), SUPABASE_SERVICE_ROLE_KEY: 'eyJ.antigua' });
    assert.equal(serverKey(), 'sb_secret_otra');
    env({ SUPABASE_SECRET_KEYS: 'no es json', SUPABASE_SERVICE_ROLE_KEY: 'eyJ.antigua' });
    assert.equal(serverKey(), 'eyJ.antigua');
    env({ SUPABASE_SERVICE_ROLE_KEY: 'eyJ.antigua' });
    assert.equal(serverKey(), 'eyJ.antigua');
  } finally { delete globalThis.Deno; }
});

test('filtro de datos personales del nivel 2', async () => {
  const { redact } = await import('../api/_lib/redactar.js');
  assert.equal(redact('Me llamo Ana Pérez y tengo 47 años'), 'Me llamo [nombre] y tengo 47 años');
  assert.equal(redact('soy diabética y tengo bochornos'), 'soy diabética y tengo bochornos');
  assert.equal(redact('Mi correo es ana.p@gmail.com'), 'Mi correo es [correo]');
  assert.equal(redact('al 987 654 321 o +51 987-654-321'), 'al [teléfono] o [teléfono]');
  assert.equal(redact('mi DNI 12345678'), 'mi DNI [DNI]');
  assert.equal(redact('vivo en Av. Los Olivos 123, Lima'), 'vivo en [dirección], Lima');
  assert.equal(redact('tomo 2 pastillas de 50 mg a los 52 años'), 'tomo 2 pastillas de 50 mg a los 52 años');
});

test('listas: /api/waitlist guarda nombre, correo y WhatsApp cifrados; la exportación los descifra igual', async () => {
  process.env.LEADS_ENC_KEY = Buffer.alloc(32, 9).toString('base64');
  const { encryptContact } = await import('../api/_lib/cifrado.js');
  const { decryptContact } = await import('../supabase/functions/_shared/descifrar.js');
  const enc = encryptContact('rh@acme.pe');
  assert.equal(await decryptContact(enc, process.env.LEADS_ENC_KEY), 'rh@acme.pe'); // Node cifra, la función de Supabase descifra
  assert.equal(await decryptContact('vieja@mail.com', process.env.LEADS_ENC_KEY), 'vieja@mail.com'); // filas sin cifrar
  const src = await readFile(new URL('../api/waitlist.js', import.meta.url), 'utf8');
  assert.match(src, /const ENCRYPTED = \['name', 'contact', 'whatsapp'\]/);
  delete process.env.LEADS_ENC_KEY;
});
