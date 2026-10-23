// Mindi · Enlaces a WhatsApp del equipo (wa.me). El número viene de VITE_WHATSAPP_NUMBER;
// si está vacío, no se muestra ningún botón. WhatsApp complementa al test: no se compara con él.

/* Textos que la usuaria ya ve escritos al abrir WhatsApp, según desde dónde lo abre. */
export const WHATSAPP_TEXT = {
  landing: 'Hola Mindi, tengo una consulta sobre la menopausia',
  resultado: 'Hola Mindi, hice el test y tengo una duda sobre mi resultado',
  filtro: 'Hola Mindi, tengo una consulta sobre la menopausia',
  agente: 'Hola Mindi, tengo una consulta sobre la menopausia',
};

/** number: con o sin espacios, "+" o guiones (p. ej. "51927671423"). → URL de wa.me, o null sin número. */
export function whatsappUrl(number, text) {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Canal de tips (VITE_WHATSAPP_CHANNEL_URL): solo un enlace https de whatsapp.com/channel/.
 *  Cualquier otro valor (vacío, otro dominio) → null, y la invitación no se muestra. */
export function channelUrl(url) {
  const u = String(url || '').trim();
  return /^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9]+$/.test(u) ? u : null;
}
