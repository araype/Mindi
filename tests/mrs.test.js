// Tests del puntaje MRS y del nivel (Guía HNHU). Correr con: npm test
// Deben pasar antes y después de cambiar las etiquetas: los cortes no cambian.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeScores, computeLevel, SUBSCALES, levelTriggers, levelMessage,
  areaStatus, AREA_TAG, heinemannCategory,
} from '../supabase/functions/_shared/mrs.js';

// Arma respuestas que suman exactamente los puntos pedidos por subescala (máx. 4 por ítem).
function answersFor({ somatico = 0, psicologico = 0, urogenital = 0 } = {}) {
  const out = {};
  for (const [sub, pts] of Object.entries({ somatico, psicologico, urogenital })) {
    let left = pts;
    for (const id of SUBSCALES[sub]) {
      const v = Math.min(4, left);
      out[id] = v;
      left -= v;
    }
    assert.equal(left, 0, `no caben ${pts} puntos en ${sub}`);
  }
  return out;
}
const levelOf = (parts) => computeLevel(computeScores(answersFor(parts)));

test('agrupación de ítems según el Anexo 1 de la guía', () => {
  assert.deepEqual(SUBSCALES.somatico, ['p3', 'p4', 'p5', 'p6']);
  assert.deepEqual(SUBSCALES.psicologico, ['p7', 'p8', 'p9', 'p10']);
  assert.deepEqual(SUBSCALES.urogenital, ['p11', 'p12', 'p13']);
});

test('suma por subescala y total', () => {
  const s = computeScores({ p3: 4, p4: 1, p7: 2, p11: 3, p13: 1 });
  assert.deepEqual(s, { somatico: 5, psicologico: 2, urogenital: 4, total: 11 });
});

// Casos de la auditoría (tarea 1) y bordes de cada corte.
const CASES = [
  // [descripción, partes, nivel esperado]
  ['total 0',                                  {},                                            'A'],
  ['total 3 con urogenital 3 (un solo ítem)',  { urogenital: 3 },                             'B'],
  ['urogenital 2, justo bajo el corte',        { urogenital: 2 },                             'A'],
  ['total 4',                                  { somatico: 2, psicologico: 2 },               'A'],
  ['total 5',                                  { somatico: 3, psicologico: 2 },               'A'],
  ['total 7 sin cruzar ningún corte',          { somatico: 4, psicologico: 3 },               'A'],
  ['total 7 con somático 7',                   { somatico: 7 },                               'A'],
  ['total 8 repartido',                        { somatico: 4, psicologico: 4 },               'B'],
  ['somático 8 solo',                          { somatico: 8 },                               'B'],
  ['psicológico 5, justo bajo el corte',       { psicologico: 5 },                            'A'],
  ['psicológico 6 (derivar a salud mental)',   { psicologico: 6 },                            'B'],
  ['total 14',                                 { somatico: 7, psicologico: 5, urogenital: 2 }, 'B'],
  ['total 15',                                 { somatico: 7, psicologico: 5, urogenital: 3 }, 'C'],
  ['total 44 (máximo)',                        { somatico: 16, psicologico: 16, urogenital: 12 }, 'C'],
];
for (const [name, parts, expected] of CASES) {
  test(`nivel: ${name} → ${expected}`, () => {
    assert.equal(levelOf(parts), expected);
  });
}

// ---------- Lo que ve la usuaria (parte 2) ----------
const msgOf = (parts) => levelMessage(computeScores(answersFor(parts)));
const SEVERAL_RE = /varios presentes a la vez/;

test('A se divide por el total: 0-4 → A0, 5-7 → A1', () => {
  assert.equal(msgOf({}).band, 'A0');
  assert.equal(msgOf({ somatico: 2, psicologico: 2 }).band, 'A0');
  assert.equal(msgOf({ somatico: 3, psicologico: 2 }).band, 'A1');
  assert.equal(msgOf({ somatico: 4, psicologico: 3 }).band, 'A1');
  assert.equal(msgOf({}).badge, 'Sin molestias importantes · Guía HNHU');
  assert.equal(msgOf({ somatico: 5 }).badge, 'Síntomas leves · Guía HNHU');
});

test('total 0 ya no dice "leve"', () => {
  const m = msgOf({});
  assert.doesNotMatch(`${m.badge} ${m.title} ${m.paragraphs.join(' ')}`, /leve/i);
});

