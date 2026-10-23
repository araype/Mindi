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

test('las variables usan el prefijo VITE_, como el resto del proyecto en Vercel', async () => {
  const { readFile } = await import('node:fs/promises');
  const read = (f) => readFile(new URL(`../${f}`, import.meta.url), 'utf8');
  assert.match(await read('src/main.js'), /import\.meta\.env\.VITE_WHATSAPP_NUMBER/);
  assert.match(await read('src/legal.js'), /import\.meta\.env\.VITE_AGENT_CHAT_ENABLED/);
  for (const f of ['src/main.js', 'src/legal.js', 'src/whatsapp.js', 'vite.config.js']) {
    assert.doesNotMatch(await read(f), /NEXT_PUBLIC_/, f);
  }
});

test('canal de tips: solo enlaces de whatsapp.com/channel; vacío u otro dominio no se muestra', async () => {
  const { channelUrl } = await import('../src/whatsapp.js');
  const ok = 'https://whatsapp.com/channel/0029VbDoxy6I1rchcFrvEC0B';
  assert.equal(channelUrl(ok), ok);
  assert.equal(channelUrl(` ${ok} `), ok);
  assert.equal(channelUrl(''), null);
  assert.equal(channelUrl(undefined), null);
  assert.equal(channelUrl('https://ejemplo.com/channel/abc'), null);
  assert.equal(channelUrl('javascript:alert(1)'), null);
});
