// Tests de los enlaces a WhatsApp. Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whatsappUrl, WHATSAPP_TEXT } from '../src/whatsapp.js';

test('arma el enlace de wa.me con el texto ya escrito', () => {
  assert.equal(
    whatsappUrl('51927671423', WHATSAPP_TEXT.landing),
    'https://wa.me/51927671423?text=Hola%20Mindi%2C%20tengo%20una%20consulta%20sobre%20la%20menopausia',
  );
});

test('acepta el número con +, espacios o guiones', () => {
  assert.equal(whatsappUrl('+51 927-671-423', 'x'), 'https://wa.me/51927671423?text=x');
});

test('sin número no hay enlace (y no se muestra el botón)', () => {
  assert.equal(whatsappUrl('', 'x'), null);
  assert.equal(whatsappUrl(undefined, 'x'), null);
});

test('los textos de cada origen son los acordados', () => {
  assert.equal(WHATSAPP_TEXT.resultado, 'Hola Mindi, hice el test y tengo una duda sobre mi resultado');
});
