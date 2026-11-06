// Edge Function: send-report
//
// Arma el reporte de UNA sesión ya guardada en Supabase (tablas `sessions` + `leads`)
// y lo entrega:
//   - con { download_only: true } en el body, arma el PDF y devuelve un enlace firmado para
//     descargarlo. Es lo que ve toda usuaria al terminar, deje o no su correo. El PDF queda en
//     Storage (download/<session_id>.pdf). No toca las tablas `leads` ni `reports`.
//   - con { share: true }, guarda una copia sin nombre ni contacto en `report_shares` (SQL 018) y
//     devuelve el enlace /reporte?t=<token>, que vence a los 30 días ("Compartir con mi médico").
//   - sin download_only, envía por correo (Resend) un resumen breve y el enlace a /reporte (30 días)
//     al contacto guardado en `leads` (cifrado desde la Fase 4: ver decryptContact)
//     (solo si dejó su correo). Ya no se envía por WhatsApp: los enlaces que ya se enviaron por
//     ese canal (tabla `reports`, channel 'link') siguen abriendo en reporte.html.
//
// El navegador nunca ve la service_role key ni la de Resend: esta función corre
// en el servidor de Supabase, no en el cliente.
//
// Variables de entorno que necesita esta función (configurar con `supabase secrets
// set`, nunca escribirlas en el repo):
//   RESEND_API_KEY   clave de Resend
//   RESEND_FROM      remitente verificado en Resend, ej. "Mindi <reportes@tudominio.com>"
//   SITE_URL         dominio público de la landing publicada, ej. https://mindifem.com
// SUPABASE_URL y la clave de servidor (_shared/clave.js) las inyecta Supabase automáticamente,
// no hace falta configurarlos.

// Paquetes de npm con versión exacta (hallazgo 12): Deno verifica cada uno contra el hash de
// integridad del registro de npm, y deno.lock (en esta carpeta) fija esos hashes.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { serverKey } from '../_shared/clave.js';
import { decryptContact as sharedDecrypt } from '../_shared/descifrar.js';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';

// Puntaje MRS, cortes de la Guía HNHU y textos del resultado: el mismo módulo que usa el chat.
import {
  levelMessage, AREAS as MRS_AREAS, areaStatus, AREA_TAG, CUTS, CUTS_SOURCE,
  heinemannCategory, HEINEMANN_SOURCE, SKIPPED_INTIMATE_NOTE, SKIPPED_INTIMATE_NOTE_DOCTOR,
  doctorRecommendation, EMERGENCY_NOW, areaNotes,
} from '../_shared/mrs.js';
// Autocuidado: la misma lista que el chat (allí se muestran 2; aquí, todas).
import { prioritizedSelfCare, SELF_CARE_SOURCE } from '../_shared/autocuidado.js';
// "Por qué puede pasarte": las mismas notas por síntoma que el reporte del chat.
import { whyNotes, WHY_TITLE } from '../_shared/notas.js';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
/* Fase 4: solo el servidor de la web (/api, en Vercel) llama a esta función, con este secreto en la
   cabecera x-mindi-secret. Configurar el mismo valor aquí (supabase secrets set) y en Vercel. */
const SEND_REPORT_SECRET = Deno.env.get('SEND_REPORT_SECRET') ?? '';
/* Clave del correo cifrado en `leads` (AES-256-GCM, la misma LEADS_ENC_KEY de Vercel). */
const LEADS_ENC_KEY = Deno.env.get('LEADS_ENC_KEY') ?? '';
/* El enlace a /reporte del correo y de "Compartir con mi médico" vence a los 30 días (SQL 019). */
const LINK_DAYS = 30;
/* Enlace del reporte: el token va en el fragmento (#t=), que el navegador no manda al servidor, así no
   queda en los registros (hallazgo 6). /reporte.html redirige a /reporte en el sitio nuevo y conserva el
   fragmento. OJO: el sitio anterior lee ?t=, así que esta versión se despliega después del sitio nuevo. */
const reportLink = (token: string) => `${SITE_URL}/reporte.html#t=${token}`;
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Mindi <onboarding@resend.dev>';
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'http://localhost:5173').replace(/\/$/, '');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  serverKey(),
);

/* Sin CORS (hallazgo 10): desde la Fase 4 solo la llama el servidor de la web (/api), nunca un
   navegador. Los errores hacia afuera son códigos genéricos; el detalle va al log, sin datos personales. */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
/** Error interno: código genérico hacia afuera y el código técnico (nunca el mensaje ni datos) al log. */
const fail = (code: string, err?: { code?: string } | null, status = 500) => {
  console.error('send-report', code, err && err.code ? err.code : '');
  return json({ error: code }, status);
};
/** Compara dos secretos en tiempo constante (no se puede adivinar por cuánto tarda la respuesta). */
function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}


/* ---------- Mismo contenido clínico que src/main.js — mantener sincronizado ---------- */
const SCALE_LABELS = ['Nada', 'Leve', 'Moderado', 'Fuerte', 'Muy fuerte'];

const SYMPTOM_LABELS: Record<string, string> = {
  p3: 'Bochornos / calores', p4: 'Molestias del corazón', p5: 'Dolores musculares o articulares', p6: 'Sueño',
  p7: 'Ánimo decaído', p8: 'Irritabilidad', p9: 'Ansiedad', p10: 'Cansancio físico o mental',
  p11: 'Deseo o vida sexual', p12: 'Molestias al orinar', p13: 'Sequedad o molestia íntima',
};

/* Áreas con su corte y textos del nivel: vienen del módulo compartido (_shared/mrs.js).
   Las áreas se leen de sessions como score_<clave>. */
const AREAS = MRS_AREAS.map((a) => ({ ...a, key: `score_${a.key}` }));

/* Puntajes guardados en sessions → forma del módulo compartido. El nivel y los textos se
   calculan siempre desde aquí, haya o no bandera roja (session.level === 'alert' solo dice
   que además marcó una; el aviso se ANTEPONE al reporte, no lo reemplaza). */
