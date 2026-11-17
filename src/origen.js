// Mindi · De qué canal llegó la visita (`origin` en los eventos). Ver src/main.js (ORIGIN).
//
// 1) Si el enlace lo dice (?utm_source= o ?src=), manda eso. Atajos: ?src=wa, ?src=ig, ?src=tt, ?src=fb.
// 2) Si no, se reconoce por el navegador interno de la app o por la página de la que viene (referrer):
//    TikTok, Instagram, Facebook, WhatsApp, Google y LinkedIn.
//    · Instagram va ANTES que Facebook: Instagram también agrega ?fbclid= a sus enlaces.
//    · WhatsApp casi siempre abre los enlaces en el navegador normal, sin dejar rastro: solo se detecta en las
//      versiones con navegador propio. Para WhatsApp, lo seguro es compartir mindifem.com/?src=wa.
// 3) Si nada de eso, null (main.js usa el origen guardado de una visita anterior, o "sin origen").

const ALIAS = { wa: 'whatsapp', ig: 'instagram', tt: 'tiktok', fb: 'facebook', li: 'linkedin' };
export const cleanOrigin = (v) => {
  const o = String(v || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30);
  return ALIAS[o] || o || null;
};

export function detectOrigin({ search = '', ua = '', referrer = '' } = {}) {
  const q = new URLSearchParams(search);
  const fromLink = cleanOrigin(q.get('utm_source') || q.get('src'));
  if (fromLink) return fromLink;
  if (/tiktok|musical_ly|bytedance/i.test(ua) || /tiktok\.com/i.test(referrer)) return 'tiktok';
  if (/Instagram/i.test(ua) || /(^|\.)instagram\.com/i.test(referrer)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB/.test(ua) || /facebook\.com|fb\.me/i.test(referrer) || q.has('fbclid')) return 'facebook';
  if (/WhatsApp/i.test(ua) || /whatsapp\.com|wa\.me/i.test(referrer)) return 'whatsapp';
  if (/LinkedInApp/i.test(ua) || /linkedin\.com|lnkd\.in/i.test(referrer)) return 'linkedin';
  if (/(^|\.)google\.[a-z.]+(\/|$)/i.test(referrer.replace(/^https?:\/\//, '')) || q.has('gclid')) return 'google';
  return null;
}
