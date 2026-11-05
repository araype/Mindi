# Experimento del test: versiones del flujo

Cada evento de `events` lleva `props.flujo` desde cierre-v2. Los eventos sin `flujo` son de la versión anterior.

| Versión | Desde | Qué cambia |
| :-- | :-- | :-- |
| v1 (sin `flujo`) | lanzamiento del rediseño (5 nov. 2026, mañana) | Resultado con 3 barras y 3 notas iguales, "Preguntas para tu médico", reporte con varios botones, satisfacción al final. |
| **cierre-v2** | **5 nov. 2026** (despliegue de la tarde) | Ver abajo. |

## cierre-v2 (5 nov. 2026)

- **Resultado:** una sola tarjeta. Título con el área que más pesa ("Lo que más pesa hoy: …"), recomendación de
  consultar, "Lo que marcaste" (los 2 síntomas más altos de esa área), su nota con fuente, barras y una línea con
  las otras áreas. La derivación a salud mental queda visible. "Qué significa este resultado" y las otras notas, plegados.
  "Preguntas para tu médico" sale de la secuencia (sigue en el reporte y el PDF).
- **Orden:** resultado → metas → **satisfacción** → nombre → reporte + correo → cierre.
- **Satisfacción:** "Mientras preparamos tu reporte: ¿te sirvió este resultado?" (antes: "¿Qué tal te pareció esta
  experiencia?"), con "Prefiero no responder". **La pregunta cambió: no comparar puntajes v1 vs. v2 como si fueran lo mismo.**
- **Reporte:** un botón principal ("Descargar PDF"), una descarga real de `reporte-mindi.pdf` (servido por `/api/report`).
  En el celular abre el menú nativo de compartir con el archivo (o lo descarga si el navegador no comparte archivos);
  en computadora lo descarga directo. Sin pestañas nuevas.
- **"Por qué puede pasarte":** oculto (chat, correo y PDF) hasta la validación médica: ninguno tiene fuente de la guía.

### Métricas que cambian
- **Tasa de satisfacción** = `satisfaction` / `result` (debería subir: ya no está después del PDF). Nuevo: `satisfaction_skip`.
- **Tasa de contacto** = `lead` con `captured=true` / `report_shown`.
- **Descargas** = `report_download` (`method`: `share` o `download`). Si compartió el archivo: `report_share` con `method: file`
  (el enlace de 30 días sigue siendo `report_share` con `link`, `copy` o `manual`).
- **Abandono resultado → metas** = 1 − `goals` / `result`.
- Nuevo: `result_detail_open` (`seccion`: `significado`, `areas`, `reporte`).

## Saludos y chat claro (5 nov. 2026, tarde)

- **Chat:** modo claro con la paleta del test. Saludo según cómo llega (resultado, alerta de evaluación, alerta de
  emergencia, general o tema) y, debajo, el aviso de IA en letra pequeña con "Empecemos". Desde el resultado (no en
  emergencia) hay dos sugerencias que aceptan el aviso y envían la pregunta. `agent_consent` se registra igual;
  nuevo `chat_suggestion` (`q`: `resultado` o `sentirme_mejor`). **La tasa de aceptación del chat puede subir.**
- **Inicio del test:** bienvenida nueva y botón "Empezar" (antes "Acepto y empiezo"); el aviso del 106 pasa a
  la tarjeta de inicio, debajo del botón. El texto de consentimiento no cambió. Desde el chat: "Hola de nuevo".

## consentimiento-inicio y cierre sin correo (5 nov. 2026, tarde)

- **consentimiento-inicio:** la casilla de investigación ("(Opcional) Acepto que mis respuestas, sin mi nombre ni mi
  contacto, se usen…") pasa del final a la tarjeta de bienvenida, sin marcar. Se guarda en `research_consents` cuando la
  sesión existe. Evento nuevo `research_consent` (`captured`, `desde: inicio`). **La tasa de consentimiento no es
  comparable con la anterior** (antes solo la veía quien llegaba al final).
- **Cierre sin correo:** el correo es una opción dentro de la tarjeta del reporte (sin "No, gracias") y el cierre
  (canal y "Pregúntale a Mindi") aparece siempre. `lead` ahora solo se registra con `captured=true`.
  La tasa de contacto puede bajar; la llegada al chat desde el resultado (`test_to_chat`) debería subir.

## Chat nivel 2 encendido (5 nov. 2026, tarde)

- `VITE_CHAT_RESEARCH_ENABLED=true` y `CHAT_RESEARCH_ENABLED=true` en Production. Casilla "Quiero que mis preguntas se
  usen…" sin marcar bajo el aviso de IA, y una versión corta junto al campo de escribir: se puede marcar o desmarcar en
  cualquier momento y vale desde la próxima pregunta (`chat_share` al aceptar, `chat_share_change` en cada cambio).
- Se corrigió que "Empecemos" se enviaba al agente como pregunta (desde el despliegue de saludos de esta tarde):
  esos chats tienen un primer mensaje "Empecemos" que no escribió la usuaria.