function sessionScores(session: Record<string, any>) {
  return {
    somatico: session.score_somatico ?? 0,
    psicologico: session.score_psicologico ?? 0,
    urogenital: session.score_urogenital ?? 0,
    total: session.score_total ?? 0,
  };
}
const skippedIntimate = (session: Record<string, any>) => session.skipped_intimate === true;
/* Paleta de marca (handoff, sección 3): texto ciruela, magenta solo en acentos. Los correos no
   cargan fuentes web: se nombran Special Gothic y Signika con respaldos del sistema. */
const C = {
  plum: '#2A1026', plumSoft: '#6A4560', magentaText: '#C0128C', magentaBtn: '#FF3CC7',
  line: '#F6B8E2', lineSoft: '#F3CFE4', pinkTint: '#FFE3F5', pinkBg: '#FDEBF6', sevBg: '#FFE0F3',
  testBg: '#FFF8FC', okText: '#1F7A4D', okBg: '#E6F6EE',
} as const;
const FONT_DISPLAY = "'Special Gothic','Archivo','Arial Black',Arial,sans-serif";
const FONT_BODY = "Signika,'Segoe UI',Arial,sans-serif";
const H2 = `font-family:${FONT_DISPLAY};font-weight:700;color:${C.plum};font-size:18px;`;
const AREA_COLOR = { over: C.magentaText, under: C.plumSoft, incomplete: C.plumSoft } as const;
const AREA_BAR = { over: C.magentaBtn, under: '#F9A8DB', incomplete: C.lineSoft } as const;

/* Bloque para el médico: puntaje total, cada subescala con su máximo y su relación con el
   corte de la guía, la categoría de Heinemann del total (dato descriptivo aparte) y, si
   omitió preguntas íntimas, la advertencia de posible subestimación. */
function doctorRows(session: Record<string, any>) {
  const s = sessionScores(session);
  const skipped = skippedIntimate(session);
  return {
    total: `${s.total} / 44`,
    areas: MRS_AREAS.map((a) => ({
      label: `${a.label} (${{ somatico: 'somático', psicologico: 'psicológico', urogenital: 'urogenital' }[a.key as 'somatico']})`,
      value: `${s[a.key as 'somatico']} / ${a.max} · corte ${a.cut}`,
      tag: AREA_TAG.doctor[areaStatus(a.key, s[a.key as 'somatico'], skipped) as 'over'],
    })),
    heinemann: heinemannCategory(s.total),
    skipped,
  };
}

function esc(s: unknown) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/* ---------- Contenido compartido entre el HTML (correo/enlace) y el PDF ----------
   Un solo lugar para cada texto: así el correo, la página del enlace y el PDF adjunto
   nunca dicen cosas distintas. Mantener sincronizado con src/main.js. */
/* Las 3 recomendaciones más prioritarias según sus respuestas, completas, y el resto en una línea
   (mismo criterio que el chat: _shared/autocuidado.js, prioritizedSelfCare). */
function selfCare(session: Record<string, any>) {
  return prioritizedSelfCare(session.answers || {});
}

const CONSULT_GENERIC = [
  '¿Qué opciones de tratamiento, hormonales y no hormonales, tendrían sentido para mi caso?',
  '¿Me corresponde algún examen de rutina de esta etapa (hormonal, mamografía, densitometría)?',
];
const CONSULT_SOURCE = 'Estas sugerencias son de la guía (Figura 6 y 7) — la decisión final siempre es de tu médico, evaluando tu caso completo.';


const PERU_AGE_NOTE = 'En Perú, la edad promedio de la menopausia es 47 años — cada cuerpo tiene su propio ritmo, así que esto es orientativo.';
const STAGE_SOURCE = 'Fuente: Guía HNHU (RD N° 211-2024-DG/HNHU), secciones 5.4 y 6.2.1.';

/* Ubica a la usuaria en su etapa a partir de P1 (edad) + P2 (ciclo) — solo con la definición
   clínica de la guía (6.2.1), nunca STRAW+10. Mismo contenido que src/main.js (stageNote). */
function stageNote(session: Record<string, any>): string {
  const age = session.age_range, cycle = session.cycle;
  if (cycle === 'Me hicieron una histerectomía') {
    return 'Como te hicieron una histerectomía, no se puede ubicar tu etapa por los cambios del ciclo — eso se conversa mejor con tu médico, tomando en cuenta tus síntomas.';
  }
  if (cycle === 'Más de 12 meses sin regla') {
    return 'Según la definición clínica (12 meses seguidos sin regla), ya estarías en la etapa de postmenopausia.';
  }
  if (cycle === 'Más de 60 días sin regla') {
    return 'Esto suele ser parte de la transición hacia la menopausia. Todavía no se cumplen los 12 meses que se usan clínicamente para hablar de menopausia — eso viene después.';
  }
  if (cycle === 'Es irregular (varía o se retrasa)') {
    return 'Esto es típico de la transición hacia la menopausia (perimenopausia) — el ciclo suele empezar a variar antes de que aparezcan otros síntomas.';
  }
  if (age === 'Menor de 40' || age === '40 a 45') {
    return 'Tu ciclo sigue regular. La premenopausia suele iniciar entre los 35 y 45 años — es probable que estés en esa etapa previa, o recién empezando la transición.';
  }
  return 'Tu ciclo sigue regular, aunque desde los 45 años es común que otros síntomas empiecen antes que los cambios en la regla. Vale la pena comentarlo con tu médico igual.';
}

/** Puntos de contexto (tabaquismo, obesidad, etc.) según Figura 6/7 de la guía — mismo cálculo que src/main.js (consultCard). */
function contextPoints(session: Record<string, any>): string[] {
  const pts: string[] = [];
  if (session.smoking && session.smoking !== 'No fumo') pts.push('Fumas o fumabas: la guía sugiere que, si consideras terapia hormonal, se prefiera la vía transdérmica (parche o gel) en vez de pastillas, por el riesgo cardiovascular del tabaco — y trabajar en dejarlo.');
  if (session.obesity === 'Sí') pts.push('Tienes indicación médica de obesidad: la guía sugiere preferir estrógeno transdérmico o en dosis bajas.');
  if (session.family_breast_ca === 'Sí') pts.push('Antecedente familiar de cáncer de mama: la guía indica que sí puedes usar terapia hormonal sistémica, pero sugiere considerar un tamizaje genético.');
  if (session.migraine && String(session.migraine).startsWith('Sí, con aura')) pts.push('Migraña con aura: la guía sugiere estradiol transdérmico continuo en vez de la vía oral.');
  if (session.current_treatment && String(session.current_treatment).startsWith('Sí')) pts.push('Ya usas un tratamiento: cuéntaselo a tu médico para evaluar ajustarlo en vez de partir de cero.');
  return pts;
}

