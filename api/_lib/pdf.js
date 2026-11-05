// El PDF del reporte, traído por el servidor desde Supabase Storage y entregado por /api/report
// (action 'pdf'), para que el navegador no necesite conectarse a Supabase (CSP: connect-src 'self').
export const PDF_MAX_BYTES = 4 * 1024 * 1024; // límite de respuesta de Vercel: 4,5 MB

/** Solo URLs firmadas de Storage del propio proyecto (nada de redirecciones a otros sitios).
 *  → Buffer del PDF, o lanza Error('pdf_failed'). */
export async function fetchReportPdf(pdfUrl, supabaseUrl, fetchImpl = fetch) {
  let u;
  try { u = new URL(pdfUrl); } catch { throw new Error('pdf_failed'); }
  const base = new URL(supabaseUrl);
  if (u.protocol !== 'https:' || u.host !== base.host || !u.pathname.startsWith('/storage/v1/object/sign/')) throw new Error('pdf_failed');
  const r = await fetchImpl(u.href, { redirect: 'error' });
  if (!r.ok) throw new Error('pdf_failed');
  const buf = Buffer.from(await r.arrayBuffer());
  if (!buf.length || buf.length > PDF_MAX_BYTES || buf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('pdf_failed');
  return buf;
}
