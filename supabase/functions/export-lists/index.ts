// Edge Function: export-lists
//
// Exportación de las listas, descifradas, para el equipo (panel → /api/export → aquí). Solo con la
// clave del panel (x-admin-key = ADMIN_KEY) y el secreto del servidor de la web (x-mindi-secret).
// Devuelve un CSV. En el log queda solo qué lista se exportó y cuántas filas, nunca los datos.
//
//   { list: 'plus' | 'consultas' | 'especialistas' | 'empresas' | 'interes' | 'conversatorios' | 'avisos' | 'preguntas',
//     include_test?: boolean }
// "avisos" son quienes marcaron "Avisos de Mindi" al pedir la copia del reporte (leads.opt_news): una
// lista aparte, no mezclada con las listas de espera. "preguntas" es el nivel 2 del chat (si está activo).

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { serverKey } from '../_shared/clave.js';
import { decryptContact } from '../_shared/descifrar.js';

const ADMIN_KEY = Deno.env.get('ADMIN_KEY') ?? '';
const SEND_REPORT_SECRET = Deno.env.get('SEND_REPORT_SECRET') ?? '';
const LEADS_ENC_KEY = Deno.env.get('LEADS_ENC_KEY') ?? '';
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serverKey());

function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/* Qué columnas lleva cada lista y cuáles vienen cifradas. */
const WAITLIST_COLS = ['created_at', 'name', 'contact', 'whatsapp', 'origin', 'is_test'];
const LISTS: Record<string, { table: string; cols: string[]; filter?: [string, string, unknown]; enc: string[]; header: string[] }> = {
  plus:          { table: 'interest_signups', cols: WAITLIST_COLS, filter: ['segment', 'eq', 'plus'], enc: ['name', 'contact', 'whatsapp'], header: ['fecha', 'nombre', 'correo', 'whatsapp', 'origen', 'prueba'] },
  consultas:     { table: 'interest_signups', cols: WAITLIST_COLS, filter: ['segment', 'eq', 'consultas'], enc: ['name', 'contact', 'whatsapp'], header: ['fecha', 'nombre', 'correo', 'whatsapp', 'origen', 'prueba'] },
  especialistas: { table: 'interest_signups', cols: WAITLIST_COLS, filter: ['segment', 'eq', 'especialistas'], enc: ['name', 'contact', 'whatsapp'], header: ['fecha', 'nombre', 'correo', 'whatsapp', 'origen', 'prueba'] },
  empresas:      { table: 'interest_signups', cols: ['created_at', 'company', 'job_title', 'team_size', 'contact', 'origin', 'is_test'], filter: ['segment', 'eq', 'empresas'], enc: ['contact'], header: ['fecha', 'empresa', 'cargo', 'colaboradoras', 'correo', 'origen', 'prueba'] },
  interes:       { table: 'interest_signups', cols: ['created_at', 'segment', 'contact', 'is_test'], filter: ['segment', 'in', '(under40_regular,under40_irregular)'], enc: ['contact'], header: ['fecha', 'grupo', 'correo', 'prueba'] },
  conversatorios:{ table: 'event_signups', cols: ['created_at', 'name', 'contact', 'is_test'], enc: ['name', 'contact'], header: ['fecha', 'nombre', 'contacto', 'prueba'] },
  avisos:        { table: 'leads', cols: ['created_at', 'name', 'contact', 'is_test'], filter: ['opt_news', 'eq', true], enc: ['contact'], header: ['fecha', 'nombre', 'correo', 'prueba'] },
  preguntas:     { table: 'chat_questions_research', cols: ['fecha', 'tema', 'pregunta', 'is_test'], enc: [], header: ['fecha', 'tema', 'pregunta', 'prueba'] },
};

/* CSV con comillas y una defensa contra fórmulas al abrirlo en Excel (=, +, -, @ al inicio). */
const cell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!SEND_REPORT_SECRET || !safeEqual(req.headers.get('x-mindi-secret') ?? '', SEND_REPORT_SECRET)) return json({ error: 'unauthorized' }, 401);
  if (!ADMIN_KEY || !safeEqual(req.headers.get('x-admin-key') ?? '', ADMIN_KEY)) return json({ error: 'unauthorized' }, 401);

  let list = '', includeTest = false;
  try { const b = await req.json(); list = String(b.list || ''); includeTest = b.include_test === true; } catch { /* vacío */ }
  const cfg = Object.hasOwn(LISTS, list) ? LISTS[list] : null;
  if (!cfg) return json({ error: 'bad_list' }, 400);

  let q = supabase.from(cfg.table).select(cfg.cols.join(',')).order(cfg.cols[0], { ascending: true }).limit(10000);
  if (cfg.filter) q = (q as any).filter(...cfg.filter);
  if (!includeTest) q = q.eq('is_test', false);
  const { data, error } = await q;
  if (error) { console.error('export-lists', list, (error as any).code || ''); return json({ error: 'read_failed' }, 500); }

  const lines = [cfg.header.map(cell).join(',')];
  try {
    for (const row of (data || []) as unknown as Record<string, unknown>[]) {
      const out = [];
      for (const c of cfg.cols) out.push(cfg.enc.includes(c) ? await decryptContact(row[c], LEADS_ENC_KEY) : row[c]);
      lines.push(out.map(cell).join(','));
    }
  } catch {
    console.error('export-lists', list, 'decrypt');
    return json({ error: 'decrypt_failed' }, 500);
  }
  console.log('export-lists', list, (data || []).length, 'filas'); // solo cuántas, nunca los datos
  return new Response('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="mindi-${list}.csv"` },
  });
});
