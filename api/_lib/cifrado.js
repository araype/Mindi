// Mindi · Cifrado del correo en `leads` (decisión de la Fase 0, handoff 11.4).
// AES-256-GCM con LEADS_ENC_KEY (32 bytes en base64). Formato: "v1:<iv base64>:<cifrado+tag base64>".
// Solo lo descifra la función send-report, que tiene la misma clave en sus secretos.
// Generar una clave: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function key() {
  const k = Buffer.from(process.env.LEADS_ENC_KEY || '', 'base64');
  if (k.length !== 32) throw Object.assign(new Error('LEADS_ENC_KEY'), { code: 'no_enc_key' });
  return k;
}

export function encryptContact(plain) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final(), c.getAuthTag()]);
  return `v1:${iv.toString('base64')}:${ct.toString('base64')}`;
}

export function decryptContact(value) {
  if (!String(value).startsWith('v1:')) return value; // filas anteriores, sin cifrar
  const [, ivB64, ctB64] = String(value).split(':');
  const data = Buffer.from(ctB64, 'base64');
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  d.setAuthTag(data.subarray(data.length - 16));
  return Buffer.concat([d.update(data.subarray(0, data.length - 16)), d.final()]).toString('utf8');
}
