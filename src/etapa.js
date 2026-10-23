// Mindi · Filtro de etapa: decide, con la edad (P1) y el ciclo (P2), si el test sigue.
// La escala MRS y sus cortes están pensados para la transición a la menopausia, así que a una
// menor de 40 nunca se le muestra un puntaje:
//   - con el ciclo regular → mensaje de que Mindi es para mujeres desde los 40
//   - con el ciclo irregular, ausente o con histerectomía → recomendación de ver a un médico,
//     porque esos cambios antes de los 40 deben evaluarse
// Desde los 40 el flujo sigue igual.

export const STAGE_EXIT = {
  continue: 'continue',
  under40Regular: 'under40_regular',
  under40Irregular: 'under40_irregular',
};

export function stageFilter(age, cycle) {
  if (age !== 'Menor de 40') return STAGE_EXIT.continue;
  return cycle === 'Sigue regular' ? STAGE_EXIT.under40Regular : STAGE_EXIT.under40Irregular;
}
