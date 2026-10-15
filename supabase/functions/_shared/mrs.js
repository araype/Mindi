// Mindi · Puntaje MRS y nivel según la Guía HNHU (RD N° 211-2024-DG/HNHU).
//
// ÚNICA fuente de los puntos de corte. La usan:
//   - el chat (src/main.js, vía Vite)
//   - la función send-report (Deno, al desplegar se sube junto con la función)
//   - los tests (node --test, tests/mrs.test.js)
// JavaScript plano y sin dependencias a propósito, para que los tres lo carguen igual.
//
// Agrupación (Anexo 1 de la guía): Somático ítems 1-4 (p3-p6), Psicológico 5-8 (p7-p10),
// Urogenital 9-11 (p11-p13). Cada ítem vale 0-4.
// Cortes (Figura 6, "Tratamiento por síntomas"):
//   C → MRS Total ≥15                                   ("THM muy recomendable")
//   B → Total ≥8 / Somático ≥8 / Psicológico ≥6 / Urogenital ≥3  ("según evaluación individual")
//   A → ninguno de los anteriores
// Son umbrales para decidir tratamiento, no categorías de intensidad.

export const SUBSCALES = {
  somatico:    ['p3', 'p4', 'p5', 'p6'],
  psicologico: ['p7', 'p8', 'p9', 'p10'],
  urogenital:  ['p11', 'p12', 'p13'],
};

export const CUTS = {
  totalC: 15,
  totalB: 8,
  somatico: 8,
  psicologico: 6,
  urogenital: 3,
};

/** answers: { p3: 0-4 | null, … } → { somatico, psicologico, urogenital, total }.
 *  Una pregunta sin responder (null) suma 0. */
export function computeScores(answers) {
  const sum = (ids) => ids.reduce((acc, id) => acc + (answers?.[id] || 0), 0);
  const somatico = sum(SUBSCALES.somatico);
  const psicologico = sum(SUBSCALES.psicologico);
  const urogenital = sum(SUBSCALES.urogenital);
  return { somatico, psicologico, urogenital, total: somatico + psicologico + urogenital };
}

/** scores: { somatico, psicologico, urogenital, total } → 'A' | 'B' | 'C'. */
export function computeLevel(scores) {
  const s = scores || {};
  if ((s.total || 0) >= CUTS.totalC) return 'C';
  if ((s.total || 0) >= CUTS.totalB
    || (s.somatico || 0) >= CUTS.somatico
    || (s.psicologico || 0) >= CUTS.psicologico
    || (s.urogenital || 0) >= CUTS.urogenital) return 'B';
  return 'A';
}
