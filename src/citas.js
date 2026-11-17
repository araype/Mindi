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
export function mountSlotPicker(box, { onPick, now, note = SLOT_NOTE } = {}) {
  const days = tentativeDays(now);
  box.innerHTML =
    `<fieldset class="slots"><legend>Elige un horario tentativo <span>(opcional)</span></legend>` +
    days.map((d, i) =>
      `<div class="slot-row"><span class="slot-day">${dayShort(d)}</span>` +
      SLOT_TIMES.map((t, j) => `<button type="button" class="slot" data-d="${i}" data-t="${j}" aria-pressed="false" aria-label="${slotLabel(d, t)}">${t}</button>`).join('') +
      `</div>`).join('') +
    `<p class="slot-note">${note}</p></fieldset>`;
  const state = { value: null };
  box.querySelectorAll('.slot').forEach((b) => b.addEventListener('click', () => {
    box.querySelectorAll('.slot[aria-pressed="true"]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    state.value = slotLabel(days[+b.dataset.d], SLOT_TIMES[+b.dataset.t]);
    if (onPick) onPick(state.value);
  }));
  return state;
}

/* ---------- Agendar por WhatsApp (17 nov. 2026) ----------
   En lugar del formulario, la usuaria elige un horario tentativo y abre el WhatsApp del equipo con un mensaje
   listo. El aviso le llega al equipo en el momento y la conversación ya queda abierta. El mensaje NO lleva su
   resultado ni sus síntomas (datos de salud): si quiere, los cuenta ella. Eventos: cita_slots_shown,
   cita_slot { answer } y cita_whatsapp { answer: horario o "sin_horario" }, todos con { desde }. */
export const SLOT_NOTE_WA = 'Estamos abriendo las consultas con especialistas. Elige un horario tentativo y escríbenos: coordinamos tu cita contigo por WhatsApp.';
export function citaWhatsappText(slot) {
  return 'Hola Mindi, quiero agendar una cita con un especialista.' + (slot ? ` Horario que prefiero: ${slot}` : '') // el horario ya termina en "p. m.";
}
export const ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
/** Horarios + botón "Agendar por WhatsApp" dentro de `box`. waUrl(texto) arma el enlace wa.me del equipo. */
export function mountCitaWhatsapp(box, { waUrl, desde, track, now }) {
  box.innerHTML = '<div class="cw-slots"></div>' +
    `<a class="rbtn rbtn-wa cw-btn" target="_blank" rel="noopener">${ICON_WA}<span>Agendar por WhatsApp</span></a>`;
  const a = box.querySelector('.cw-btn');
  const setLink = (slot) => { a.href = waUrl(citaWhatsappText(slot)); };
  setLink(null);
  const slots = mountSlotPicker(box.querySelector('.cw-slots'), {
    now, note: SLOT_NOTE_WA,
    onPick: (v) => { setLink(v); track('cita_slot', { answer: v, desde }); },
  });
  track('cita_slots_shown', { desde });
  a.addEventListener('click', () => track('cita_whatsapp', { desde, answer: slots.value || 'sin_horario' }));
  return slots;
}
