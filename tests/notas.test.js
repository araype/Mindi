// Tests de "Por qué puede pasarte" (notas por síntoma del reporte). Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whyNotes, WHY_NOTES } from '../supabase/functions/_shared/notas.js';
import { SUBSCALES, EMERGENCY_ACTION } from '../supabase/functions/_shared/mrs.js';

test('hay una nota por cada uno de los 11 ítems, en el orden de la escala', () => {
  assert.deepEqual(WHY_NOTES.map((n) => n.id), Object.values(SUBSCALES).flat());
});

test('solo los síntomas en 2 o más; las omitidas (null) no cuentan', () => {
  const ids = whyNotes({ p3: 2, p4: 1, p6: 4, p11: null, p13: 3 }).map((n) => n.id);
  assert.deepEqual(ids, ['p3', 'p6', 'p13']);
  assert.deepEqual(whyNotes({ p3: 1, p7: 0 }), []);
  assert.deepEqual(whyNotes({}), []);
});

test('sin cierres por intensidad: el texto es el mismo con 2 que con 4', () => {
  assert.equal(whyNotes({ p6: 2 })[0].text, whyNotes({ p6: 4 })[0].text);
});

test('la nota del corazón usa el mismo aviso de emergencia (106) que el resto de Mindi', () => {
  const corazon = WHY_NOTES.find((n) => n.id === 'p4').text;
  assert.ok(corazon.includes(EMERGENCY_ACTION));
  assert.match(corazon, /106 \(SAMU\)\.$/);
});

test('ninguna nota afirma una causa solo hormonal en ánimo, articulaciones o deseo sexual', () => {
  for (const id of ['p5', 'p7', 'p11']) {
    const t = WHY_NOTES.find((n) => n.id === id).text;
    assert.doesNotMatch(t, /base hormonal|explicación hormonal|el estrógeno ayuda/i, id);
  }
});
