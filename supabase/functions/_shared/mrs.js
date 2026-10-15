// Mindi · Puntaje MRS y nivel según la Guía HNHU (RD N° 211-2024-DG/HNHU).
//
// ÚNICA fuente de los puntos de corte. La usan:
//   - el chat (src/main.js, vía Vite)
//   - la función send-report (Deno, al desplegar se sube junto con la función)
//   - los tests (node --test, tests/mrs.test.js)
// JavaScript plano y sin dependencias a propósito, para que los tres lo carguen igual.
//
// Agrupación (Anexo 1 de la guía): Somático ítems 1-4 (p3-p6), Psicológico 5-8 (p7-p10),
// Urogenital 9-11 (p11-p13). Cada ítem vale 0-4.
// Cortes (Figura 6, "Tratamiento por síntomas"):
//   C → MRS Total ≥15                                   ("THM muy recomendable")
//   B → Total ≥8 / Somático ≥8 / Psicológico ≥6 / Urogenital ≥3  ("según evaluación individual")
//   A → ninguno de los anteriores
// Son umbrales para decidir tratamiento, no categorías de intensidad.

export const SUBSCALES = {
  somatico:    ['p3', 'p4', 'p5', 'p6'],
  psicologico: ['p7', 'p8', 'p9', 'p10'],
  urogenital:  ['p11', 'p12', 'p13'],
};

export const CUTS = {
  totalC: 15,
  totalB: 8,
  somatico: 8,
  psicologico: 6,
  urogenital: 3,
};

/** answers: { p3: 0-4 | null, … } → { somatico, psicologico, urogenital, total }.
 *  Una pregunta sin responder (null) suma 0. */
export function computeScores(answers) {
  const sum = (ids) => ids.reduce((acc, id) => acc + (answers?.[id] || 0), 0);
  const somatico = sum(SUBSCALES.somatico);
  const psicologico = sum(SUBSCALES.psicologico);
  const urogenital = sum(SUBSCALES.urogenital);
  return { somatico, psicologico, urogenital, total: somatico + psicologico + urogenital };
}

/** Criterios de B que se cumplen, en orden: 'total' | 'somatico' | 'psicologico' | 'urogenital'.
 *  En C siempre aparece 'total'. Vacío en A. */
export function levelTriggers(scores) {
  const s = scores || {};
  const out = [];
  if ((s.total || 0) >= CUTS.totalB) out.push('total');
  if ((s.somatico || 0) >= CUTS.somatico) out.push('somatico');
  if ((s.psicologico || 0) >= CUTS.psicologico) out.push('psicologico');
  if ((s.urogenital || 0) >= CUTS.urogenital) out.push('urogenital');
  return out;
}

/** Áreas del resultado, con el corte de la guía para cada subescala. */
export const AREAS = [
  { key: 'somatico',    label: 'Cuerpo',          max: 16, cut: CUTS.somatico },
  { key: 'psicologico', label: 'Ánimo y energía', max: 16, cut: CUTS.psicologico },
  { key: 'urogenital',  label: 'Lo íntimo',       max: 12, cut: CUTS.urogenital },
];

/** Estado de un área: 'over' (alcanza el corte), 'under' (no lo alcanza) o 'incomplete'
 *  (lo íntimo con alguna pregunta omitida y sin alcanzar el corte: podría estar subestimado). */
export function areaStatus(key, value, skippedIntimate) {
  const area = AREAS.find((a) => a.key === key);
  if ((value || 0) >= area.cut) return 'over';
  if (key === 'urogenital' && skippedIntimate) return 'incomplete';
  return 'under';
}
export const AREA_TAG = {
  user:   { over: 'Conviene comentarlo', under: 'Por ahora no alcanza el punto para consultarlo', incomplete: 'Incompleto' },
  doctor: { over: 'Alcanza el punto de corte (guía HNHU)', under: 'Por debajo del punto de corte (guía HNHU)', incomplete: 'Incompleto: preguntas omitidas' },
};
export const SKIPPED_INTIMATE_NOTE = 'Preferiste no responder alguna pregunta íntima, y está bien. Por eso, el puntaje de "Lo íntimo" podría ser más bajo de lo que de verdad sientes. Si quieres, coméntalo directamente en tu consulta médica.';