/* Fila de 2 columnas con TABLA, no flexbox: Gmail y buena parte de los clientes de
   correo ignoran display:flex y el texto queda pegado. Las tablas sí son seguras. */
function row2col(left: string, right: string, style = '') {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;${style}"><tr>
    <td style="text-align:left;padding:0;">${left}</td>
    <td style="text-align:right;padding:0;">${right}</td>
  </tr></table>`;
}

/* Barra de progreso también con tabla (el ancho porcentual en <td> sí es seguro en correo). */
function meterBar(pct: number, color: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:6px;"><tr>
    <td style="background:${color};height:10px;font-size:1px;line-height:1px;width:${pct}%;border-radius:999px 0 0 999px;">&nbsp;</td>
    <td style="background:${C.lineSoft};height:10px;font-size:1px;line-height:1px;border-radius:0 999px 999px 0;">&nbsp;</td>
  </tr></table>`;
}

/* Autocuidado seguro para cualquier nivel (A/B/C) — no reemplaza tratamiento.
   La lista viene de _shared/autocuidado.js, igual que en el chat. */
function selfCareFragment(session: Record<string, any>) {
  const { top, rest } = selfCare(session);
  const rows = top.map(([t, d]) => `<li style="margin:6px 0;"><b>${t}:</b> ${d}</li>`).join('');
  const more = rest.length
    ? `<p style="margin:12px 0 4px;font-weight:600;">Otras ideas:</p><ul style="padding-left:20px;margin:0;color:${C.plumSoft};font-size:14px;">${rest.map((r) => `<li style="margin:3px 0;">${r}</li>`).join('')}</ul>` : '';
  return `<h2 style="${H2}margin:24px 0 4px;">Algunas cosas que pueden ayudarte</h2>
    <p style="color:${C.plumSoft};font-size:13px;margin:0 0 8px;">No reemplazan un tratamiento si tu médico lo indica — son medidas seguras para cualquier momento de esta etapa.</p>
    <ul style="padding-left:20px;margin:0;">${rows}</ul>${more}
    <p style="color:${C.plumSoft};font-size:12px;margin-top:10px;">Fuente: ${SELF_CARE_SOURCE}</p>`;
}

/* "Para tu consulta": preguntas siempre útiles + los puntos de contexto ya calculados.
   Mismo contenido que src/main.js (consultCard) — mantener sincronizado. */
function consultFragment(pts: string[]) {
  let html = `<h2 style="${H2}margin:24px 0 8px;">Preguntas para tu médico</h2>` +
    `<p style="color:${C.plumSoft};font-size:13px;margin:0 0 8px;">Puedes llevar contigo lo que viste arriba (tu puntaje por áreas) y, si quieres, estas preguntas:</p>` +
    `<ul style="padding-left:20px;margin:0;">${CONSULT_GENERIC.map((g) => `<li style="margin:4px 0;">${g}</li>`).join('')}</ul>`;
  if (pts.length) {
    html += `<p style="margin:10px 0 4px;font-weight:600;">También ten en cuenta:</p><ul style="padding-left:20px;margin:0;">${pts.map((p) => `<li style="margin:4px 0;">${p}</li>`).join('')}</ul>` +
      `<p style="color:${C.plumSoft};font-size:12px;margin-top:8px;">${CONSULT_SOURCE}</p>`;
  }
  return html;
}

/** Recomendación de ir al médico (_shared/mrs.js), justo después del título: mismo texto que el chat. */
function doctorRecoHtml(level: string) {
  return `<div style="background:${C.pinkTint};border-left:4px solid ${C.magentaBtn};border-radius:10px;padding:12px 14px;margin:4px 0 14px;font-weight:600;color:${C.plum};">${esc(doctorRecommendation(level))}</div>`;
}

/** "Por qué puede pasarte": solo los síntomas en 2 o más (_shared/notas.js). Vacío si no hay ninguno. */
function whyFragment(session: Record<string, any>) {
  const notes = whyNotes(session.answers || {});
  if (!notes.length) return '';
  const rows = notes.map((n: any) => `<li style="margin:6px 0;"><b>${n.label}:</b> ${n.text}</li>`).join('');
  return `<h2 style="${H2}margin:24px 0 4px;">${WHY_TITLE}</h2>
    <ul style="padding-left:20px;margin:0;">${rows}</ul>`;
}

/** Badge del nivel (mismo texto que en el chat). */
function badgeHtml(text: string) {
  return `<span style="display:inline-block;background:${C.sevBg};color:${C.magentaText};border-radius:999px;padding:5px 12px;font-size:13px;font-weight:600;">${text}</span>`;
}

/** Fragmento HTML con estilos en línea (para que se vea bien tanto en el correo como en la página del enlace). */
/* opts.shared: la copia para "Compartir con mi médico" (/reporte), que la ve otra persona: sin
   el pie del correo ("Recibiste esto porque dejaste tu contacto"). Nunca lleva nombre. */
