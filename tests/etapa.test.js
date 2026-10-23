// Tests del filtro de etapa (edad + ciclo). Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stageFilter, STAGE_EXIT } from '../src/etapa.js';

const AGES = ['Menor de 40', '40 a 45', '46 a 52', 'Mayor de 52'];
const CYCLES = [
  'Sigue regular',
  'Es irregular (varía o se retrasa)',
  'Más de 60 días sin regla',
  'Más de 12 meses sin regla',
  'Me hicieron una histerectomía',
];

test('menor de 40 con el ciclo regular: sale sin test', () => {
  assert.equal(stageFilter('Menor de 40', 'Sigue regular'), STAGE_EXIT.under40Regular);
});

test('menor de 40 con el ciclo irregular, ausente o con histerectomía: sale con recomendación médica', () => {
  for (const cycle of CYCLES.slice(1)) {
    assert.equal(stageFilter('Menor de 40', cycle), STAGE_EXIT.under40Irregular, cycle);
  }
});

test('desde los 40 el test sigue con cualquier ciclo', () => {
  for (const age of AGES.slice(1)) {
    for (const cycle of CYCLES) assert.equal(stageFilter(age, cycle), STAGE_EXIT.continue, `${age} / ${cycle}`);
  }
});

test('una menor de 40 nunca sigue al test, con ningún ciclo', () => {
  for (const cycle of CYCLES) assert.notEqual(stageFilter('Menor de 40', cycle), STAGE_EXIT.continue, cycle);
});

test('las opciones del chat son las mismas que conoce el filtro', async () => {
  const src = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const label of [...AGES, ...CYCLES]) {
    assert.ok(src.includes(`{label:'${label}'}`), `falta la opción "${label}" en main.js`);
  }
});
