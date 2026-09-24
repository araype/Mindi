// Edge Function: send-report
//
// Arma el reporte de UNA sesión ya guardada en Supabase (tablas `sessions` + `leads`)
// y lo entrega:
//   - por correo, vía Resend, si el contacto tiene forma de email
//   - si no (número de WhatsApp), guarda un enlace privado de solo lectura
//     (tabla `reports`, acceso por token) para que la landing lo muestre con un
//     botón "Abrir en WhatsApp"
//   - o, con { download_only: true } en el body, arma solo el PDF y devuelve un enlace
//     firmado para descargarlo — para quien prefiere no dejar ningún dato de contacto.
//     No toca las tablas `leads` ni `reports`.
//
// El navegador nunca ve la service_role key ni la de Resend: esta función corre
// en el servidor de Supabase, no en el cliente.
//
// Variables de entorno que necesita esta función (configurar con `supabase secrets
// set`, nunca escribirlas en el repo):
//   RESEND_API_KEY   clave de Resend
//   RESEND_FROM      remitente verificado en Resend, ej. "Mindi <reportes@tudominio.com>"
//   SITE_URL         dominio público de la landing publicada, ej. https://mindi.vercel.app
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente,
// no hace falta configurarlos.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Mindi <onboarding@resend.dev>';
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'http://localhost:5173').replace(/\/$/, '');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/* ---------- Mismo contenido clínico que src/main.js — mantener sincronizado ---------- */
const SCALE_LABELS = ['Nada', 'Leve', 'Moderado', 'Fuerte', 'Muy fuerte'];

const SYMPTOM_LABELS: Record<string, string> = {
  p3: 'Bochornos / calores', p4: 'Molestias del corazón', p5: 'Dolores musculares o articulares', p6: 'Sueño',
  p7: 'Ánimo decaído', p8: 'Irritabilidad', p9: 'Ansiedad', p10: 'Cansancio físico o mental',
  p11: 'Deseo o vida sexual', p12: 'Molestias al orinar', p13: 'Sequedad o molestia íntima',
};

const AREAS = [
  { key: 'score_somatico', label: 'Cuerpo', max: 16, cut: 8 },
  { key: 'score_psicologico', label: 'Ánimo y energía', max: 16, cut: 6 },
  { key: 'score_urogenital', label: 'Lo íntimo', max: 12, cut: 3 },
] as const;

const LEVEL_COPY: Record<string, { title: string; text: string }> = {
  A: {
    title: 'Tus síntomas están en un nivel leve',
    text: 'Es normal experimentar algunos cambios en esta etapa. A este nivel, cuidar algunos hábitos básicos suele ser suficiente — más abajo van algunas ideas concretas.',
  },
  B: {
    title: 'Sería útil que converses esto con tu ginecólogo(a)',
    text: 'Tus síntomas alcanzan un nivel en el que conviene evaluar contigo si un tratamiento (hormonal o no) tiene sentido para tu caso. Puede que ningún síntoma se sienta insoportable por separado, pero tener varios presentes a la vez, incluso en un nivel moderado, suma una carga real.',
  },
  C: {
    title: 'Lo que sientes es real y tiene tratamiento',
    text: 'Tu nivel de síntomas es alto según la escala clínica utilizada. En este rango, el tratamiento suele ser muy recomendable. Puede que ningún síntoma se sienta insoportable por separado, pero tener varios presentes a la vez suma una carga real.',
  },
};

/* Mismo cálculo que src/main.js (computeLevel) — puramente a partir de los puntajes ya
   guardados, así que funciona igual sin importar si session.level es 'alert' (eso solo
   dice que además marcó una bandera roja; el nivel A/B/C de sus síntomas sigue existiendo
   y el reporte completo debe mostrarse igual — la bandera roja se ANTEPONE, no reemplaza). */
function computeLevel(session: Record<string, any>): 'A' | 'B' | 'C' {
  const total = session.score_total ?? 0;
  if (total >= 15) return 'C';
  if (total >= 8 || (session.score_somatico ?? 0) >= 8 || (session.score_psicologico ?? 0) >= 6 || (session.score_urogenital ?? 0) >= 3) return 'B';
  return 'A';
}

function esc(s: unknown) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/* ---------- Contenido compartido entre el HTML (correo/enlace) y el PDF ----------
   Un solo lugar para cada texto: así el correo, la página del enlace y el PDF adjunto
   nunca dicen cosas distintas. Mantener sincronizado con src/main.js. */
