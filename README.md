# Mindi

Mindi ayuda a las mujeres en la perimenopausia y la menopausia a entender lo que sienten, con un
test gratuito de 5 minutos basado en la escala MRS y un reporte para llevar a su médico. Sitio:
Vite + funciones de Vercel (`api/`), Supabase y un agente de IA en Cloud Run (repo Mindi_agents).

## Sistema de diseño (referencia breve)

La fuente de verdad del diseño es `docs/MINDI_HANDOFF.md` (secciones 3 a 7 y 10). Este paquete solo
la vuelve usable, sin duplicarla:

| Qué | Dónde |
| :-- | :-- |
| Valores (color, tipografía, espacios, radios, sombras, movimiento) | `tokens/` |
| Cómo se usan en el sitio, componentes `m-` y fuentes | `docs/sistema-diseno.md`, `components.css` |
| Tarjetas de referencia: color, tipografía, contraste, voz | `guidelines/*.card.html` |
| Componentes React finos sobre las clases `m-` | `components/` (Button, Card, Eyebrow, Chip, Chat, Bubble, Scale, AreaBar, Notice, Field, Check) |
| Pantallas del flujo: test, resultado, aviso, chat con IA | `ui_kits/web/` |
| Paquete armado (no editar a mano) | `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json` → `npm run build:ds` |

Reglas que más se olvidan:

- Magenta brillante solo en títulos grandes, botones y acentos. Texto blanco sobre `--magenta-btn`
  solo a 19 px en negrita. Para texto chico, la burbuja de la usuaria y los niveles 3 y 4 de la
  escala, `--magenta-text` (#C0128C) o `--scale-4` (#8C0C66).
- Texto en `--plum`, nunca negro. Foco visible de 3 px. Área táctil de 44 px. Mínimo 14 px.
- El test (claro) y el chat con IA (oscuro) son sesiones separadas. Áreas: Cuerpo, Ánimo, Vida íntima.
- Voz: tuteo, sin emojis, sin "triaje", sin promesas absolutas. Profesionales en genérico
  ("tu médico", "un especialista"); a la usuaria, en femenino.
- El logo es tipográfico: "Mindi" en Special Gothic. No hay archivo de logo.

## Pendientes

### Pendiente: limpieza automática a los 2 años (antes de octubre de 2028)

La política de privacidad publicada promete conservar las respuestas del test y el reporte en
PDF por 2 años (y el nombre y el correo también 2 años; los datos de uso, 1 año). Hoy nada los
borra solo:

- `sessions` y `leads`: filas con más de 2 años.
- Storage, bucket `reports`: los PDF de `download/<session_id>.pdf` (se guardan aunque la usuaria
  no deje su correo) y los de los enlaces antiguos de WhatsApp.
- `events`: filas con más de 1 año.

Hay que programar una limpieza (por ejemplo, una tarea programada en Supabase) antes de octubre
de 2028, cuando se cumplen 2 años de los primeros datos, para cumplir la política.

### Pendientes del chat con el agente de IA (bloque 5)

- **Cloud Run es público.** El agente (`mindi-agent`, us-central1) acepta llamadas de cualquiera
  que tenga su URL, sin pasar por la web, y cada una gasta crédito de OpenAI. Pasarlo a privado
  (solo una cuenta de servicio con `roles/run.invoker`) y que `api/agent.js` llame con esa
  credencial.
- **Clics de WhatsApp desde el chat del agente.** Se registran como `whatsapp_click {origen:
  "agente"}` (el botón solo aparece si el agente falla o no responde a tiempo), pero la tarjeta
  "Clics en WhatsApp" del panel todavía no los cuenta: falta un SQL que agregue
  `whatsapp_agente` a `panel_stats` (como 016).
- **El agente no usa el resultado ante preguntas generales.** Con `resultado_mrs` en la sesión,
  a "¿Qué me recomiendas hacer?" responde como si no hubiera test (en B: "no has compartido
  detalles"; con señal de alerta: "si ya hiciste el test…"), aunque su lectura trae el nivel y la
  recomendación que vio la usuaria. Revisarlo en Mindi_agents (instrucción del coordinador y un
  caso nuevo en el banco de evals).
- **Del chat al test (handoff 10.5.1).** El test y el chat con IA son sesiones separadas: `/test`
  (claro) y `/chat` (oscuro). El agente pide el botón con la herramienta `recomendar_test`
  (Mindi_agents, rama `feat/recomendar-test`, pendiente de aprobar y desplegar), que responde
  `{ mostrar_boton }`; `api/agent.js` lo devuelve como `action: 'recommend_test'` y la web dibuja
  "Haz el test de 5 min →" (abre `/test?origen=chat`). Mientras Cloud Run tenga la versión anterior
  (`ofrecer_test`), la web la acepta igual. Eventos: `chat_test_recommended`, `chat_to_test`
  (los del test llevan `origen: 'chat'`) y `test_to_chat` (desde el resultado, que pasa los
  puntajes a `/chat` por sessionStorage). Falta sumarlos al panel.
