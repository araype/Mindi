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

## Casilla única y chat sin "Empecemos" (5 nov. 2026, noche)

- Casilla única de investigación al inicio del test: cubre respuestas y preguntas al chat (`consent_text_version`
  `inicio-v2` en las preguntas que llegan así). Si la marca, la casilla del chat aparece marcada y puede desmarcarla.
- Chat: una línea bajo el saludo con "Más información"; sin botón "Empecemos". `agent_consent` se registra con la
  primera pregunta o la primera sugerencia, así que **la tasa de aceptación cuenta a quienes escriben**, no a quienes abren.

## Permiso después del resultado (5 nov. 2026, noche) — `permiso-resultado`

- Bienvenida sin casillas: un botón "Empezar" y una línea mínima (Términos, Política, 106).
- Permiso de investigación una sola vez, tras el resultado y en lugar del botón "Continuar" (no suma pasos):
  "Sí, compartir" / "No, gracias". `research_consent` (`desde: resultado`, versión `resultado-v1`). Si acepta, cubre
  también el chat (no se le vuelve a preguntar).
- Chat sin casilla. Quien no aceptó: una pregunta única después de la primera respuesta (`chat_share`, `desde: chat`).
  Cambiar de opinión: enlace en "Más información" (`chat_share_change`).
- **La tasa de consentimiento no es comparable con `consentimiento-inicio`.**

## Compartir preguntas sin cortar el chat (5 nov. 2026, noche)

- Sin la burbuja tras la primera respuesta. Bajo el saludo: "Si quieres, puedo guardar tus preguntas sin tus datos para
  mejorar Mindi: Compartir mis preguntas". Al tocar "Salir" o tras 2 min sin escribir, una sola pregunta: "Antes de
  irte…". Si acepta, se guardan las preguntas de esa conversación (versión `chat-fin-v1` al final, `chat-v1` con el
  enlace). `chat_share` lleva `desde: final`. **La tasa de preguntas compartidas no es comparable con la anterior.**

## Chat: "Antes de empezar" con dos botones (5 nov. 2026, noche)

- (Reemplazado el mismo día por la tarjeta de un botón, ver abajo.) Tras el saludo, una tarjeta con dos botones:
  "Aceptar y compartir mis preguntas" (destacado) y "Aceptar sin compartir". Quien ya aceptó en el resultado ve solo
  "Aceptar". `agent_consent` = al tocar Aceptar (ya no con la primera pregunta). `chat_share` lleva `desde: inicio_chat`.
  Sin la pregunta al salir. **Las tasas de aceptación y de preguntas compartidas no son comparables con las anteriores.**

## Chat: tarjeta de un botón, estilo Geocito (5 nov. 2026, noche)

- Tras el saludo: "Para poder ayudarte, revisa esta información por favor:" con Política de privacidad (incluye que
  Mindi guarde las preguntas sin datos de contacto), Términos y condiciones, el 106, y un solo botón **Aceptar** dentro
  de la tarjeta. Debajo, el enlace "Prefiero no compartir mis preguntas" (usa el chat igual, sin guardar). Versión
  `chat-v2`. `agent_consent` al tocar cualquiera de los dos; `chat_share` con `captured` según la elección.

## Éxito del chat con IA (6 nov. 2026)

- Conversación exitosa = acepta, ≥ 2 preguntas, sin errores ni límite, y termina con una señal de valor ("me sirvió",
  va al test que Mindi recomendó, o llegó desde su resultado). Panel: tarjeta "Conversaciones" (`024_conversaciones.sql`).
- Eventos nuevos: `agent_feedback` (`answer` sí/no, una vez por conversación, tras la 2.ª respuesta), `agent_latency`
  (`ms`), `agent_limit`. `chat_test_recommended` y `chat_to_test` ya existían.

## Chat: compartir la conversación completa (6 nov. 2026)

- La tarjeta del chat (corta, como Geocito: el aviso "Para poder ayudarte…" va en su burbuja; sin la línea del 106,
  que sigue en el saludo de emergencia) dice "Autorizo que Mindi me responda con IA (OpenAI) y guarde esta conversación, sin mis datos de
  contacto". Enlace debajo: "Prefiero no compartir esta conversación". Versión `chat-v3`.
- Al aceptar se guardan, en `chat_messages_research` (`026_conversaciones_chat.sql`), la pregunta y la respuesta de
  Mindi, unidas por un código al azar por cada apertura de /chat (no la sesión del test). Ambas con el filtro de datos
  personales. 12 meses. Panel → Listas: "Conversaciones del chat" en texto (bloques) o CSV (una fila por mensaje).
- Cambio respecto de `chat-v2`: "Prefiero no compartir" aparece también para quien aceptó el permiso del resultado,
  y lo apaga para el chat. Las preguntas sueltas siguen en `chat_questions_research` (pestaña Chat con IA).
