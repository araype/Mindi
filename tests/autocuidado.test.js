// Tests de las recomendaciones de autocuidado y de la recomendación médica. Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScores, computeLevel, doctorRecommendation, DOCTOR_RECOMMENDATION } from '../supabase/functions/_shared/mrs.js';
import { topSelfCare, selfCareItems, mostAffectedArea, SELF_CARE_UNIVERSAL } from '../supabase/functions/_shared/autocuidado.js';

const chat = (answers) => topSelfCare(answers, computeScores(answers));

test('el chat nunca muestra más de 2 consejos', () => {
  const all = { p3: 4, p4: 4, p5: 4, p6: 4, p7: 4, p8: 4, p9: 4, p10: 4, p11: 4, p12: 4, p13: 4 };
  assert.equal(chat(all).length, 2);
  assert.equal(chat({}).length, 2);
});

test('área más afectada: en proporción a su corte, no en puntos', () => {
  // Cuerpo 6/8 = 0.75; íntimo 3/3 = 1 → íntimo, aunque tenga menos puntos.
  assert.equal(mostAffectedArea(computeScores({ p3: 3, p6: 3, p12: 3 })), 'urogenital');
  assert.equal(mostAffectedArea(computeScores({})), null);
});

test('los consejos salen del área más afectada, del ítem más fuerte primero', () => {
  assert.deepEqual(chat({ p3: 2, p6: 4 }), [
    'Sueño: horarios fijos y un cuarto fresco.',
    'Bochornos: ropa en capas y menos café, alcohol y picante.',
  ]);
});

test('si el área tiene un solo consejo, se completa con uno general', () => {
  assert.deepEqual(chat({ p12: 3 }), ['Al orinar: ejercicios de Kegel, sin receta.', SELF_CARE_UNIVERSAL[0].short]);
});

test('sin síntomas de 2 o más: consejos generales', () => {
  assert.deepEqual(chat({ p3: 1, p7: 1 }), SELF_CARE_UNIVERSAL.slice(0, 2).map((s) => s.short));
});

test('el reporte sigue con la lista completa', () => {
  assert.equal(selfCareItems({ p3: 2, p6: 4, p12: 3 }).length, 3 + SELF_CARE_UNIVERSAL.length);
});

test('recomendación médica según el nivel guardado', () => {
  assert.equal(doctorRecommendation(computeLevel(computeScores({}))), DOCTOR_RECOMMENDATION.A);
  assert.equal(doctorRecommendation('B'), DOCTOR_RECOMMENDATION.B);
  assert.equal(doctorRecommendation('C'), DOCTOR_RECOMMENDATION.C);
  assert.equal(doctorRecommendation('alert'), DOCTOR_RECOMMENDATION.alert);
});
