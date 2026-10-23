// Mindi · Glosario del chat: explicaciones cortas que se abren con el ícono ⓘ junto a la
// pregunta (nunca dentro de un botón de respuesta, porque tocarlo elige esa opción).
// Perimenopausia y postmenopausia usan la definición clínica de la guía HNHU (6.2.1),
// la misma que la nota de etapa del reporte. Pendiente de validación médica.

export const GLOSSARY = {
  histerectomia: { term: 'Histerectomía', def: 'Es la cirugía en la que se retira el útero. Después de ella ya no hay regla.' },
  perimenopausia: { term: 'Perimenopausia', def: 'Es la transición hacia la menopausia: la regla empieza a variar y pueden aparecer síntomas. Dura hasta un año después de la última regla.' },
  postmenopausia: { term: 'Postmenopausia', def: 'Es la etapa que empieza cuando ya pasaron 12 meses seguidos sin regla.' },
  imc: { term: 'IMC', def: 'El índice de masa corporal relaciona tu peso con tu talla: peso en kilos dividido entre la talla en metros al cuadrado. Entre 30 y 40 se considera obesidad.' },
  aura: { term: 'Aura', def: 'Son señales que aparecen antes del dolor de cabeza y duran unos minutos: destellos, luces o líneas en zigzag, o un hormigueo en la cara o la mano.' },
};

/** Términos que explica cada pregunta (id de la pregunta → claves del glosario). */
export const GLOSSARY_BY_QUESTION = {
  p2: ['histerectomia', 'perimenopausia', 'postmenopausia'],
  ctx_imc: ['imc'],
  ctx_aura: ['aura'],
};

/** id de la pregunta → [{ term, def }] en el orden definido. */
export function glossaryFor(questionId) {
  return (GLOSSARY_BY_QUESTION[questionId] || []).map((k) => GLOSSARY[k]);
}
