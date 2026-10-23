// Tests de las recomendaciones de autocuidado y de la recomendación médica. Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScores, computeLevel, doctorRecommendation, DOCTOR_RECOMMENDATION, agentMrsResult, EMERGENCY_NOW } from '../supabase/functions/_shared/mrs.js';
import { topSelfCare, selfCareItems, mostAffectedArea, SELF_CARE_UNIVERSAL } from '../supabase/functions/_shared/autocuidado.js';

const chat = (answers) => topSelfCare(answers, computeScores(answers));

test('el chat nunca muestra más de 2 consejos', () => {
  const all = { p3: 4, p4: 4, p5: 4, p6: 4, p7: 4, p8: 4, p9: 4, p10: 4, p11: 4, p12: 4, p13: 4 };
  assert.equal(chat(all).length, 2);
  assert.equal(chat({}).length, 2);
});

// Misma regla y mismos casos que el agente (Mindi_agents, tests/test_filtro.py, LecturaMRS).
const area = (somatico, psicologico, urogenital) => mostAffectedArea({ somatico, psicologico, urogenital });
test('área más afectada: igual que el agente (solo áreas en el corte, en proporción al máximo)', () => {
  assert.equal(area(3, 10, 1), 'psicologico');   // J1
  assert.equal(area(11, 2, 0), 'somatico');      // J2
  assert.equal(area(1, 1, 9), 'urogenital');     // J3
  assert.equal(area(10, 2, 9), 'urogenital');    // 9/12 = 0.75 supera a 10/16 = 0.625
  assert.equal(area(7, 8, 3), 'psicologico');    // cuerpo 7 no llega a su corte (8)
  assert.equal(area(4, 2, 0), null);             // ninguna en el corte
});

test('los consejos salen del área más afectada, del ítem más fuerte primero', () => {
  assert.deepEqual(chat({ p3: 3, p4: 1, p6: 4 }), [
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

test('resultado que se le pasa al agente: puntajes y señal de alerta, nada más', () => {
  const r = agentMrsResult(computeScores({ p3: 4, p7: 3, p12: 2 }), false);
  assert.deepEqual(r, { total: 9, somatico: 4, psicologico: 3, urogenital: 2, senal_alerta: false });
  assert.equal(agentMrsResult(computeScores({}), true).senal_alerta, true);
});

test('el aviso de emergencia da el mismo número que el agente', () => {
  assert.match(EMERGENCY_NOW, /106 \(SAMU\)/);
});
