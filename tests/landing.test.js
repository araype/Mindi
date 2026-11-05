// Tests de la landing nueva: listas de espera y rutas. Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { waitlistRow, WAITLISTS, WAITLIST_ROUTES } from '../src/landing.js';

test('lista Plus: nombre y correo obligatorios, WhatsApp opcional y solo dígitos', () => {
  assert.deepEqual(waitlistRow('plus', { name: ' Ana ', email: 'ana@mail.com', whatsapp: '', consent: true }).row,
    { segment: 'plus', name: 'Ana', contact: 'ana@mail.com' });
  assert.equal(waitlistRow('plus', { name: 'Ana', email: 'ana@mail.com', whatsapp: '+51 927 671 423', consent: true }).row.whatsapp, '51927671423');
  assert.match(waitlistRow('plus', { name: '', email: 'ana@mail.com', consent: true }).error, /Nombre/);
  assert.match(waitlistRow('plus', { name: 'Ana', email: 'ana@', consent: true }).error, /correo/);
  assert.match(waitlistRow('plus', { name: 'Ana', email: 'ana@mail.com', whatsapp: '123', consent: true }).error, /WhatsApp/);
});

test('sin la casilla de privacidad marcada no se guarda nada', () => {
  assert.match(waitlistRow('consultas', { name: 'Ana', email: 'ana@mail.com' }).error, /Política de privacidad/);
});

test('demo para empresas: empresa, cargo, n.º de colaboradoras y correo', () => {
  const ok = waitlistRow('empresas', { company: 'ACME', job_title: 'RR. HH.', team_size: '250', email: 'rh@acme.pe', consent: true });
  assert.deepEqual(ok.row, { segment: 'empresas', company: 'ACME', job_title: 'RR. HH.', team_size: 250, contact: 'rh@acme.pe' });
  assert.match(waitlistRow('empresas', { company: 'ACME', job_title: 'RR. HH.', team_size: '0', email: 'rh@acme.pe', consent: true }).error, /colaboradoras/);
  assert.match(waitlistRow('otra', {}).error, /desconocida/);
});

test('las cuatro listas usan los segmentos que acepta el SQL 017', async () => {
  const sql = await readFile(new URL('../supabase/017_listas_espera.sql', import.meta.url), 'utf8');
  for (const k of Object.keys(WAITLISTS)) assert.match(sql, new RegExp(`'${k}'`));
});

test('rutas cortas: vercel.json reescribe /test, /chat, /empresas y /especialistas a la landing', async () => {
  const v = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(v.cleanUrls, true); // /terminos y /privacidad
  const sources = v.rewrites.map((r) => r.source);
  for (const p of ['/test', '/chat', ...Object.keys(WAITLIST_ROUTES)]) assert.ok(sources.includes(p), p);
  // Con cleanUrls, Vercel no sirve /index.html (lo redirige a /): un rewrite a "/index.html" da 404.
  for (const r of v.rewrites) assert.ok(!/\.html$/.test(r.destination), `${r.source} → ${r.destination}`);
  // Lo de arriba no prueba el despliegue real: para eso, npm run check:rutas -- <URL> (scripts/rutas.mjs).
});

test('lenguaje genérico para profesionales de la salud (punto 8): sin formas en femenino ni "(a)"', async () => {
  const files = ['../index.html', '../terminos.html', '../privacidad.html', '../src/main.js', '../src/landing.js',
    '../supabase/functions/_shared/mrs.js', '../supabase/functions/_shared/notas.js', '../supabase/functions/_shared/autocuidado.js',
    '../supabase/functions/send-report/index.ts'];
  for (const f of files) {
    const s = await readFile(new URL(f, import.meta.url), 'utf8');
    assert.doesNotMatch(s, /tu médica|mi médica|la médica|doctora|ginecóloga|psicóloga|una especialista|médico\(a\)|ginecólogo\(a\)/, f);
  }
});