test('B por un solo criterio íntimo: lo nombra y no habla de "varios síntomas"', () => {
  const m = msgOf({ urogenital: 3 });
  assert.equal(m.band, 'B');
  assert.equal(m.badge, 'Conviene evaluarlo con tu médico · Guía HNHU');
  assert.match(m.paragraphs[0], /^Tu puntaje en lo íntimo alcanza el punto/);
  assert.doesNotMatch(m.paragraphs.join(' '), SEVERAL_RE);
});

test('B por psicológico 6: lo nombra y no habla de "varios síntomas"', () => {
  const m = msgOf({ psicologico: 6 });
  assert.match(m.paragraphs[0], /^Tu puntaje en ánimo y energía alcanza/);
  assert.doesNotMatch(m.paragraphs.join(' '), SEVERAL_RE);
});

test('B por el total: lo nombra y sí habla de "varios síntomas"', () => {
  const m = msgOf({ somatico: 4, psicologico: 4 });
  assert.deepEqual(levelTriggers(computeScores(answersFor({ somatico: 4, psicologico: 4 }))), ['total']);
  assert.match(m.paragraphs[0], /^Tu puntaje total alcanza/);
  assert.match(m.paragraphs.join(' '), SEVERAL_RE);
});

test('B por varios criterios: los nombra todos, en plural', () => {
  const m = msgOf({ somatico: 8, psicologico: 6 }); // total 14
  assert.match(m.paragraphs[0], /^Tu puntaje total, tu puntaje en el cuerpo y tu puntaje en ánimo y energía alcanzan el punto/);
  assert.match(m.paragraphs.join(' '), SEVERAL_RE);
});

test('C: describe la acción de la guía, no "alto según la escala"', () => {
  const m = msgOf({ somatico: 7, psicologico: 5, urogenital: 3 });
  assert.equal(m.band, 'C');
  assert.equal(m.badge, 'El tratamiento suele ser muy recomendable · Guía HNHU');
  assert.doesNotMatch(m.paragraphs.join(' '), /alto según la escala/);
  assert.match(m.paragraphs[0], /muy recomendable/);
});

test('etiquetas de área: bajo el corte, sobre el corte e incompleto', () => {
  assert.equal(areaStatus('somatico', 7, false), 'under');
  assert.equal(areaStatus('somatico', 8, false), 'over');
  assert.equal(areaStatus('psicologico', 6, false), 'over');
  assert.equal(areaStatus('urogenital', 2, false), 'under');
  assert.equal(areaStatus('urogenital', 2, true), 'incomplete');
  assert.equal(areaStatus('urogenital', 0, true), 'incomplete');
  assert.equal(areaStatus('urogenital', 3, true), 'over'); // alcanza el corte aunque haya omitido
  assert.equal(AREA_TAG.user.under, 'Sin señal por ahora');
  assert.equal(AREA_TAG.doctor.under, 'Por debajo del punto de corte (guía HNHU)');
});

test('categoría de Heinemann del total', () => {
  assert.equal(heinemannCategory(0), 'Sin molestias o mínimas (0-4)');
  assert.equal(heinemannCategory(4), 'Sin molestias o mínimas (0-4)');
  assert.equal(heinemannCategory(5), 'Leve (5-8)');
  assert.equal(heinemannCategory(8), 'Leve (5-8)');
  assert.equal(heinemannCategory(9), 'Moderada (9-15)');
  assert.equal(heinemannCategory(15), 'Moderada (9-15)');
  assert.equal(heinemannCategory(16), 'Severa (16 o más)');
});

test('preguntas íntimas omitidas (null) suman 0 — comportamiento actual', () => {
  const s = computeScores({ p11: null, p12: 2, p13: null });
  assert.equal(s.urogenital, 2);
  assert.equal(computeLevel(s), 'A');
});

test('nivel con puntajes guardados en sessions (como los usa send-report)', () => {
  const session = { score_somatico: 2, score_psicologico: 6, score_urogenital: 0, score_total: 8 };
  const level = computeLevel({
    somatico: session.score_somatico, psicologico: session.score_psicologico,
    urogenital: session.score_urogenital, total: session.score_total,
  });
  assert.equal(level, 'B');
});