const SELF_CARE_ITEMS: [string, string][] = [
  ['Para los bochornos', 'ropa en capas de fibras naturales, evitar bebidas muy calientes, café, alcohol y comidas muy condimentadas cuando puedas, y respirar lento y profundo en el momento del calor.'],
  ['Para dormir mejor', 'horarios fijos para acostarte, y un ambiente fresco y ventilado.'],
  ['Para la alimentación', 'un patrón mediterráneo: legumbres, frutas, verduras, pescado y aceite de oliva.'],
  ['Para el cuerpo en general', 'unos 150 minutos a la semana de actividad moderada (caminar rápido, nadar, bailar) — ayuda con el sueño, el ánimo y los huesos a la vez.'],
  ['Para los huesos', '1,200 mg de calcio al día (dieta o suplementos) y al menos 800 UI de vitamina D — coméntalo con tu médico(a) antes de tomar suplementos.'],
  ['Para la sequedad íntima', 'lubricantes o humectantes de base acuosa y pH neutro, sin receta.'],
];
const SELF_CARE_SOURCE = 'Guía de Práctica Clínica para Diagnóstico y Tratamiento del Climaterio, Hospital Nacional Hipólito Unanue (RD N° 211-2024-DG/HNHU), sección 6.4.1 · dato inicial: Ayala-Peralta, 2020.';

const CONSULT_GENERIC = [
  '¿Qué opciones de tratamiento, hormonales y no hormonales, tendrían sentido para mi caso?',
  '¿Me corresponde algún examen de rutina de esta etapa (hormonal, mamografía, densitometría)?',
];
const CONSULT_SOURCE = 'Estas sugerencias son de la guía (Figura 6 y 7) — la decisión final siempre es de tu médico(a), evaluando tu caso completo.';

const PSICOLOGICO_NOTE = 'Tu puntaje en la parte emocional pesa bastante en el conjunto. Cerca del 30% de las mujeres de 45 a 64 años presenta síntomas depresivos en esta etapa — no estás sola en eso. Vale la pena comentarlo también con un profesional de salud mental.';
const PSICOLOGICO_SOURCE = 'Fuente: Guía HNHU (RD N° 211-2024-DG/HNHU), sección 6.4.1.2.';

const PERU_AGE_NOTE = 'En Perú, la edad promedio de la menopausia es 47 años — cada cuerpo tiene su propio ritmo, así que esto es orientativo.';
const STAGE_SOURCE = 'Fuente: Guía HNHU (RD N° 211-2024-DG/HNHU), secciones 5.4 y 6.2.1.';

/* Ubica a la usuaria en su etapa a partir de P1 (edad) + P2 (ciclo) — solo con la definición
   clínica de la guía (6.2.1), nunca STRAW+10. Mismo contenido que src/main.js (stageNote). */
