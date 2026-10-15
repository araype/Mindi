// Tests del puntaje MRS y del nivel (Guía HNHU). Correr con: npm test
// Deben pasar antes y después de cambiar las etiquetas: los cortes no cambian.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScores, computeLevel, SUBSCALES } from '../supabase/functions/_shared/mrs.js';

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
