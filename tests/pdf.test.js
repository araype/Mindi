import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchReportPdf } from '../api/_lib/pdf.js';

const SB = 'https://proyecto.supabase.co';
const ok = (bytes) => async () => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode(bytes).buffer });

test('PDF: solo URLs firmadas del propio Storage y archivos que sí son PDF', async () => {
  const good = `${SB}/storage/v1/object/sign/reports/x.pdf?token=t`;
  assert.equal((await fetchReportPdf(good, SB, ok('%PDF-1.7 ...'))).subarray(0, 5).toString(), '%PDF-');
  for (const bad of ['https://otro.com/storage/v1/object/sign/x.pdf', `http://proyecto.supabase.co/storage/v1/object/sign/x`, `${SB}/rest/v1/sessions`, 'no-url'])
    await assert.rejects(fetchReportPdf(bad, SB, ok('%PDF-')), /pdf_failed/);
  await assert.rejects(fetchReportPdf(good, SB, ok('<html>')), /pdf_failed/);
  await assert.rejects(fetchReportPdf(good, SB, async () => ({ ok: false })), /pdf_failed/);
});

test('la CSP no abre Supabase al navegador', async () => {
  const { readFile } = await import('node:fs/promises');
  const v = await readFile(new URL('../vercel.json', import.meta.url), 'utf8');
  assert.doesNotMatch(v.match(/connect-src[^;]*/)[0], /supabase/);
});