function stageNote(session: Record<string, any>): string {
  const age = session.age_range, cycle = session.cycle;
  if (cycle === 'Me hicieron una histerectomía') {
    return 'Como te hicieron una histerectomía, no se puede ubicar tu etapa por los cambios del ciclo — eso se conversa mejor con tu médico(a), tomando en cuenta tus síntomas.';
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
  return 'Tu ciclo sigue regular, aunque desde los 45 años es común que otros síntomas empiecen antes que los cambios en la regla. Vale la pena comentarlo con tu médico(a) igual.';
}

/** Puntos de contexto (tabaquismo, obesidad, etc.) según Figura 6/7 de la guía — mismo cálculo que src/main.js (consultCard). */
function contextPoints(session: Record<string, any>): string[] {
  const pts: string[] = [];
  if (session.smoking && session.smoking !== 'No fumo') pts.push('Fumas o fumabas: la guía sugiere que, si consideras terapia hormonal, se prefiera la vía transdérmica (parche o gel) en vez de pastillas, por el riesgo cardiovascular del tabaco — y trabajar en dejarlo.');
  if (session.obesity === 'Sí') pts.push('Tienes indicación médica de obesidad: la guía sugiere preferir estrógeno transdérmico o en dosis bajas.');
  if (session.family_breast_ca === 'Sí') pts.push('Antecedente familiar de cáncer de mama: la guía indica que sí puedes usar terapia hormonal sistémica, pero sugiere considerar un tamizaje genético.');
  if (session.migraine && String(session.migraine).startsWith('Sí, con aura')) pts.push('Migraña con aura: la guía sugiere estradiol transdérmico continuo en vez de la vía oral.');
  if (session.current_treatment && String(session.current_treatment).startsWith('Sí')) pts.push('Ya usas un tratamiento: cuéntaselo a tu médico(a) para evaluar ajustarlo en vez de partir de cero.');
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
    <td style="background:#E8E6DA;height:10px;font-size:1px;line-height:1px;border-radius:0 999px 999px 0;">&nbsp;</td>
  </tr></table>`;
}

/* Autocuidado seguro para cualquier nivel (A/B/C) — no reemplaza tratamiento.
   Mismo contenido que src/main.js (selfCareCard) — mantener sincronizado. */
function selfCareFragment() {
  const rows = SELF_CARE_ITEMS.map(([t, d]) => `<li style="margin:6px 0;"><b>${t}:</b> ${d}</li>`).join('');
  return `<h2 style="font-family:Georgia,serif;font-size:18px;margin:24px 0 4px;">Algunas cosas que pueden ayudarte</h2>
    <p style="color:#5F5F57;font-size:13px;margin:0 0 8px;">No reemplazan un tratamiento si tu médico(a) lo indica — son medidas seguras para cualquier momento de esta etapa.</p>
    <ul style="padding-left:20px;margin:0;">${rows}</ul>
    <p style="color:#5F5F57;font-size:12px;margin-top:10px;">Fuente: ${SELF_CARE_SOURCE}</p>`;
}

/* "Para tu consulta": preguntas siempre útiles + los puntos de contexto ya calculados.
   Mismo contenido que src/main.js (consultCard) — mantener sincronizado. */
function consultFragment(pts: string[]) {
  let html = `<h2 style="font-family:Georgia,serif;font-size:18px;margin:24px 0 8px;">Para tu consulta</h2>` +
    `<p style="color:#5F5F57;font-size:13px;margin:0 0 8px;">Puedes llevar contigo lo que viste arriba (tu puntaje por áreas) y, si quieres, estas preguntas:</p>` +
    `<ul style="padding-left:20px;margin:0;">${CONSULT_GENERIC.map((g) => `<li style="margin:4px 0;">${g}</li>`).join('')}</ul>`;
  if (pts.length) {
    html += `<p style="margin:10px 0 4px;font-weight:600;">También ten en cuenta:</p><ul style="padding-left:20px;margin:0;">${pts.map((p) => `<li style="margin:4px 0;">${p}</li>`).join('')}</ul>` +
      `<p style="color:#5F5F57;font-size:12px;margin-top:8px;">${CONSULT_SOURCE}</p>`;
  }
  return html;
}

/** Fragmento HTML con estilos en línea (para que se vea bien tanto en el correo como en la página del enlace). */
function buildFragment(session: Record<string, any>, lead: Record<string, any>) {
  const name = lead.name ? esc(lead.name) : '';
  const greeting = name ? `Hola, ${name}.` : 'Hola.';
  const isAlert = session.level === 'alert';

  // Si marcó una bandera roja, esto va ANTES del resto del reporte — no lo reemplaza.
  // El reporte completo (etapa, áreas, autocuidado, preguntas) sigue siendo información
  // útil aunque también convenga una cita pronto.
  let opening: string;
  if (isAlert) {
    const emergency = (session.red_flags || []).includes('rf2');
    const lvl = LEVEL_COPY[computeLevel(session)];
    opening = `
      <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;">Un paso de cuidado</h1>
      <p>${greeting} Marcaste algo que conviene revisar con tu médico(a).</p>
      ${emergency ? `<div style="background:#FAE9E4;border:1px solid #D58B7E;color:#6E2519;padding:14px 16px;border-radius:12px;font-weight:600;margin:16px 0;">Si en este momento tienes dolor de pecho intenso o te falta el aire de repente, no esperes: busca atención médica ya.</div>` : ''}
      <p>Para el resto de señales que marcaste, agenda una cita ginecológica lo antes posible.</p>
      <p style="color:#5F5F57;font-size:13px;">Esto no reemplaza la valoración de un profesional de salud.</p>
      <h2 style="font-family:Georgia,serif;font-size:18px;margin:24px 0 4px;">${lvl.title}</h2>
      <p>De todas formas, esto es lo que notamos en el resto de tus respuestas.</p>
      <p>${lvl.text}</p>`;
  } else {
    const lvl = LEVEL_COPY[session.level] || LEVEL_COPY.A;
    opening = `
      <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;">${lvl.title}</h1>
      <p>${greeting} Esto es lo que noté en lo que me contaste.</p>
      <p>${lvl.text}</p>`;
  }

  const areasHtml = AREAS.map((a) => {
    const v = session[a.key] ?? 0;
    const notable = v >= a.cut;
    const pct = Math.max(4, Math.round((v / a.max) * 100));
    const label = `<span style="font-weight:600;font-size:15px;">${a.label}</span>`;
    const tag = `<span style="color:${notable ? '#A4502F' : '#33421F'};font-weight:600;font-size:14px;">${notable ? 'Conviene comentarlo' : 'En un nivel leve'}</span>`;
    return `<div style="margin:14px 0;">
      ${row2col(label, tag)}
      ${meterBar(pct, notable ? '#A4502F' : '#A3B58D')}
    </div>`;
  }).join('');

  const pts = contextPoints(session);

  const answers = session.answers || {};
  const itemRows = Object.entries(SYMPTOM_LABELS).map(([id, label]) => {
    const v = answers[id];
    const has = v !== null && v !== undefined;
    const l = `<span style="font-size:14px;">${label}</span>`;
    const r = `<span style="color:#5F5F57;font-size:14px;">${has ? SCALE_LABELS[v] : 'Sin responder'}</span>`;
    return `<div style="padding:4px 0;border-bottom:1px solid #EEEEE3;">${row2col(l, r)}</div>`;
  }).join('');

  return `
    ${opening}
    <h2 style="font-family:Georgia,serif;font-size:18px;margin:24px 0 4px;">Sobre tu etapa</h2>
    <p>${stageNote(session)}</p>
    <p style="color:#5F5F57;font-size:12px;">${PERU_AGE_NOTE} ${STAGE_SOURCE}</p>
    <h2 style="font-family:Georgia,serif;font-size:18px;margin:24px 0 4px;">Lo que noto por áreas</h2>
    <p style="color:#5F5F57;font-size:13px;margin:0 0 8px;">Es una mirada de conjunto, no una calificación.</p>
    ${areasHtml}
    <h2 style="font-family:Georgia,serif;font-size:18px;margin:24px 0 8px;">Tus 11 respuestas</h2>
    ${itemRows}
    ${session.score_psicologico >= 6 ? `<p style="background:#EDF1E6;border:1px solid #A3B58D;padding:12px 14px;border-radius:12px;margin-top:16px;">${PSICOLOGICO_NOTE}<br><span style="font-size:11px;color:#5F5F57;">${PSICOLOGICO_SOURCE}</span></p>` : ''}
    ${selfCareFragment()}
    ${consultFragment(pts)}
    <p style="color:#5F5F57;font-size:13px;margin-top:16px;">Esto es solo orientación informativa. Solo un profesional de salud puede evaluarte con exámenes clínicos.</p>
    ${footer()}`;
}

function footer() {
  return `<hr style="margin:28px 0;border:none;border-top:1px solid #DDDDD1;">
  <p style="font-size:12px;color:#5F5F57;">Recibiste esto porque dejaste tu contacto en Mindi. Tú decidiste qué compartir.</p>`;
}

/** Documento completo (con doctype/body) — solo para el envío por Resend. */
function wrapForEmail(fragment: string, hasPdf: boolean) {
  const pdfNote = hasPdf
    ? `<p style="background:#EDF1E6;border:1px solid #A3B58D;color:#33421F;padding:10px 14px;border-radius:10px;font-size:13px;margin:0 0 18px;">También te dejamos este reporte en PDF adjunto, para guardar o imprimir.</p>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:24px 16px;background:#F3F1E8;font-family:Georgia,serif;color:#1B1B19;">
    <div style="max-width:560px;margin:0 auto;background:#FBFBF8;border:1px solid #DDDDD1;border-radius:16px;padding:28px 24px;">
      ${pdfNote}
      ${fragment}
    </div>
  </body></html>`;
}

/* ---------- PDF adjunto (pdf-lib: se dibuja a mano, sin navegador ni servicio externo) ----------
   Deno Deploy no permite correr Chrome/Puppeteer, así que no se puede "convertir" el HTML.
   Este PDF es más simple que el correo (texto + rectángulos, sin la tipografía de marca),
   pero usa el mismo contenido (SELF_CARE_ITEMS, contextPoints, LEVEL_COPY, etc.) para que
   nunca diga algo distinto al correo o a la página del enlace. */
const PAGE_W = 595.28, PAGE_H = 841.89; // A4
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PDF_COLOR = {
  ink: rgb(0.106, 0.106, 0.098),
  inkSoft: rgb(0.373, 0.373, 0.341),
  action: rgb(0.643, 0.314, 0.184),
  calm: rgb(0.42, 0.51, 0.30),
  border: rgb(0.867, 0.867, 0.820),
};

async function buildPdf(session: Record<string, any>, lead: Record<string, any>): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
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
    page.drawText(str, { x: MARGIN, y: y - size, size, font: bold, color: PDF_COLOR.ink });
    y -= size + 8;
  };
  const rule = () => {
    ensure(12);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.75, color: PDF_COLOR.border });
    y -= 14;
  };
  // Título corto en negrita (una sola línea — los títulos de SELF_CARE_ITEMS son breves)
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

  page.drawText('Mindi', { x: MARGIN, y: y - 20, size: 20, font: bold, color: PDF_COLOR.action });
  y -= 26;
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
    para(`${greeting} Marcaste algo que conviene revisar con tu médico(a).`);
    if (emergency) {
      para('Si en este momento tienes dolor de pecho intenso o te falta el aire de repente, no esperes: busca atención médica ya.', { f: bold, color: PDF_COLOR.action });
    }
    para('Para el resto de señales que marcaste, agenda una cita ginecológica lo antes posible.');
    para('Esto no reemplaza la valoración de un profesional de salud.', { size: 8.5, color: PDF_COLOR.inkSoft });
  }

  {
    const lvl = isAlert ? LEVEL_COPY[computeLevel(session)] : (LEVEL_COPY[session.level] || LEVEL_COPY.A);
    heading(lvl.title, 16);
    para(isAlert ? 'De todas formas, esto es lo que notamos en el resto de tus respuestas.' : `${greeting} Esto es lo que noté en lo que me contaste.`);
    para(lvl.text);

    heading('Sobre tu etapa');
    para(stageNote(session), { gap: 2 });
    para(`${PERU_AGE_NOTE} ${STAGE_SOURCE}`, { size: 8, color: PDF_COLOR.inkSoft, gap: 10 });

    heading('Lo que noto por áreas');
    para('Es una mirada de conjunto, no una calificación.', { size: 8.5, color: PDF_COLOR.inkSoft, gap: 8 });
    for (const a of AREAS) {
      const v = session[a.key] ?? 0;
      const notable = v >= a.cut;
      const pct = Math.max(0.04, v / a.max);
      const tagColor = notable ? PDF_COLOR.action : PDF_COLOR.calm;
      const tagText = notable ? 'Conviene comentarlo' : 'En un nivel leve';
      ensure(28);
      page.drawText(a.label, { x: MARGIN, y: y - 10.5, size: 10.5, font: bold, color: PDF_COLOR.ink });
      const tw = bold.widthOfTextAtSize(tagText, 9.5);
      page.drawText(tagText, { x: PAGE_W - MARGIN - tw, y: y - 10, size: 9.5, font: bold, color: tagColor });
      y -= 16;
      page.drawRectangle({ x: MARGIN, y: y - 7, width: CONTENT_W, height: 7, color: PDF_COLOR.border });
      page.drawRectangle({ x: MARGIN, y: y - 7, width: CONTENT_W * pct, height: 7, color: tagColor });
      y -= 19;
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

    if (session.score_psicologico >= 6) {
      para(PSICOLOGICO_NOTE, { gap: 2 });
      para(PSICOLOGICO_SOURCE, { size: 8, color: PDF_COLOR.inkSoft, gap: 10 });
    }

    heading('Algunas cosas que pueden ayudarte');
    para('No reemplazan un tratamiento si tu médico(a) lo indica — son medidas seguras para cualquier momento de esta etapa.', { size: 8.5, color: PDF_COLOR.inkSoft, gap: 8 });
    for (const [t, d] of SELF_CARE_ITEMS) bulletBlock(t, d);
    para(`Fuente: ${SELF_CARE_SOURCE}`, { size: 7.5, color: PDF_COLOR.inkSoft, gap: 10 });

    heading('Para tu consulta');
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let session_id: string | undefined;
  let bodyName: string | undefined;
  let downloadOnly = false;
  try {
    const body = await req.json();
    session_id = body.session_id;
    bodyName = typeof body.name === 'string' ? body.name.slice(0, 80) : undefined;
    downloadOnly = !!body.download_only;
  } catch {
    // cuerpo vacío o inválido
  }
  if (!session_id) return json({ error: 'session_id requerido' }, 400);

  const { data: session, error: sErr } = await supabase.from('sessions').select('*').eq('id', session_id).maybeSingle();
  if (sErr) return json({ error: sErr.message }, 500);
  if (!session) return json({ error: 'Sesión no encontrada' }, 404);

  // Descarga directa, sin dejar contacto: no se guarda lead ni fila en `reports` (no hay
  // nada que enviar ni a quién). Solo se arma el PDF (con el apodo que haya escrito, si
  // escribió alguno — nunca se persiste) y se sube a Storage con un enlace firmado corto,
  // de un solo uso práctico. El resto del reporte es idéntico al de correo/WhatsApp.
  if (downloadOnly) {
    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await buildPdf(session, { name: bodyName });
    } catch (e) {
      console.error('No se pudo generar el PDF de descarga:', e);
      return json({ error: 'No se pudo generar el PDF' }, 500);
    }
    const path = `download/${session_id}.pdf`;
    const { error: upErr } = await supabase.storage.from('reports').upload(path, pdfBytes, {
      contentType: 'application/pdf', upsert: true,
    });
    if (upErr) return json({ error: upErr.message }, 500);
    const { data: signed, error: signErr } = await supabase.storage.from('reports').createSignedUrl(path, 60 * 60 * 24);
    if (signErr || !signed?.signedUrl) return json({ error: (signErr && signErr.message) || 'No se pudo generar el enlace' }, 500);
    return json({ ok: true, channel: 'download', pdfUrl: signed.signedUrl });
  }

  const { data: lead, error: lErr } = await supabase
    .from('leads').select('*').eq('session_id', session_id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (lErr) return json({ error: lErr.message }, 500);
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

  const fragment = buildFragment(session, lead);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.contact);
  const channel = isEmail ? 'email' : 'link';

  const { data: report, error: rErr } = await supabase
    .from('reports')
    .upsert({ session_id, channel, contact: lead.contact, subject: 'Tu reporte de Mindi', html: fragment, status: 'pending' }, { onConflict: 'session_id' })
    .select()
    .single();
  if (rErr) return json({ error: rErr.message }, 500);

  // El PDF es un extra en ambos canales: si por lo que sea falla al armarse o subirse,
  // seguimos igual (correo sin adjunto / enlace de WhatsApp sin el PDF).
  let pdfBytes: Uint8Array | undefined;
  try {
    pdfBytes = await buildPdf(session, lead);
  } catch (e) {
    console.error('No se pudo generar el PDF:', e);
  }

  if (isEmail) {
    if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY no configurada' }, 500);
    const attachments = pdfBytes ? [{ filename: 'reporte-mindi.pdf', content: encodeBase64(pdfBytes) }] : undefined;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM, to: lead.contact, subject: 'Tu reporte de Mindi',
        html: wrapForEmail(fragment, !!attachments),
        ...(attachments ? { attachments } : {}),
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      await supabase.from('reports').update({ status: 'failed', error: errText.slice(0, 500) }).eq('id', report.id);
      return json({ error: 'No se pudo enviar el correo' }, 502);
    }
    await supabase.from('reports').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', report.id);
    return json({ ok: true, channel: 'email' });
  }

  // Canal WhatsApp: subir el PDF al bucket privado (si se generó) antes de armar la respuesta.
  if (pdfBytes) {
    const { error: upErr } = await supabase.storage.from('reports').upload(`${report.token}.pdf`, pdfBytes, {
      contentType: 'application/pdf', upsert: true,
    });
    if (upErr) console.error('No se pudo subir el PDF a Storage:', upErr.message);
  }

  await supabase.from('reports').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', report.id);
  return json(await linkPayload(report.token));
});
