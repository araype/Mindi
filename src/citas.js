// Mindi · Horarios tentativos para "Agendar cita" (17 nov. 2026).
//
// Prueba de demanda: todavía no hay especialistas con agenda, así que se muestran horarios TENTATIVOS
// para medir cuántas usuarias eligen uno (evento cita_slot {answer, desde}). Se dice claramente que es
// tentativo y que el equipo escribe para confirmar: nunca se muestra como una cita confirmada.
// Lo usan la landing (src/landing.js, lista "consultas") y el reporte (src/main.js).

export const SLOT_TIMES = ['9:00 a. m.', '3:00 p. m.', '7:00 p. m.'];
export const SLOT_NOTE = 'Estamos abriendo las consultas con especialistas. El horario que elijas nos ayuda a organizarlas; te escribiremos para confirmar.';
const SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Los próximos `n` días con atención (lunes a sábado), desde mañana. */
export function tentativeDays(now = new Date(), n = 5) {
  const out = [];
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) out.push(new Date(d));
  }
  return out;
}
const dayShort = (d) => `${SHORT[d.getDay()]} ${d.getDate()}`;
/** Texto del horario elegido, p. ej. "martes 18 · 3:00 p. m." (cabe en las props de un evento). */
export const slotLabel = (d, time) => `${LONG[d.getDay()]} ${d.getDate()} · ${time}`;

/** Mensaje final: sin horario, el mensaje de siempre; con horario, se repite como preferencia. */
export function citaDoneText(slot) {
  return slot
    ? `¡Listo! Guardamos tu horario preferido (${slot}). Te escribiremos para confirmar tu cita.`
    : '¡Listo! Te escribiremos pronto para coordinar tu cita.';
}

/** Dibuja el selector dentro de `box`. onPick(label) se llama al elegir. Devuelve { value }. */
export function mountSlotPicker(box, { onPick, now } = {}) {
  const days = tentativeDays(now);
  box.innerHTML =
    `<fieldset class="slots"><legend>Elige un horario tentativo <span>(opcional)</span></legend>` +
    days.map((d, i) =>
      `<div class="slot-row"><span class="slot-day">${dayShort(d)}</span>` +
      SLOT_TIMES.map((t, j) => `<button type="button" class="slot" data-d="${i}" data-t="${j}" aria-pressed="false" aria-label="${slotLabel(d, t)}">${t}</button>`).join('') +
      `</div>`).join('') +
    `<p class="slot-note">${SLOT_NOTE}</p></fieldset>`;
  const state = { value: null };
  box.querySelectorAll('.slot').forEach((b) => b.addEventListener('click', () => {
    box.querySelectorAll('.slot[aria-pressed="true"]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    state.value = slotLabel(days[+b.dataset.d], SLOT_TIMES[+b.dataset.t]);
    if (onPick) onPick(state.value);
  }));
  return state;
}
