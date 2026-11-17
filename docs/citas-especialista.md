# Citas con especialistas: cómo funciona y cómo integrar a la especialista

Actualizado el 17 nov. 2026.

## 1. Dónde aparece "Agendar" en el flujo

La cita se ofrece según lo que dice la guía (el mismo nivel del resultado), nunca a quien no la necesita:

| Nivel del test | Resultado | Reporte | Chat con Mindi IA |
|---|---|---|---|
| A (sin molestias o leves) | Sin botón | Caja discreta ("cuando quieras") | Solo si ella pregunta cómo consultar o pide un tratamiento |
| B (conviene evaluarlo) | Botón "Agendar con un especialista" | Caja destacada | Lo ofrece cuando ya respondió su duda |
| C (tratamiento muy recomendable) | Botón, con borde destacado | Caja destacada | Igual que B |
| Alerta de evaluación | Botón, con borde destacado | Caja destacada | Igual que B |
| Alerta de emergencia | **Sin botón: primero el 106** | Caja destacada (para después) | Nunca mientras dure la alerta |

En el chat, el agente usa la herramienta `ofrecer_cita` (como máximo dos veces por conversación). La landing mantiene
"Agendar cita" en el menú para quien ya sabe que quiere consultar.

## 2. Integrar a la especialista (sin tocar código)

Variables de Vercel (Settings → Environment Variables → Production) y volver a desplegar:

| Variable | Ejemplo | Qué hace |
|---|---|---|
| `VITE_CITA_URL` | `https://cal.com/dra-ejemplo/consulta` | Enlace de reserva real (Cal.com, Calendly o el suyo; solo `https`). Si está, "Agendar" abre su calendario. Si está vacío, siguen los horarios tentativos + WhatsApp del equipo |
| `VITE_CITA_ESPECIALISTA` | `la Dra. Ana Pérez, ginecóloga` | Se muestra como "Con la Dra. Ana Pérez, ginecóloga" |
| `VITE_CITA_MODALIDAD` | `virtual`, `presencial` o `ambas` | "Consulta virtual", "Consulta presencial" o "Virtual o presencial" |
| `VITE_CITA_PRECIO` | `S/ 120` | Se muestra tal cual |

Antes de activarlo:
- Agregar a la especialista (y la herramienta de reservas, si se usa) como encargada en la **Política de privacidad**: recibe
  el nombre y el contacto de quien reserva.
- Acordar el **tiempo de respuesta**, qué pasa si la usuaria no asiste y, si Mindi cobra comisión, decirlo con claridad.

## 3. Lo que se mide

- `cita_offer` (`desde`: resultado o chat; `answer`: urgente o recomendada en el resultado): se mostró el botón.
- `cita_open` (`desde`): tocó "Agendar".
- `cita_slot` (`answer`: horario tentativo) y `cita_whatsapp`: abrió WhatsApp para agendar.
- `cita_reserva`: abrió el calendario real de la especialista (con `VITE_CITA_URL`).
- Citas confirmadas y asistencia: etiquetas en WhatsApp Business (abajo), las cuenta el equipo.

Embudo: tests completados → nivel B, C o alerta → `cita_offer` → `cita_open` → `cita_whatsapp` o `cita_reserva` →
confirmadas → asistieron → repiten el test (`?src=wa`).

## 4. WhatsApp Business: mensajes y etiquetas

**Mensaje de bienvenida** (Herramientas para la empresa → Mensaje de bienvenida):
> ¡Hola! Gracias por escribir a Mindi. Si quieres agendar una cita con una especialista, ya tenemos el horario que
> elegiste en la web (o cuéntanos cuál te acomoda). Te respondemos en menos de 24 horas para confirmar.
> Si tienes una emergencia, llama al 106.

**Mensaje de ausencia** (fuera del horario de atención):
> ¡Hola! Estamos fuera de horario, pero ya recibimos tu mensaje. Te respondemos apenas volvamos para coordinar tu
> cita. Si es una emergencia, llama al 106.

**Respuestas rápidas** (se escriben con `/`):

| Atajo | Mensaje |
|---|---|
| `/cita` | ¡Perfecto! Tenemos disponible el [día] a las [hora], [virtual / en (lugar)]. La consulta cuesta [precio]. ¿Te la confirmamos? |
| `/confirmada` | ¡Listo! Tu cita queda para el [día] a las [hora]. Lleva (o ten a la mano) tu reporte de Mindi. Te escribimos un día antes para recordártela. |
| `/recordatorio` | Hola, [nombre]. Te recordamos tu cita de mañana, [día] a las [hora]. Si necesitas cambiarla, avísanos por aquí. |
| `/comofue` | Hola, [nombre]. ¿Cómo te fue en tu consulta? ¿Te quedó alguna duda? Si quieres, también puedes preguntarle a Mindi: https://mindifem.com/chat?src=wa |
| `/repetir` | Hola, [nombre]. Ya pasaron unas semanas desde tu consulta. Repite tu test (5 minutos) y compara cómo vas: https://mindifem.com/test?src=wa |
| `/sinagenda` | (Mientras no haya especialista con agenda) Gracias por escribirnos. Aún estamos abriendo las citas con especialistas; mientras tanto, te recomendamos agendar con tu ginecólogo o en tu centro de salud y llevar tu reporte de Mindi. Te avisaremos apenas tengamos agenda. |

**Calendario de seguimiento:**

| Momento | Atajo |
|---|---|
| Al confirmar | `/confirmada` |
| Un día antes | `/recordatorio` |
| Un día después | `/comofue` |
| 4 semanas después | `/repetir` (solo si ella aceptó que le escribamos: preguntarlo en `/confirmada`) |

**Etiquetas:** "Cita pedida", "Cita confirmada", "Asistió", "No asistió", "Seguimiento". Con ellas se cuenta cuántas
de las que escriben terminan en una cita, que la web no puede medir.
