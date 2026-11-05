// Mindi · Cifra los contactos que quedaron en texto plano (hallazgo 4). Ver docs/cifrado-contactos.md.
//
//   node scripts/cifrar-contactos.mjs              → solo CUENTA cuántos valores faltan cifrar (no cambia nada)
//   node scripts/cifrar-contactos.mjs --cifrar     → los cifra (se puede repetir: salta lo ya cifrado)
//   node scripts/cifrar-contactos.mjs --descifrar  → vuelve atrás (solo si algo salió mal)
//
// Lee las claves de .env.migracion (en la raíz, fuera de git por el patrón .env* del .gitignore):
//   SUPABASE_URL=…   SUPABASE_SECRET_KEY=sb_secret_…   LEADS_ENC_KEY=…
// Nunca imprime claves, correos, nombres ni números: solo cuentas por tabla y columna.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILE = path.join(ROOT, '.env.migracion');
if (!existsSync(FILE)) { console.error('Falta .env.migracion en la raíz del proyecto (ver docs/cifrado-contactos.md).'); process.exit(2); }
for (const line of readFileSync(FILE, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const URL_ = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SECRET_KEY || '';
for (const [k, v] of [['SUPABASE_URL', URL_], ['SUPABASE_SECRET_KEY', KEY], ['LEADS_ENC_KEY', process.env.LEADS_ENC_KEY]]) {
  if (!v) { console.error(`Falta ${k} en .env.migracion.`); process.exit(2); }
}
const { encryptContact, decryptContact } = await import('../api/_lib/cifrado.js');
try { encryptContact('prueba'); } catch { console.error('LEADS_ENC_KEY no es una clave válida (32 bytes en base64).'); process.exit(2); }

/* Qué se cifra: el correo de leads y su copia en reports, y los datos personales de las listas. */
const TARGETS = [
  { table: 'leads', cols: ['contact'] },
  { table: 'reports', cols: ['contact'] },
  { table: 'interest_signups', cols: ['name', 'contact', 'whatsapp'] },
  { table: 'event_signups', cols: ['name', 'contact'] },
];
const MODE = process.argv.includes('--cifrar') ? 'cifrar' : process.argv.includes('--descifrar') ? 'descifrar' : 'contar';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function rest(pathAndQuery, init = {}) {
  const r = await fetch(`${URL_}/rest/v1/${pathAndQuery}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${init.method || 'GET'} ${pathAndQuery.split('?')[0]}: ${r.status}`);
  return r;
}
/* Filtro de PostgREST: valores en texto plano (no vacíos y sin el prefijo v1:), o cifrados. */
const plain = (c) => `${c}=not.is.null&${c}=not.like.v1:*`;
const cipher = (c) => `${c}=like.v1:*`;

async function count(table, filter) {
  const r = await rest(`${table}?select=id&${filter}`, { headers: { Prefer: 'count=exact', Range: '0-0' } });
  return Number((r.headers.get('content-range') || '*/0').split('/')[1]) || 0;
}

let total = 0;
for (const { table, cols } of TARGETS) {
  for (const c of cols) {
    const filter = MODE === 'descifrar' ? cipher(c) : plain(c);
    const n = await count(table, filter);
    total += n;
    if (MODE === 'contar') { console.log(`${table}.${c}: ${n} sin cifrar · ${await count(table, cipher(c))} ya cifrados`); continue; }
    let done = 0;
    while (true) {
      const rows = await (await rest(`${table}?select=id,${c}&${filter}&order=id&limit=200`)).json();
      if (!rows.length) break;
      for (const row of rows) {
        const value = MODE === 'cifrar' ? encryptContact(row[c]) : decryptContact(row[c]);
        await rest(`${table}?id=eq.${row.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ [c]: value }) });
        done++;
      }
    }
    console.log(`${table}.${c}: ${done} ${MODE === 'cifrar' ? 'cifrados' : 'descifrados'}`);
  }
}
if (MODE === 'contar') console.log(`\nTotal sin cifrar: ${total}. No se cambió nada. Para cifrar: node scripts/cifrar-contactos.mjs --cifrar`);
else console.log(`\nListo. Comprueba con: node scripts/cifrar-contactos.mjs (debe dar 0 sin cifrar).`);
