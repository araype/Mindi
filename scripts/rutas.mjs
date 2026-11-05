// Mindi · Revisa las rutas del sitio contra un despliegue real (Vercel), no contra el servidor local:
// en local, vite.config.js atiende /test, /chat, … y no se notaría un error de vercel.json.
//
// Uso:  npm run check:rutas -- https://mindi-rediseno.vercel.app
// Si la vista previa tiene Deployment Protection, pasa la clave de bypass de Vercel (Project →
// Settings → Deployment Protection → Protection Bypass for Automation):
//       VERCEL_BYPASS=<clave> npm run check:rutas -- https://mindi-rediseno.vercel.app
// Sin clave, el script usa `npx vercel curl` (necesita la sesión del CLI de Vercel).
import { execFileSync } from 'node:child_process';

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!/^https:\/\//.test(base)) { console.error('Falta la URL: npm run check:rutas -- https://…'); process.exit(2); }
const TOKEN = '11111111-2222-4333-8444-555555555555'; // token inventado: la página carga y muestra "venció"

/* [ruta, código esperado, texto que debe aparecer en el HTML, destino de la redirección si la hay] */
const CHECKS = [
  ['/', 200, 'class="l-landing"'],
  ['/test', 200, 'id="conversar"'],
  ['/test?origen=chat', 200, 'id="conversar"'],
  ['/chat', 200, 'id="conversar"'],
  ['/chat?tema=peso', 200, 'id="conversar"'],
  ['/empresas', 200, 'id="waitlist"'],
  ['/especialistas', 200, 'id="waitlist"'],
  ['/reporte', 200, 'id="reportBox"'],
  [`/reporte?t=${TOKEN}`, 200, 'id="reportBox"'],
  [`/reporte.html?t=${TOKEN}`, 308, null, `/reporte?t=${TOKEN}`], // enlaces de los correos: conservan ?t=
  ['/terminos', 200, '<main class="legal">'],
  ['/privacidad', 200, '<main class="legal">'],
  ['/index.html', 308, null, '/'],
];

async function get(path) {
  const url = base + path;
  if (process.env.VERCEL_BYPASS) {
    const r = await fetch(url, { redirect: 'manual', headers: { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS } });
    return { status: r.status, location: r.headers.get('location') || '', body: r.status === 200 ? await r.text() : '' };
  }
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const out = execFileSync(npx, ['--yes', 'vercel@65.11.0', 'curl', url, '--', '-s', '-i'], { encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 20e6 });
  const [head, ...rest] = out.split(/\r?\n\r?\n/);
  const status = Number((head.match(/^HTTP\/[\d.]+ (\d+)/m) || [])[1]);
  const location = ((head.match(/^location: *(.+)$/im) || [])[1] || '').trim();
  return { status, location, body: rest.join('\n\n') };
}

let failed = 0;
for (const [path, status, text, redirect] of CHECKS) {
  const r = await get(path);
  const problems = [];
  if (r.status !== status) problems.push(`código ${r.status}, se esperaba ${status}`);
  if (text && !r.body.includes(text)) problems.push(`no aparece ${text}`);
  if (redirect && !(r.location === redirect || r.location === base + redirect)) problems.push(`redirige a "${r.location}", se esperaba "${redirect}"`);
  console.log(`${problems.length ? 'MAL' : 'ok '}  ${String(r.status).padEnd(4)} ${path}${problems.length ? '  ← ' + problems.join('; ') : ''}`);
  if (problems.length) failed++;
}
console.log(failed ? `\n${failed} ruta(s) con problemas.` : '\nTodas las rutas responden como se espera.');
process.exit(failed ? 1 : 0);