function buildFragment(session: Record<string, any>, lead: Record<string, any>, opts: { shared?: boolean } = {}) {
  const name = lead.name ? esc(lead.name) : '';
  const greeting = name ? `Hola, ${name}.` : 'Hola.';
  const isAlert = session.level === 'alert';

  // Si marcó una bandera roja, esto va ANTES del resto del reporte — no lo reemplaza.
  // El reporte completo (etapa, áreas, autocuidado, preguntas) sigue siendo información
  // útil aunque también convenga una cita pronto.
  let opening: string;
  if (isAlert) {
    const emergency = (session.red_flags || []).includes('rf2');
    const lvl = levelMessage(sessionScores(session));
    opening = `
      <h1 style="font-family:${FONT_DISPLAY};font-weight:700;color:${C.plum};font-size:26px;margin:0 0 12px;">Un paso de cuidado</h1>
      <p>${greeting} Marcaste algo que conviene revisar con tu médico.</p>
      ${emergency ? `<div style="background:${C.testBg};border:1.5px solid ${C.plum};border-left-width:5px;color:${C.plum};padding:14px 16px;border-radius:12px;font-weight:600;margin:16px 0;">${EMERGENCY_NOW}</div>` : ''}
      <p>Para el resto de señales que marcaste, agenda una cita ginecológica lo antes posible.</p>
      <p style="color:${C.plumSoft};font-size:13px;">Esto no reemplaza la valoración de un profesional de salud.</p>
      ${badgeHtml(lvl.badge)}
      <h2 style="${H2}margin:8px 0 4px;">${lvl.title}</h2>
      ${doctorRecoHtml(session.level)}
      <p>De todas formas, esto es lo que notamos en el resto de tus respuestas.</p>
      ${lvl.paragraphs.map((t: string) => `<p>${t}</p>`).join('')}`;
  } else {
    const lvl = levelMessage(sessionScores(session));
    opening = `
      ${badgeHtml(lvl.badge)}
      <h1 style="font-family:${FONT_DISPLAY};font-weight:700;color:${C.plum};font-size:26px;line-height:1.1;margin:10px 0 12px;">${lvl.title}</h1>
      ${doctorRecoHtml(session.level)}
      <p>${greeting} Esto es lo que noté en lo que me contaste.</p>
      ${lvl.paragraphs.map((t: string) => `<p>${t}</p>`).join('')}`;
  }

  const skipped = skippedIntimate(session);
  const areasHtml = AREAS.map((a) => {
    const v = session[a.key] ?? 0;
    const status = areaStatus(a.key.replace('score_', ''), v, skipped) as 'over' | 'under' | 'incomplete';
    const pct = Math.round((v / a.max) * 100);
    const label = `<span style="font-weight:600;font-size:15px;">${a.label}</span>`;
    const tag = `<span style="color:${AREA_COLOR[status]};font-weight:600;font-size:14px;">${AREA_TAG.user[status]}</span>`;
    return `<div style="margin:14px 0;">
      ${row2col(label, tag)}
      ${meterBar(pct, AREA_BAR[status])}
    </div>`;
  }).join('') + (skipped ? `<p style="color:${C.plumSoft};font-size:13px;margin:4px 0 0;">${SKIPPED_INTIMATE_NOTE}</p>` : '');

  const doc = doctorRows(session);
  const docRow = (l: string, r: string) => `<div style="padding:5px 0;border-bottom:1px solid ${C.lineSoft};">${row2col(`<span style="font-size:14px;">${l}</span>`, `<span style="font-size:14px;color:${C.plum};">${r}</span>`)}</div>`;
  const doctorHtml = `
    <div style="border:1.5px solid ${C.line};border-radius:14px;padding:14px 16px;margin-top:20px;">
      <h2 style="${H2}font-size:17px;margin:0 0 4px;">Para tu médico: puntaje MRS</h2>
      <p style="color:${C.plumSoft};font-size:12px;margin:0 0 8px;">Menopause Rating Scale, 11 ítems de 0 a 4.</p>
      ${docRow('<b>Puntaje total</b>', `<b>${doc.total}</b>`)}
      ${doc.areas.map((a) => docRow(a.label, `${a.value}<br><span style="font-size:12px;color:${C.plumSoft};">${a.tag}</span>`)).join('')}
      ${docRow('Categoría del total según Heinemann', doc.heinemann)}
      ${doc.skipped ? `<p style="background:${C.pinkBg};border:1px solid ${C.line};color:${C.plum};padding:10px 12px;border-radius:10px;font-size:13px;margin:10px 0 0;">${SKIPPED_INTIMATE_NOTE_DOCTOR}</p>` : ''}
      <p style="color:${C.plumSoft};font-size:11px;margin:10px 0 0;">${CUTS_SOURCE}<br>Categoría de intensidad: ${HEINEMANN_SOURCE}</p>
    </div>`;

  const pts = contextPoints(session);

  const answers = session.answers || {};
  const itemRows = Object.entries(SYMPTOM_LABELS).map(([id, label]) => {
    const v = answers[id];
    const has = v !== null && v !== undefined;
    const l = `<span style="font-size:14px;">${label}</span>`;
    const r = `<span style="color:${C.plumSoft};font-size:14px;">${has ? SCALE_LABELS[v] : 'Sin responder'}</span>`;
    return `<div style="padding:4px 0;border-bottom:1px solid ${C.lineSoft};">${row2col(l, r)}</div>`;
  }).join('');

  return `
    ${opening}
    <h2 style="${H2}margin:24px 0 4px;">Sobre tu etapa</h2>
    <p>${stageNote(session)}</p>
    <p style="color:${C.plumSoft};font-size:12px;">${PERU_AGE_NOTE} ${STAGE_SOURCE}</p>
    <h2 style="${H2}margin:24px 0 4px;">Lo que noto por áreas</h2>
    <p style="color:${C.plumSoft};font-size:13px;margin:0 0 8px;">Es una mirada de conjunto, no una calificación.</p>
    ${areasHtml}
    ${whyFragment(session)}
    <h2 style="${H2}margin:24px 0 8px;">Tus 11 respuestas</h2>
    ${itemRows}
    ${doctorHtml}
    ${areaNotes(sessionScores(session)).map((n: any) => `<div style="background:${C.pinkBg};border:1px solid ${C.line};padding:12px 14px;border-radius:12px;margin-top:16px;"><p style="margin:0 0 4px;font-weight:600;">${n.title}</p><p style="margin:0;">${n.text}</p><span style="font-size:11px;color:${C.plumSoft};">${n.source}</span></div>`).join('')}
    ${selfCareFragment(session)}
    ${consultFragment(pts)}
    <p style="color:${C.plumSoft};font-size:13px;margin-top:16px;">Esto es solo orientación informativa. Solo un profesional de salud puede evaluarte con exámenes clínicos.</p>
    ${opts.shared ? '' : footer()}`;
}

