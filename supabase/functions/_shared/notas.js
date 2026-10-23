// Mindi · "Por qué puede pasarte": una nota por síntoma, en el reporte (chat, correo y PDF).
//
// Solo aparecen los síntomas respondidos con 2 ("Moderado") o más, en el orden de la escala.
// Sin cierres por intensidad: la recomendación de ir al médico ya va arriba, en el resultado.
// VERSIÓN PROVISIONAL, pendiente de validación médica (ver revision_clinica/ en Mindi_agents).
// JavaScript plano y sin dependencias, igual que mrs.js.

import { EMERGENCY_ACTION } from './mrs.js';

export const WHY_TITLE = 'Por qué puede pasarte';

export const WHY_NOTES = [
  { id: 'p3', label: 'Bochornos',
    text: 'Los bochornos se deben a cambios en cómo el cuerpo regula la temperatura cuando bajan los estrógenos. Son una respuesta física real y muy frecuente en esta etapa.' },
  { id: 'p4', label: 'Corazón',
    text: `Algunas mujeres sienten el corazón acelerado durante un bochorno. Coméntalo con tu médico(a), sobre todo si te pasa a menudo. Si viene con dolor o presión en el pecho, falta de aire o mareo, ${EMERGENCY_ACTION}.` },
  { id: 'p5', label: 'Músculos y articulaciones',
    text: 'Muchas mujeres notan dolores articulares en esta etapa. Pueden influir los cambios hormonales, pero también la edad y la actividad física, así que vale la pena revisarlo con tu médico(a).' },
  { id: 'p6', label: 'Sueño',
    text: 'Los problemas de sueño son frecuentes en esta etapa, sobre todo cuando los bochornos o la sudoración nocturna te despiertan. También pueden influir el estrés y otros factores.' },
  { id: 'p7', label: 'Ánimo',
    text: 'Muchas mujeres notan cambios de ánimo en esta etapa. Pueden influir los cambios hormonales, el sueño y lo que estás viviendo. Si la tristeza se mantiene por varias semanas o te cuesta hacer tus actividades, busca apoyo de un profesional.' },
  { id: 'p8', label: 'Irritabilidad',
    text: 'La irritabilidad también es frecuente en esta etapa y suele empeorar cuando duermes mal. No significa que algo esté mal contigo.' },
  { id: 'p9', label: 'Ansiedad',
    text: 'La ansiedad puede aparecer o intensificarse en esta etapa, por los cambios en el cuerpo y en la vida. Si te limita en tu día a día, un profesional de salud mental puede ayudarte.' },
  { id: 'p10', label: 'Cansancio',
    text: 'El cansancio es muy común en esta etapa y se relaciona con el sueño, el ánimo y otros cambios. Si es intenso o no mejora, coméntalo con tu médico(a), porque también puede tener otras causas.' },
  { id: 'p11', label: 'Deseo sexual',
    text: 'Los cambios en el deseo sexual son comunes en esta etapa, y pueden influir factores físicos, como la sequedad, y emocionales. No significa que algo esté mal contigo.' },
  { id: 'p12', label: 'Al orinar',
    text: 'Los cambios al orinar se relacionan con la baja de estrógenos, que afecta los tejidos de la zona. Son más comunes de lo que se habla y tienen manejo.' },
  { id: 'p13', label: 'Sequedad íntima',
    text: 'La sequedad íntima ocurre porque esos tejidos también dependen de los estrógenos. Hay opciones simples que puedes comentar con tu médico(a).' },
];

/** answers: { p3: 0-4 | null, … } → [{ id, label, text }] de los síntomas en 2 o más. Vacío si ninguno. */
export function whyNotes(answers) {
  return WHY_NOTES.filter((n) => answers?.[n.id] != null && answers[n.id] >= 2);
}