- Lo guardado antes (chat-v1/v2, resultado-v1) son solo preguntas sueltas: no se convierte en conversaciones.

## Experimento 2 · PC4: recurrencia en el chat (6 nov. 2026)

- Al tocar Aceptar (compartiendo), el navegador crea un código al azar `u-` + 16 caracteres y lo guarda en
  localStorage (`mindi_usuaria`). Va en cada mensaje guardado (`chat_messages_research.usuaria`, `027_recurrencia.sql`).
  Con "Prefiero no compartir" no se crea. Borrar datos o cambiar de equipo = usuaria nueva. Versión `chat-v4`
  (misma tarjeta; la política explica el código).
- `fecha` pasa a ser el día en Lima (antes UTC) para contar días distintos.
- Panel → Chat con IA → "Recurrencia": usuarias con código; % que pregunta en 2 días distintos o más entre su primer
  día y los 6 siguientes (solo usuarias cuyo primer día fue hace 7 días o más); preguntas promedio por conversación.
  El periodo se cuenta por el día de la primera conversación. No se filtra por origen.
- Export de conversaciones: columna `usuaria` (CSV) y "· usuaria u-…" en el texto.

## Permiso al inicio y reporte con dos botones (16 nov. 2026) — `inicio-v3`

- Sale la tarjeta "¿Me ayudas a mejorar Mindi?" del resultado (`resultado-v1`). El permiso pasa a una casilla opcional y
  desmarcada en la tarjeta de inicio, aparte de los Términos. `research_consent` (`desde: inicio`) al tocar "Empezar".
  **La tasa de consentimiento no es comparable con `resultado-v1`.**
- "Tu reporte está listo": solo "Enviar a mi correo" (Turnstile al tocarlo; `report_email_open`) y "Compartir por
  WhatsApp" (`report_share` con `method: file` en el celular o `whatsapp` con wa.me). Sin "Descargar PDF": **`report_download`
  deja de existir** (las descargas del panel quedan en 0). Sin la casilla de avisos del acompañamiento.
- El correo lleva el PDF adjunto (send-report).

## Permiso más visible y segunda oportunidad — `inicio-v4` y `reporte-v1`

- La casilla va en una tarjeta destacada **encima** de "Empezar" ("¿Nos ayudas a investigar la menopausia en el Perú?").
  Sigue desmarcada. Versión `inicio-v4`. **No comparable con `inicio-v3`.**
- Quien no la marcó ve en el reporte una invitación con el botón "Sí, compartir mis respuestas" (`reporte-v1`,
  `research_consent` con `desde: reporte`). Tasa total de permiso = (`inicio-v4` + `reporte-v1`) / tests completados.

## Vuelve "Descargar PDF" (16 nov. 2026, noche)

- "Tu reporte está listo": "Descargar PDF" como botón principal (descarga directa en celular y computadora,
  `report_download` con `method: download`) y, debajo, "Enviar a mi correo" y "Compartir por WhatsApp" (en verde).
  Entre el despliegue de la tarde y este no hubo botón: esas horas tienen 0 descargas. Compartir el archivo ya no cuenta como descarga:
  va en `report_share` (`method: file` o `whatsapp`).
- Saludo al empezar: "Hola, soy Mindi." y "Vamos a ver juntas cómo te has sentido. Respondes con un toque." antes
  de la primera pregunta ("Hola de nuevo." si llega desde el chat).

## cierre-v3 (16 nov. 2026, noche)

- **Orden:** saludo → **nombre (opcional)** → 11 preguntas + contexto + señales → resultado → metas → **reporte** →
  invitación al diario → satisfacción → cierre. Antes: … metas → satisfacción → nombre → reporte.
  `props.flujo = cierre-v3`. **No comparar el paso resultado → reporte con cierre-v2.**
- Saludo cálido ("¡Hola! Qué bueno tenerte aquí." + para qué está Mindi) y nombre: "¿cómo te gustaría que te llame?" (`name_step` con `captured`). Mindi lo usa en el test y en el reporte;
  solo vive en la pestaña y se guarda únicamente si deja su correo (como antes).
- Satisfacción: "¿Te sirvió este resultado?", después del reporte.
- Reporte: "Tus metas" (línea visible + sección con un primer paso por meta, de la Guía HNHU 6.4.1); también en el PDF
  (descarga, WhatsApp y correo). Las metas viajan con el pedido del PDF y no se guardan.
- "Agendar cita con un especialista" en el reporte: formulario corto → lista `consultas` con `origin: reporte`
  (`cita_open`, `waitlist_join` con `list: consultas` y `desde: reporte`). **Nuevo indicador posible: # usuarias que piden cita.**