/** Correo cifrado por /api/lead → texto (las filas anteriores al cifrado vuelven tal cual). */
const decryptContact = (value: string): Promise<string> => sharedDecrypt(value, LEADS_ENC_KEY);

/** Correo breve (decisión de la Fase 0, handoff 11.6): un resumen corto y el enlace al reporte, sin el
 *  detalle clínico ni el PDF adjunto. El reporte completo se ve en /reporte con el token. */
function shortEmail(session: Record<string, any>, lead: Record<string, any>, url: string) {
  const name = lead.name ? esc(lead.name) : '';
  const lvl = levelMessage(sessionScores(session));
  const emergency = session.level === 'alert' && (session.red_flags || []).includes('rf2');
  const until = new Date(Date.now() + LINK_DAYS * 864e5).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' });
  return `
    <p style="margin:0 0 12px;">${name ? `Hola, ${name}.` : 'Hola.'} Tu reporte de Mindi está listo.</p>
    ${emergency ? `<div style="background:${C.testBg};border:1.5px solid ${C.plum};border-left-width:5px;color:${C.plum};padding:14px 16px;border-radius:12px;font-weight:600;margin:16px 0;">${EMERGENCY_NOW}</div>` : ''}
    <h1 style="font-family:${FONT_DISPLAY};font-weight:700;color:${C.plum};font-size:24px;line-height:1.15;margin:8px 0 10px;">${lvl.title}</h1>
    ${doctorRecoHtml(session.level)}
    <p style="margin:20px 0;"><a href="${url}" style="display:inline-block;background:${C.magentaBtn};color:#fff;font-family:${FONT_DISPLAY};font-weight:700;font-size:19px;text-decoration:none;padding:14px 26px;border-radius:40px;">Ver mi reporte</a></p>
    <p style="color:${C.plumSoft};font-size:13px;">Ábrelo para verlo completo o compartirlo con tu médico. El enlace vence el ${until}.</p>
    <p style="color:${C.plumSoft};font-size:13px;margin-top:16px;">Esto es solo orientación informativa. Solo un profesional de salud puede evaluarte con exámenes clínicos.</p>
    ${footer()}`;
}

function footer() {
  return `<hr style="margin:28px 0;border:none;border-top:1px solid ${C.lineSoft};">
  <p style="font-size:12px;color:${C.plumSoft};">Recibiste esto porque dejaste tu contacto en Mindi. Tú decidiste qué compartir.</p>`;
}

/** Documento completo (con doctype/body) — solo para el envío por Resend. */
function wrapForEmail(fragment: string, hasPdf: boolean) {
  const pdfNote = hasPdf
    ? `<p style="background:${C.okBg};color:${C.okText};padding:10px 14px;border-radius:10px;font-size:13px;margin:0 0 18px;">También te dejamos este reporte en PDF adjunto, para guardar o imprimir.</p>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:24px 16px;background:${C.testBg};font-family:${FONT_BODY};color:${C.plum};line-height:1.5;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1.5px solid ${C.line};border-radius:24px;padding:28px 24px;">
      <p style="margin:0 0 18px;font-family:${FONT_DISPLAY};font-weight:700;font-size:26px;color:${C.magentaBtn};">Mindi</p>
      ${pdfNote}
      ${fragment}
    </div>
  </body></html>`;
}

/* ---------- PDF adjunto (pdf-lib: se dibuja a mano, sin navegador ni servicio externo) ----------
   Deno Deploy no permite correr Chrome/Puppeteer, así que no se puede "convertir" el HTML.
   Usa el mismo contenido (prioritizedSelfCare, contextPoints, levelMessage, etc.) para que nunca diga
   algo distinto al correo o a la página del enlace, y la misma identidad que la web (10.4):
   Special Gothic en títulos, Signika en el texto, ciruela para el texto y magenta solo en acentos.
   Las fuentes (OFL, TTF estáticos) se sirven desde el sitio: public/fonts/pdf/. Si no se pueden
   descargar, el PDF sale igual con Helvetica: nunca se pierde el reporte por una fuente. */
const PDF_FONTS = { display: 'SpecialGothic-Bold.ttf', body: 'Signika-Regular.ttf', bodyBold: 'Signika-SemiBold.ttf' };
let fontBytes: Promise<Record<string, Uint8Array> | null> | null = null;
function loadBrandFonts() {
  fontBytes ??= Promise.all(Object.entries(PDF_FONTS).map(async ([k, file]) => {
    const r = await fetch(`${SITE_URL}/fonts/pdf/${file}`);
    if (!r.ok) throw new Error(`font ${file}: ${r.status}`);
    return [k, new Uint8Array(await r.arrayBuffer())] as const;
  })).then(Object.fromEntries).catch((e) => { console.error('pdf fonts', e.message); fontBytes = null; return null; });
  return fontBytes;
}
const PAGE_W = 595.28, PAGE_H = 841.89; // A4
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const PDF_COLOR = {
  ink: hex(C.plum),            // texto
  inkSoft: hex(C.plumSoft),    // texto secundario
  action: hex(C.magentaText),  // acentos en texto (recomendación, área que alcanza el corte)
  bar: hex(C.magentaBtn),      // barras y logo
  calm: hex(C.plumSoft),
  border: hex(C.lineSoft),     // separadores y pista de las barras
  tint: hex(C.pinkTint),
};

