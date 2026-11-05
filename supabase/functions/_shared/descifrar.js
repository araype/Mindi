// Mindi · Descifrar contactos ("v1:<iv base64>:<cifrado+tag base64>", AES-256-GCM con LEADS_ENC_KEY).
// Lo cifra el servidor de la web (api/_lib/cifrado.js). Lo usan send-report (para mandar el correo) y
// export-lists (para la exportación del panel). Solo WebCrypto: sirve igual en Deno y en Node (tests).

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Valor cifrado → texto. Lo que no empieza con "v1:" (filas anteriores al cifrado) vuelve tal cual. */
export async function decryptContact(value, keyB64) {
  if (value == null || !String(value).startsWith('v1:')) return value;
  if (!keyB64) throw new Error('LEADS_ENC_KEY no configurada');
  const [, iv, ct] = String(value).split(':');
  const key = await globalThis.crypto.subtle.importKey('raw', b64(keyB64), 'AES-GCM', false, ['decrypt']);
  const plain = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(iv) }, key, b64(ct));
  return new TextDecoder().decode(plain);
}