/** Categoría del puntaje total según Heinemann et al. (2004). Es un dato descriptivo de
 *  intensidad, aparte de los cortes de la guía: no decide el nivel A/B/C. */
export const HEINEMANN_SOURCE = 'Heinemann K. et al., "The Menopause Rating Scale (MRS) scale: A methodological review", Health and Quality of Life Outcomes, 2004.';
export function heinemannCategory(total) {
  const t = total || 0;
  if (t <= 4) return 'Sin molestias o mínimas (0-4)';
  if (t <= 8) return 'Leve (5-8)';
  if (t <= 15) return 'Moderada (9-15)';
  return 'Severa (16 o más)';
}

/** Lo que ve la usuaria según su nivel. A se divide por el total ya calculado (0-4 / 5-7);
 *  el nivel guardado sigue siendo A, B o C.
 *  → { band: 'A0' | 'A1' | 'B' | 'C', badge, title, paragraphs: string[] } (texto plano). */
const TRIGGER_TEXT = {
  total: 'tu puntaje total',
  somatico: 'tu puntaje en el cuerpo',
  psicologico: 'tu puntaje en ánimo y energía',
  urogenital: 'tu puntaje en lo íntimo',
};
const SEVERAL = 'Puede que ningún síntoma se sienta insoportable por separado, pero tener varios presentes a la vez, incluso en un nivel moderado, suma una carga real. Por eso lo que noto toma en cuenta el conjunto, no solo el síntoma más fuerte.';
const joinEs = (xs) => xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export function levelMessage(scores) {
  const level = computeLevel(scores);
  const total = (scores && scores.total) || 0;
  if (level === 'C') {
    return {
      band: 'C',
      badge: 'El tratamiento suele ser muy recomendable · Guía HNHU',
      title: 'Lo que sientes es real y tiene tratamiento',
      paragraphs: [
        'Tu puntaje total está en el rango en que la guía HNHU considera el tratamiento muy recomendable.',
        SEVERAL,
      ],
    };
  }
  if (level === 'B') {
    const triggers = levelTriggers(scores);
    const who = joinEs(triggers.map((t) => TRIGGER_TEXT[t]));
    const verb = triggers.length > 1 ? 'alcanzan' : 'alcanza';
    const paragraphs = [`${cap(who)} ${verb} el punto en que la guía HNHU sugiere evaluar contigo si un tratamiento (hormonal o no) tiene sentido para tu caso.`];
    if (triggers.includes('total')) paragraphs.push(SEVERAL);
    return {
      band: 'B',
      badge: 'Conviene evaluarlo con tu médico · Guía HNHU',
      title: 'Sería útil que converses esto con tu ginecólogo(a)',
      paragraphs,
    };
  }
  if (total <= 4) {
    return {
      band: 'A0',
      badge: 'Sin molestias importantes · Guía HNHU',
      title: 'Por ahora no notamos molestias importantes',
      paragraphs: ['Tus respuestas no alcanzan ninguno de los puntos en que la guía HNHU sugiere evaluar un tratamiento. Es normal notar algunos cambios en esta etapa: revisa las recomendaciones para ideas concretas.'],
    };
  }
  return {
    band: 'A1',
    badge: 'Síntomas leves · Guía HNHU',
    title: 'Tus síntomas están en un nivel leve',
    paragraphs: ['Es normal experimentar algunos cambios en esta etapa. A este nivel, cuidar algunos hábitos básicos suele ser suficiente — revisa las recomendaciones para ideas concretas.'],
  };
}

/** scores: { somatico, psicologico, urogenital, total } → 'A' | 'B' | 'C'. */
export function computeLevel(scores) {
  const s = scores || {};
  if ((s.total || 0) >= CUTS.totalC) return 'C';
  if ((s.total || 0) >= CUTS.totalB
    || (s.somatico || 0) >= CUTS.somatico
    || (s.psicologico || 0) >= CUTS.psicologico
    || (s.urogenital || 0) >= CUTS.urogenital) return 'B';
  return 'A';
}