async function buildPdf(session: Record<string, any>, lead: Record<string, any>): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const brand = await loadBrandFonts();
  let font: any, bold: any, display: any;
  if (brand) {
    pdfDoc.registerFontkit(fontkit);
    // Signika va entera: el subset de fontkit pierde letras. Sin sustituciones contextuales ni
    // ligaduras: pdf-lib no las posiciona bien y dejaba un hueco después de "vi" ("Convi ene").
    const features = { calt: false, liga: false, clig: false, rlig: false, dlig: false };
    font = await pdfDoc.embedFont(brand.body, { features });
    bold = await pdfDoc.embedFont(brand.bodyBold, { features });
    display = await pdfDoc.embedFont(brand.display, { subset: true, features });
  } else {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    bold = display = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => { page = pdfDoc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; };
  const ensure = (space: number) => { if (y - space < MARGIN) newPage(); };
  const wrap = (str: string, f: any, size: number, maxWidth: number): string[] => {
    const words = String(str).split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (line && f.widthOfTextAtSize(trial, size) > maxWidth) { lines.push(line); line = w; }
      else line = trial;
    }
    if (line) lines.push(line);
    return lines;
  };
  const para = (str: string, opts: { size?: number; f?: any; color?: any; maxWidth?: number; gap?: number } = {}) => {
    const size = opts.size ?? 10, f = opts.f ?? font, color = opts.color ?? PDF_COLOR.ink;
    for (const line of wrap(str, f, size, opts.maxWidth ?? CONTENT_W)) {
      ensure(size + 3);
      page.drawText(line, { x: MARGIN, y: y - size, size, font: f, color });
      y -= size + 3;
    }
    y -= opts.gap ?? 4;
  };
  const heading = (str: string, size = 13) => {
    ensure(size + 12); y -= 6;
    for (const line of wrap(str, display, size, CONTENT_W)) {
      ensure(size + 4);
      page.drawText(line, { x: MARGIN, y: y - size, size, font: display, color: PDF_COLOR.ink });
      y -= size + 3;
    }
    y -= 5;
  };
  const rule = () => {
    ensure(12);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.75, color: PDF_COLOR.border });
    y -= 14;
  };
  // Título corto en negrita (una sola línea — los títulos de autocuidado son breves)
  // + cuerpo envuelto e indentado debajo, en gris.
  const bulletBlock = (label: string, body: string) => {
    ensure(14);
    page.drawText(`•  ${label}`, { x: MARGIN, y: y - 10.5, size: 10.5, font: bold, color: PDF_COLOR.ink });
    y -= 15;
    for (const line of wrap(body, font, 9.5, CONTENT_W - 16)) {
      ensure(13);
      page.drawText(line, { x: MARGIN + 16, y: y - 9.5, size: 9.5, font, color: PDF_COLOR.inkSoft });
      y -= 13;
    }
    y -= 4;
  };
  // Un solo texto (puede ser largo) con viñeta y sangría colgante — para las preguntas
  // genéricas y los puntos de contexto, que ya vienen como una frase completa.
  const bulletText = (str: string, size = 9.5) => {
    const bulletW = font.widthOfTextAtSize('•  ', size);
    const lines = wrap(str, font, size, CONTENT_W - bulletW);
    lines.forEach((line, i) => {
      ensure(size + 3);
      page.drawText(i === 0 ? `•  ${line}` : line, { x: MARGIN + (i === 0 ? 0 : bulletW), y: y - size, size, font, color: PDF_COLOR.ink });
      y -= size + 3;
    });
    y -= 3;
  };

  page.drawText('Mindi', { x: MARGIN, y: y - 24, size: 24, font: display, color: PDF_COLOR.bar });
  y -= 30;
  page.drawText('Reporte de síntomas · perimenopausia', { x: MARGIN, y: y - 9, size: 9, font, color: PDF_COLOR.inkSoft });
  y -= 20;
  rule();

  const name = lead.name ? String(lead.name) : '';
  const greeting = name ? `Hola, ${name}.` : 'Hola.';

  // Igual que en buildFragment: si marcó una bandera roja, esto va ANTES del resto del
  // reporte — no lo reemplaza. El nivel A/B/C se recalcula solo con los puntajes (funciona
  // igual sin importar session.level), así el reporte completo se ve idéntico salvo por
  // este aviso adicional al principio.
  const isAlert = session.level === 'alert';
  if (isAlert) {
    const emergency = (session.red_flags || []).includes('rf2');
    heading('Un paso de cuidado', 16);
    para(`${greeting} Marcaste algo que conviene revisar con tu médico.`);
    if (emergency) {
      para(EMERGENCY_NOW, { f: bold, color: PDF_COLOR.ink }); // emergencia: acento ciruela (10.3)
    }
    para('Para el resto de señales que marcaste, agenda una cita ginecológica lo antes posible.');
    para('Esto no reemplaza la valoración de un profesional de salud.', { size: 8.5, color: PDF_COLOR.inkSoft });
  }

  {
    const lvl = levelMessage(sessionScores(session));
    para(lvl.badge.toUpperCase(), { size: 8, f: bold, color: PDF_COLOR.inkSoft, gap: 0 });
    heading(lvl.title, 16);
    // Recomendación de ir al médico: lo primero después del título, como en el chat y el correo.
    para(doctorRecommendation(session.level), { f: bold, color: PDF_COLOR.action, gap: 8 });
    para(isAlert ? 'De todas formas, esto es lo que notamos en el resto de tus respuestas.' : `${greeting} Esto es lo que noté en lo que me contaste.`);
    for (const t of lvl.paragraphs) para(t);

    heading('Sobre tu etapa');
    para(stageNote(session), { gap: 2 });
    para(`${PERU_AGE_NOTE} ${STAGE_SOURCE}`, { size: 8, color: PDF_COLOR.inkSoft, gap: 10 });

    heading('Lo que noto por áreas');
    para('Es una mirada de conjunto, no una calificación.', { size: 8.5, color: PDF_COLOR.inkSoft, gap: 8 });
    const skipped = skippedIntimate(session);
    for (const a of AREAS) {
      const v = session[a.key] ?? 0;
      const status = areaStatus(a.key.replace('score_', ''), v, skipped) as 'over' | 'under' | 'incomplete';
      const pct = v / a.max;
      const tagColor = status === 'over' ? PDF_COLOR.action : status === 'under' ? PDF_COLOR.calm : PDF_COLOR.inkSoft;
      const tagText = AREA_TAG.user[status];
      ensure(28);
      page.drawText(a.label, { x: MARGIN, y: y - 10.5, size: 10.5, font: bold, color: PDF_COLOR.ink });
      const tw = bold.widthOfTextAtSize(tagText, 9.5);
      page.drawText(tagText, { x: PAGE_W - MARGIN - tw, y: y - 10, size: 9.5, font: bold, color: tagColor });
      y -= 16;
      page.drawRectangle({ x: MARGIN, y: y - 7, width: CONTENT_W, height: 7, color: PDF_COLOR.border });
      page.drawRectangle({ x: MARGIN, y: y - 7, width: CONTENT_W * pct, height: 7, color: status === 'over' ? PDF_COLOR.bar : hex(AREA_BAR[status]) });
      y -= 19;
    }
    if (skipped) para(SKIPPED_INTIMATE_NOTE, { size: 8.5, color: PDF_COLOR.inkSoft, gap: 8 });

    const why = whyNotes(session.answers || {});
    if (why.length) {
      heading(WHY_TITLE);
      for (const n of why) bulletBlock(n.label, n.text);
    }

    heading('Tus 11 respuestas');
    const answers = session.answers || {};
    for (const [id, label] of Object.entries(SYMPTOM_LABELS)) {
      const v = (answers as any)[id];
      const has = v !== null && v !== undefined;
      const valTxt = has ? SCALE_LABELS[v] : 'Sin responder';
      ensure(16);
      page.drawText(label, { x: MARGIN, y: y - 9.5, size: 9.5, font, color: PDF_COLOR.ink });
      const vw = font.widthOfTextAtSize(valTxt, 9.5);
      page.drawText(valTxt, { x: PAGE_W - MARGIN - vw, y: y - 9.5, size: 9.5, font, color: PDF_COLOR.inkSoft });
      y -= 12;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: PDF_COLOR.border });
      y -= 8;
    }

    // Bloque para el médico: puntaje MRS, subescalas con su corte y categoría de Heinemann.
    {
      const doc = doctorRows(session);
      ensure(doc.skipped ? 230 : 200); // el bloque va completo en una página, no partido
      heading('Para tu médico: puntaje MRS');
      para('Menopause Rating Scale, 11 ítems de 0 a 4.', { size: 8.5, color: PDF_COLOR.inkSoft, gap: 6 });
      const docRow = (l: string, r: string, sub?: string, strong = false) => {
        ensure(sub ? 28 : 16);
        page.drawText(l, { x: MARGIN, y: y - 9.5, size: 9.5, font: strong ? bold : font, color: PDF_COLOR.ink });
        const rw = (strong ? bold : font).widthOfTextAtSize(r, 9.5);
        page.drawText(r, { x: PAGE_W - MARGIN - rw, y: y - 9.5, size: 9.5, font: strong ? bold : font, color: PDF_COLOR.ink });
        y -= 12;
        if (sub) {
          const sw = font.widthOfTextAtSize(sub, 8);
          page.drawText(sub, { x: PAGE_W - MARGIN - sw, y: y - 8, size: 8, font, color: PDF_COLOR.inkSoft });
          y -= 11;
        }
        page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: PDF_COLOR.border });
        y -= 8;
      };
      docRow('Puntaje total', doc.total, undefined, true);
      for (const a of doc.areas) docRow(a.label, a.value, a.tag);
      docRow('Categoría del total según Heinemann', doc.heinemann);
      if (doc.skipped) para(SKIPPED_INTIMATE_NOTE_DOCTOR, { size: 9, f: bold, color: PDF_COLOR.ink, gap: 4 });
      para(CUTS_SOURCE, { size: 7.5, color: PDF_COLOR.inkSoft, gap: 1 });
      para(`Categoría de intensidad: ${HEINEMANN_SOURCE}`, { size: 7.5, color: PDF_COLOR.inkSoft, gap: 10 });
    }

    // Notas por área (Cuerpo, Ánimo, Vida íntima) que alcanzan su corte, de mayor a menor porcentaje.
    for (const n of areaNotes(sessionScores(session))) {
      para(n.title, { f: bold, gap: 1 });
      para(n.text, { gap: 2 });
      para(n.source, { size: 8, color: PDF_COLOR.inkSoft, gap: 10 });
    }

    heading('Algunas cosas que pueden ayudarte');
    para('No reemplazan un tratamiento si tu médico lo indica — son medidas seguras para cualquier momento de esta etapa.', { size: 8.5, color: PDF_COLOR.inkSoft, gap: 8 });
    const care = selfCare(session);
    for (const [t, d] of care.top) bulletBlock(t, d);
    if (care.rest.length) {
      para('Otras ideas:', { size: 9.5, f: bold, gap: 2 });
      for (const r of care.rest) bulletText(r, 9);
    }
    para(`Fuente: ${SELF_CARE_SOURCE}`, { size: 7.5, color: PDF_COLOR.inkSoft, gap: 10 });

    heading('Preguntas para tu médico');
    para('Puedes llevar contigo lo que viste arriba (tu puntaje por áreas) y, si quieres, estas preguntas:', { size: 9, color: PDF_COLOR.inkSoft, gap: 6 });
    for (const g of CONSULT_GENERIC) bulletText(g);
    const pts = contextPoints(session);
    if (pts.length) {
      y -= 4;
      for (const p of pts) bulletText(p);
      para(CONSULT_SOURCE, { size: 7.5, color: PDF_COLOR.inkSoft, gap: 6 });
    }

    para('Esto es solo orientación informativa. Solo un profesional de salud puede evaluarte con exámenes clínicos.', { size: 8.5, color: PDF_COLOR.inkSoft, gap: 8 });
  }

  rule();
  para('Recibiste esto porque dejaste tu contacto en Mindi. Tú decidiste qué compartir.', { size: 8, color: PDF_COLOR.inkSoft });

  return pdfDoc.save();
}