- Invitación al diario después del reporte, con la primera meta: lista `plus` con `origin: reporte_diario`
  (`diario_invite_shown`, `diario_invite_open`, `waitlist_join` con `list: plus`).
- Se quitó la invitación al canal de tips de WhatsApp (`channel_click` deja de existir).
- El reporte se guarda en la pestaña (sessionStorage, 24 h): si la página se recarga al volver de WhatsApp o de la
  descarga, se muestra de nuevo (`report_shown` con `desde: restaurado`, `report_restored`). "Empezar de nuevo" lo borra.
- Ajuste del mismo día (antes de desplegar): el resultado tiene un solo desplegable, "Entender mi resultado"
  (escala MRS, barras, las tres áreas con su estado y el puntaje total; `result_detail_open` con `seccion: significado`;
  ya no existe `seccion: areas`). Después de las metas: "¿Usarías una herramienta que te ayude a lograrlo día a día?"
  (`tool_interest` con `answer`: `si`, `tal_vez` o `no`; **validación del diario**). Si dice que sí, puede dejar su correo
  (lista `plus`, `origin: reporte_diario`). La invitación al diario después del reporte y la línea "Tus metas" de la
  tarjeta se quitaron ("Tus metas" sigue en el reporte completo y en el PDF). Orden final: resultado → metas →
  herramienta → reporte → satisfacción → cierre.
- Tarjeta del resultado más corta: título con el área que más pesa ("Tus tres áreas pesan por igual" o "… y …" si empatan),
  la recomendación y las tres barras con los síntomas que marcó (moderado o más) debajo de cada una. Sin la etiqueta de
  nivel, "Lo que marcaste", el texto largo del área ni "también alcanzan…" (todo eso va en "Entender mi resultado").
  La línea de salud mental sigue visible cuando el ánimo alcanza su corte.
- Texto del área Cuerpo (mrs.js, web y PDF): decía "Los bochornos, el cansancio o los dolores…", pero el cansancio es del
  área Ánimo en la escala MRS. Ahora: "Los bochornos, las palpitaciones, los dolores o el mal sueño…".
- Se quitó "Ver el reporte completo" de "Tu reporte" (repetía lo que trae el PDF; `result_detail_open` con
  `seccion: reporte` deja de existir). En su lugar, una línea dice qué incluye el PDF, y el aviso de orientación
  queda al pie de la tarjeta.
- **Satisfacción dentro de "Tu reporte"** ("¿Te sirvió este resultado?", 5 caritas, no bloquea nada). **Evento nuevo:
  `report_satisfaction` (`answer`, `score`)**. El evento `satisfaction` (y `satisfaction_skip`) deja de registrarse, así
  la serie anterior (otra pregunta y otro lugar del flujo) queda intacta y no se mezcla. Si ya respondió y la página se
  recarga, no se vuelve a preguntar. El panel todavía lee `satisfaction`: hay que sumar `report_satisfaction` como serie aparte.

## Scroll del chat en el celular (17 nov. 2026)

- Las tarjetas más altas que el 60 % del chat (resultado, reporte) se muestran desde su título, no desde el final.
- El chat solo baja solo si la usuaria está al final; si subió a leer, no la arrastra y aparece "Nuevo ↓".
- Un segundo ajuste del scroll a los 280 ms evita que la vista quede a la mitad cuando algo se acomoda tarde.

## Horarios tentativos en "Agendar cita" (17 nov. 2026) — prueba de demanda

- En la landing (menú "Agendar cita") y en el reporte ("Agendar cita con un especialista"): los próximos 5 días de
  atención (lunes a sábado) × 9:00 a. m., 3:00 p. m. y 7:00 p. m., marcados como **tentativos y opcionales**, con la nota
  "te escribiremos para confirmar". Nunca se muestra como cita confirmada.
- Eventos: `cita_slots_shown` (`desde`: `landing` o `reporte`) y `cita_slot` (`answer`: p. ej. "jueves 19 · 3:00 p. m.").
  Tasa de interés = sesiones con `cita_slot` / sesiones con `cita_slots_shown`.
- El horario elegido va solo en el evento, no en la lista `consultas`: al contactar, el equipo no lo ve junto al correo.

## "Agendar cita": WhatsApp obligatorio y aviso en lugar de casilla (17 nov. 2026)

- **Requiere el SQL 029 antes de desplegar** (el correo pasa a ser opcional y se agrega `horario`).
- En la cita (landing y reporte), el WhatsApp es obligatorio y el correo, opcional. Las otras listas siguen pidiendo correo.
- El horario tentativo elegido se guarda junto al contacto (`interest_signups.horario`) y sale en la exportación de `consultas`.
- En los formularios de listas (cita, diario, Plus, especialistas, empresas), la casilla "Acepto la Política de privacidad"
  se reemplazó por un aviso al pie: "Al enviar, aceptas que te contactemos solo para esto…" (`consent_text_version:
  aviso-envio-v1`). La casilla de investigación (datos de salud) sigue siendo una casilla aparte, opcional y desmarcada.

