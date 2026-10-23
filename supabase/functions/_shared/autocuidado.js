// Mindi · Recomendaciones de autocuidado (Guía HNHU, sección 6.4.1).
//
// Una sola lista para el chat y para el reporte (correo y PDF, en send-report):
//   - el reporte muestra todas: las específicas de cada ítem respondido con 2-4, y las universales
//   - el chat muestra máximo 2, en una línea cada una, del área más afectada (topSelfCare)
// JavaScript plano y sin dependencias, igual que mrs.js.

import { SUBSCALES, CUTS } from './mrs.js';

/* t/d: título y texto del reporte. short: la versión de una línea del chat.
   P11 no tiene recomendación propia a propósito. */
export const SELF_CARE_SPECIFIC = [
  { ids: ['p3'], t: 'Para los bochornos', d: 'ropa en capas de fibras naturales, evitar bebidas muy calientes, café, alcohol y comidas muy condimentadas cuando puedas, y respirar lento y profundo en el momento del calor.',
    short: 'Bochornos: ropa en capas y menos café, alcohol y picante.' },
  { ids: ['p4'], t: 'Para las palpitaciones', d: 'evita la cafeína y el alcohol en exceso — pueden intensificar la sensación. Si son muy frecuentes, coméntalo con tu médico(a).',
    short: 'Palpitaciones: menos cafeína y alcohol.' },
  { ids: ['p5'], t: 'Para las molestias musculares', d: 'estiramientos suaves y calor local pueden ayudar con la rigidez — el ejercicio regular también protege las articulaciones a largo plazo.',
    short: 'Músculos: estiramientos suaves y calor local.' },
  { ids: ['p6'], t: 'Para dormir mejor', d: 'horarios fijos para acostarte, y un ambiente fresco y ventilado.',
    short: 'Sueño: horarios fijos y un cuarto fresco.' },
  { ids: ['p7', 'p8', 'p9'], t: 'Para el ánimo y la irritabilidad', d: 'el ejercicio regular ayuda especialmente aquí — libera endorfinas que estabilizan el ánimo y reducen la irritabilidad.',
    short: 'Ánimo: ejercicio regular, ayuda a estabilizarlo.' },
  { ids: ['p10'], t: 'Para el cansancio', d: 'mantener horarios regulares de sueño y actividad física moderada ayuda a recuperar energía — el sedentarismo tiende a empeorarlo.',
    short: 'Cansancio: horarios regulares y actividad moderada.' },
  { ids: ['p12'], t: 'Para las molestias al orinar', d: 'los ejercicios de Kegel (fortalecer el piso pélvico) pueden ayudar con la urgencia y los escapes — puedes empezar por tu cuenta, sin receta.',
    short: 'Al orinar: ejercicios de Kegel, sin receta.' },
  { ids: ['p13'], t: 'Para la sequedad íntima', d: 'lubricantes o humectantes de base acuosa y pH neutro, sin receta.',
    short: 'Sequedad: lubricante de base acuosa, sin receta.' },
];
/* Mismo orden que el reporte ya publicado. Si en el chat faltan consejos, se completa en este orden. */
export const SELF_CARE_UNIVERSAL = [
  { t: 'Para la alimentación', d: 'un patrón mediterráneo: legumbres, frutas, verduras, pescado y aceite de oliva.',
    short: 'Comida: legumbres, frutas, verduras y pescado.' },
  { t: 'Para el cuerpo en general', d: 'unos 150 minutos a la semana de actividad moderada (caminar rápido, nadar, bailar) — ayuda con el sueño, el ánimo y los huesos a la vez.',
    short: 'Muévete: 150 minutos a la semana, a paso moderado.' },
  { t: 'Para los huesos', d: '1,200 mg de calcio al día (dieta o suplementos) y al menos 800 UI de vitamina D — coméntalo con tu médico(a) antes de tomar suplementos.',
    short: 'Huesos: calcio y vitamina D; consulta antes de suplementos.' },
];
export const SELF_CARE_SOURCE = 'Guía de Práctica Clínica para Diagnóstico y Tratamiento del Climaterio, Hospital Nacional Hipólito Unanue (RD N° 211-2024-DG/HNHU), sección 6.4.1 · dato inicial: Ayala-Peralta, 2020.';

const counts = (answers, id) => answers?.[id] != null && answers[id] >= 2;

/** Lista completa del reporte: específicas (en orden P3→P13) + universales → [título, texto][]. */
export function selfCareItems(answers) {
  const specific = SELF_CARE_SPECIFIC.filter((s) => s.ids.some((id) => counts(answers, id)));
  return [...specific, ...SELF_CARE_UNIVERSAL].map((s) => [s.t, s.d]);
}

/** Área más afectada: la de mayor puntaje en proporción a su corte (empate: cuerpo, ánimo, íntimo).
 *  null si todas están en 0. */
export function mostAffectedArea(scores) {
  let best = null;
  for (const key of Object.keys(SUBSCALES)) {
    const ratio = (scores?.[key] || 0) / CUTS[key];
    if (ratio > 0 && (!best || ratio > best.ratio)) best = { key, ratio };
  }
  return best && best.key;
}

/** Consejos del chat: máximo `max`, en una línea cada uno. Primero los del área más afectada,
 *  del ítem con más puntaje al de menos; si faltan, se completa con las universales. */
export function topSelfCare(answers, scores, max = 2) {
  const area = mostAffectedArea(scores);
  const peak = (s) => Math.max(...s.ids.map((id) => answers?.[id] || 0));
  const specific = area
    ? SELF_CARE_SPECIFIC
        .filter((s) => s.ids.every((id) => SUBSCALES[area].includes(id)) && s.ids.some((id) => counts(answers, id)))
        .sort((a, b) => peak(b) - peak(a))
    : [];
  return [...specific, ...SELF_CARE_UNIVERSAL].slice(0, max).map((s) => s.short);
}