Deno.serve(async (req) => {
  if (SEND_REPORT_SECRET && !safeEqual(req.headers.get('x-mindi-secret') ?? '', SEND_REPORT_SECRET)) return json({ error: 'unauthorized' }, 401);
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let session_id: string | undefined;
  let bodyName: string | undefined;
  let downloadOnly = false;
  let share = false;
  try {
    const body = await req.json();
    session_id = body.session_id;
    bodyName = typeof body.name === 'string' ? body.name.slice(0, 80) : undefined;
    downloadOnly = !!body.download_only;
    share = !!body.share;
  } catch {
    // cuerpo vacío o inválido
  }
  if (!session_id) return json({ error: 'session_id requerido' }, 400);

  const { data: session, error: sErr } = await supabase.from('sessions').select('*').eq('id', session_id).maybeSingle();
  if (sErr) return fail('session_read', sErr);
  if (!session) return json({ error: 'Sesión no encontrada' }, 404);

  // Descarga directa, sin dejar contacto: no se guarda lead ni fila en `reports` (no hay
  // nada que enviar ni a quién). Solo se arma el PDF (con el apodo que haya escrito, si
  // escribió alguno — nunca se persiste) y se sube a Storage con un enlace firmado corto,
  // de un solo uso práctico. El resto del reporte es idéntico al de correo/WhatsApp.
  // "Compartir con mi médico": una copia del reporte, sin nombre ni contacto, en /reporte?t=<token>,
  // que vence a los 30 días (SQL 018). Solo se crea cuando la usuaria toca el botón. Si ya hay
  // una vigente para esta sesión, se devuelve la misma; si venció, se crea otra con token nuevo.
  if (share) {
    const { data: prev } = await supabase.from('report_shares').select('token,expires_at').eq('session_id', session_id).maybeSingle();
    if (prev && new Date(prev.expires_at) > new Date()) {
      return json({ ok: true, channel: 'share', url: reportLink(prev.token), expires_at: prev.expires_at });
    }
    const html = buildFragment(session, {}, { shared: true });
    const row = { session_id, html, token: crypto.randomUUID(), created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 30 * 864e5).toISOString() };
    const { data: saved, error: shErr } = await supabase.from('report_shares').upsert(row, { onConflict: 'session_id' }).select('token,expires_at').single();
    if (shErr || !saved) return fail('share_failed', shErr);
    return json({ ok: true, channel: 'share', url: reportLink(saved.token), expires_at: saved.expires_at });
  }

  if (downloadOnly) {
    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await buildPdf(session, { name: bodyName });
    } catch (e) {
      console.error('No se pudo generar el PDF de descarga:', e);
      return fail('pdf_failed');
    }
    const path = `download/${session_id}.pdf`;
    const { error: upErr } = await supabase.storage.from('reports').upload(path, pdfBytes, {
      contentType: 'application/pdf', upsert: true,
    });
    if (upErr) return fail('upload_failed', upErr as any);
    const { data: signed, error: signErr } = await supabase.storage.from('reports').createSignedUrl(path, 60 * 60 * 24);
    if (signErr || !signed?.signedUrl) return fail('sign_failed', signErr as any);
    return json({ ok: true, channel: 'download', pdfUrl: signed.signedUrl });
  }

  const { data: lead, error: lErr } = await supabase
    .from('leads').select('*').eq('session_id', session_id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (lErr) return fail('lead_read', lErr);
  if (!lead || !lead.contact) return json({ error: 'Sin datos de contacto' }, 400);

  // El PDF adjunto/descargable en Storage se llama siempre "<token>.pdf" — permite
  // recrear el enlace firmado sin regenerar el PDF, incluso en una llamada repetida.
  async function linkPayload(token: string, htmlPath = `${SITE_URL}/reporte.html?t=${token}`) {
    const url = htmlPath;
    let pdfUrl: string | undefined;
    const { data: signed } = await supabase.storage.from('reports').createSignedUrl(`${token}.pdf`, 60 * 60 * 24 * 30);
    if (signed?.signedUrl) pdfUrl = signed.signedUrl;
    const waText = pdfUrl
      ? `Este es tu reporte de Mindi. Ábrelo cuando quieras: ${pdfUrl}\n\nSi quieres enterarte de nuestros próximos encuentros, entra aquí: ${SITE_URL}/#eventos`
      : `Aquí está tu reporte de Mindi: ${url}`;
    return { ok: true, channel: 'link', url, pdfUrl, wa: `https://wa.me/?text=${encodeURIComponent(waText)}` };
  }

  // Idempotencia: si ya se envió para esta sesión, no reenviar ni regenerar.
  const { data: existing } = await supabase.from('reports').select('id,status,token,channel').eq('session_id', session_id).maybeSingle();
  if (existing?.status === 'sent') {
    if (existing.channel === 'link') return json({ ...(await linkPayload(existing.token)), already_sent: true });
    return json({ ok: true, already_sent: true, channel: existing.channel });
  }

  // El reporte ya no se envía por WhatsApp: el contacto tiene que ser un correo. Los enlaces
  // de WhatsApp que ya se enviaron siguen abriendo (ver `existing` arriba y reporte.html).
  let to: string;
  try { to = await decryptContact(lead.contact); } catch { return fail('contact_decrypt'); }
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to);
  if (!isEmail) return json({ error: 'El reporte solo se envía por correo' }, 400);
  const fragment = buildFragment(session, lead);
  const channel = 'email';

  const { data: report, error: rErr } = await supabase
    .from('reports')
    .upsert({ session_id, channel, contact: lead.contact, subject: 'Tu reporte de Mindi', html: fragment, status: 'pending' }, { onConflict: 'session_id' })
    .select()
    .single();
  if (rErr) return fail('report_write', rErr);

  if (!RESEND_API_KEY) return fail('email_not_configured');
  const reportUrl = reportLink(report.token);

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: RESEND_FROM, to, subject: 'Tu reporte de Mindi',
      html: wrapForEmail(shortEmail(session, lead, reportUrl), false),
    }),
  });
  if (!r.ok) {
    const errText = await r.text();
    await supabase.from('reports').update({ status: 'failed', error: errText.slice(0, 500) }).eq('id', report.id);
    return fail('email_failed', null, 502);
  }
  await supabase.from('reports').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', report.id);
  return json({ ok: true, channel: 'email' });
});
