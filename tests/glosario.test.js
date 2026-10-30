// Tests del glosario del chat. Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY, glossaryFor } from '../src/glosario.js';

test('están los términos acordados', () => {
  assert.deepEqual(Object.values(GLOSSARY).map((g) => g.term),
    ['Histerectomía', 'Perimenopausia', 'Postmenopausia', 'IMC', 'Aura', 'ACV', 'Hormono-dependiente']);
});

test('cada pregunta trae sus términos', () => {
  assert.deepEqual(glossaryFor('p2').map((g) => g.term), ['Histerectomía', 'Perimenopausia', 'Postmenopausia']);
  assert.deepEqual(glossaryFor('ctx_imc').map((g) => g.term), ['IMC']);
  assert.deepEqual(glossaryFor('ctx_aura').map((g) => g.term), ['Aura']);
  assert.deepEqual(glossaryFor('rf_terminos').map((g) => g.term), ['ACV', 'Hormono-dependiente']);
  assert.deepEqual(glossaryFor('p3'), []);
});

test('postmenopausia usa la misma definición clínica que la nota de etapa (12 meses sin regla)', () => {
  assert.match(GLOSSARY.postmenopausia.def, /12 meses seguidos sin regla/);
});

test('explicaciones cortas: caben en un desplegable sin saturar la pantalla', () => {
  for (const g of Object.values(GLOSSARY)) assert.ok(g.def.length <= 170, g.term);
});

test('cada pregunta con glosario tiene su enlace desplegable, como "¿Qué significa esto?"', async () => {
  const { glossaryMore } = await import('../src/glosario.js');
  assert.equal(glossaryMore('p2').q, '¿Qué significan estos términos?');
  assert.equal(glossaryMore('ctx_imc').q, '¿Qué es el IMC?');
  assert.equal(glossaryMore('ctx_aura').q, '¿Qué es el aura?');
  assert.equal(glossaryMore('rf_terminos').q, '¿Qué significan algunos términos?');
  assert.equal(glossaryMore('p2').items.length, 3);
});