## "Agendar por WhatsApp" (17 nov. 2026)

- En la landing y en el reporte, "Agendar cita" ya no muestra un formulario: horarios tentativos y el botón
  "Agendar por WhatsApp", que abre el WhatsApp del equipo con "Hola Mindi, quiero agendar una cita con un
  especialista. Horario que prefiero: …". El mensaje no lleva el resultado ni los síntomas.
- El equipo se entera en el momento (cierra el círculo que antes quedaba abierto: nadie veía la lista `consultas`).
- Eventos: `cita_slots_shown`, `cita_slot` y **`cita_whatsapp`** (`answer`: horario o `sin_horario`), con `desde`.
  Indicador: **# usuarias que abren WhatsApp para agendar**; cuántas terminan en cita lo cuenta el equipo en WhatsApp.
- Sin `VITE_WHATSAPP_NUMBER`, se usa el formulario anterior (lista `consultas`).

## Origen de la visita: Instagram, WhatsApp y Google (17 nov. 2026)

- Además de TikTok y Facebook, se detectan solos **Instagram** (su navegador interno o `l.instagram.com`), **Google**
  (la visita viene de google.*) y **LinkedIn**. Instagram se revisa antes que Facebook: también agrega `?fbclid=`, y
  antes esas visitas contaban como Facebook. Detección en `src/origen.js`.
- **WhatsApp** solo se detecta en las versiones con navegador propio: casi siempre abre el navegador normal sin dejar
  rastro. Para WhatsApp, compartir **`mindifem.com/?src=wa`** (atajos: `?src=ig`, `?src=tt`, `?src=fb`).
- Desde este cambio, el origen `instagram` puede crecer y `facebook` bajar: no es que cambie el tráfico, es que antes se
  confundían. Lo anterior a este cambio no se corrige.

## El chat recuerda la conversación y conoce el reporte (17 nov. 2026)

- **Nivel 1:** la conversación del chat se guarda en la pestaña (`sessionStorage`, 24 h). Si recarga /chat o vuelve de
  otra app, la ve y sigue con la misma sesión del agente (`chat_restored`). Si el agente se reinició, se abre otra sesión
  con su resultado sin que lo note. Ir al test desde el chat o "Empezar de nuevo" la borra.
- **Nivel 2:** al ir del resultado o del reporte al chat, además de los 4 puntajes y la señal de alerta, el agente recibe
  hasta 6 síntomas que marcó como moderados o más, sus metas, su rango de edad y cómo está su regla. El servidor
  (`cleanResultado`) y el agente (`detalle_reporte`) solo aceptan valores de listas cerradas. Política actualizada.

## La cita según el nivel y lista para la especialista (17 nov. 2026)

- Resultado: botón "Agendar con un especialista" solo en nivel B, C o alerta de evaluación (nunca en emergencia).
  Reporte: caja destacada para quien la necesita y discreta en nivel A. Chat: el agente puede ofrecerla
  (`ofrecer_cita`). Eventos nuevos: `cita_offer` (`desde`, `answer`), `cita_open` con `desde`, `cita_reserva`.
- Integración con la especialista por variables de Vercel (`VITE_CITA_URL`, `VITE_CITA_ESPECIALISTA`,
  `VITE_CITA_MODALIDAD`, `VITE_CITA_PRECIO`). Guía y plantillas de WhatsApp en `docs/citas-especialista.md`.

## Cierre más corto: diario, satisfacción en la espera y sin segunda oportunidad (18 nov. 2026)

- Resultado: sin el botón "Agendar con un especialista" (repetía la recomendación de arriba). Desde aquí,
  `cita_offer` solo viene del chat; "Agendar" sigue en "Tu reporte".
- Diario: "¡Qué bueno! … ¿Te avisamos cuando esté listo?" en una sola tarjeta, con "Sí, avísame" (abre un campo de
  WhatsApp opcional, lista `plus`) y "Ahora no". El reporte aparece recién después de elegir. Eventos nuevos:
  `diario_skip`, `diario_sin_numero`. La lista `plus` acepta correo o WhatsApp (al menos uno).
- Satisfacción: se pregunta mientras se prepara el reporte ("Estamos preparando tu reporte…"), sin bloquear: el
  reporte aparece al responder o a los 3 segundos. Mismo evento `report_satisfaction`, ahora con `desde: 'espera'`.
  Antes (16 al 18 nov.) estaba dentro del reporte: al comparar, separar por esa fecha.
- Se quitó la segunda oportunidad del permiso de investigación en el reporte (reporte-v1): el permiso se pide solo
  en la tarjeta del inicio. Desde aquí, `research_consent` solo trae `desde: 'inicio'`.
