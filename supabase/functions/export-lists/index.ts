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
// "conversaciones" / "conversaciones-txt" (026): las conversaciones que aceptaron compartir (chat-v3),
// numeradas 1, 2, 3… en vez del identificador al azar. El .txt va en bloques, como un registro de chat.

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

const TEMA: Record<string, string> = { bochornos: 'bochornos', sueno: 'sueño', animo: 'ánimo', peso: 'peso', vida_intima: 'vida íntima',
  terapia_hormonal: 'terapia hormonal', remedios_naturales: 'remedios naturales', edad_inicio: 'edad de inicio', duracion: 'duración', trabajo: 'trabajo', otro: 'otro' };
const fechaLarga = (d: string) => { const [y, m, dd] = d.split('-').map(Number);
  return `${dd} ${['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'][m - 1]} ${y}`; };

async function exportConversations(txt: boolean, includeTest: boolean): Promise<Response> {
  let q = supabase.from('chat_messages_research').select('id,fecha,conversacion,rol,texto,tema,is_test').order('id', { ascending: true }).limit(20000);
  if (!includeTest) q = q.eq('is_test', false);
  const { data, error } = await q;
  if (error) { console.error('export-lists conversaciones', (error as any).code || ''); return json({ error: 'read_failed' }, 500); }
  // Agrupa por conversación, en el orden en que empezó cada una.
  const convs = new Map<string, { n: number; fecha: string; temas: Set<string>; prueba: boolean; msgs: { rol: string; texto: string; tema: string | null }[] }>();
  for (const r of (data || []) as any[]) {
    let c = convs.get(r.conversacion);
    if (!c) { c = { n: convs.size + 1, fecha: r.fecha, temas: new Set(), prueba: r.is_test, msgs: [] }; convs.set(r.conversacion, c); }
    if (r.tema) c.temas.add(TEMA[r.tema] || r.tema);
    c.msgs.push({ rol: r.rol, texto: r.texto, tema: r.tema });
  }
  let body: string, type: string;
  if (txt) {
    const blocks = [...convs.values()].map((c) => {
      const head = `— Conversación ${c.n} · ${fechaLarga(c.fecha)}` + (c.temas.size ? ` · tema: ${[...c.temas].join(', ')}` : '') + (c.prueba ? ' · prueba' : '');
      return [head, ...c.msgs.map((m) => `[${m.rol === 'mindi' ? 'Mindi' : 'Usuaria'}] ${m.texto}`)].join('\r\n\r\n');
    });
    body = blocks.join('\r\n\r\n\r\n') + '\r\n'; type = 'text/plain';
  } else {
    const lines = [['conversacion', 'fecha', 'orden', 'rol', 'tema', 'texto', 'prueba'].map(cell).join(',')];
    for (const c of convs.values()) c.msgs.forEach((m, i) => lines.push([c.n, c.fecha, i + 1, m.rol, m.tema ? TEMA[m.tema] || m.tema : '', m.texto, c.prueba].map(cell).join(',')));
    body = lines.join('\r\n'); type = 'text/csv';
  }
  console.log('export-lists conversaciones', convs.size, 'conversaciones'); // solo cuántas, nunca el texto
  return new Response('\ufeff' + body, { headers: { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!SEND_REPORT_SECRET || !safeEqual(req.headers.get('x-mindi-secret') ?? '', SEND_REPORT_SECRET)) return json({ error: 'unauthorized' }, 401);
  if (!ADMIN_KEY || !safeEqual(req.headers.get('x-admin-key') ?? '', ADMIN_KEY)) return json({ error: 'unauthorized' }, 401);

  let list = '', includeTest = false;
  try { const b = await req.json(); list = String(b.list || ''); includeTest = b.include_test === true; } catch { /* vacío */ }
  if (list === 'conversaciones' || list === 'conversaciones-txt') return exportConversations(list === 'conversaciones-txt', includeTest);
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
