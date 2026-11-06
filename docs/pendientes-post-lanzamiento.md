# Pendientes para después del lanzamiento

## Imágenes de la landing en alta calidad (en pausa)

Decisión del 4 de noviembre de 2026: se mantienen las versiones WebP actuales de `public/img/`
(portada 800 y 1440 px, datos 760 y 1262 px, marco del celular) y no se cambia cómo se cargan
hasta después del lanzamiento.

**Qué se hará al retomarlo**

1. Recibir los originales en alta resolución y con licencia (handoff, sección 9):
   - la portada sin oscurecer (el oscurecimiento lo hace solo el CSS: velo `--overlay` al 34 %
     más el degradado ciruela);
   - la foto de la sección de datos.
2. Generar versiones de 800, 1440 y 2880 px de ancho en AVIF con respaldo WebP, calidad 80–85,
   sin agrandar la imagen si el original es más chico. Está bien que la portada pese entre 200
   y 350 KB.
3. Cargarlas con `<picture>` (fuente AVIF y luego `<img>` WebP) con `srcset` y `sizes`, y
   `object-fit: cover`. La portada lleva `fetchpriority="high"` y el resto `loading="lazy"`.
4. Revisar el contraste del texto de la portada con la foto sin oscurecer.

**Qué ya se sabe (prueba del 4 de noviembre con las fotos actuales)**

- Las fotos actuales miden 1440 px (portada) y 1262 px (datos), así que con ellas no salen
  versiones de 2880 px.
- Con calidad 80, el AVIF pesó más que el WebP (portada 1440: 41 KB frente a 31 KB). Con los
  originales hay que comparar pesos y calidad antes de decidir la calidad final.
- Al pasar la portada a `<picture>` hay que quitar el `<link rel="preload">` de `index.html`:
  precarga el WebP y el navegador descargaría las dos versiones.
- `.l-hero-bg img` y `.l-photo img` ya usan `object-fit: cover`. Si se envuelven en `<picture>`,
  agregar `.l-hero-bg picture, .l-photo picture { display: contents }` para no alterar el
  tamaño.

## Rotar la clave de la cuenta `mindi-web` (cada 90 días)

La clave JSON de `mindi-web@beefocus-476502.iam.gserviceaccount.com` (variable `GCP_SA_KEY` en Vercel)
se creó el **5 de noviembre de 2026**. **Próxima rotación: 3 de febrero de 2027**, y luego cada 90 días
(4 de mayo de 2027, 2 de agosto de 2027, …).

1. Crear una clave nueva y cargarla en Vercel (Preview y Production), sin mostrarla:
   `gcloud iam service-accounts keys create <ruta-fuera-del-repo>.json --iam-account=mindi-web@beefocus-476502.iam.gserviceaccount.com`
   `npx vercel env add GCP_SA_KEY --environment production --sensitive --force < <archivo>` (y lo mismo con `preview`)
2. Volver a desplegar y probar que el chat responda.
3. Borrar el archivo local y la clave anterior:
   `gcloud iam service-accounts keys list --iam-account=mindi-web@…` → `gcloud iam service-accounts keys delete <ID-anterior> --iam-account=mindi-web@…`

Después del lanzamiento: cambiar la clave por Workload Identity Federation con el OIDC de Vercel (sin
claves guardadas) y quitar este recordatorio.

## Chat: arranque en frío del agente (5 nov. 2026)

- Hoy: timeout de 55 s, aviso de espera en el primer mensaje y `warm` (GET `app-info`) al abrir `/chat`.
- **Evaluar `--min-instances=1`** en `mindi-agent` cuando el chat tenga uso constante (≈ USD 10–15/mes):
  elimina la espera del primer mensaje. Revisar en Cloud Run cuántas veces se apaga y cuánto tarda.
- Mejoras del agente (evals 5 nov.): **J1 (prioridad alta)**: mencionar el resultado del test ante
  "¿por qué me siento así?"; E2: preguntar por cuál síntoma empezar cuando trae dos.

## "Por qué puede pasarte": oculto hasta la validación médica (5 nov. 2026)

Los 11 textos de `supabase/functions/_shared/notas.js` no tienen fuente de la guía y quedan ocultos en el chat,
el correo y el PDF (cierre-v2, ver `docs/experimento.md`). Para volver a mostrar uno: que lo valide un especialista,
agregarle `source: 'Fuente: Guía HNHU (…), sección …'` y desplegar el sitio y `send-report`.

## Versión genérica de las preguntas del chat: pendiente de opinión legal (5 nov. 2026)

Idea: que el agente reescriba cada pregunta sin datos personales ("¿Cómo dormir mejor con bochornos?") y guardar esa
versión de todas las conversaciones. **No implementar** hasta consultar con un abogado de protección de datos (Ley 29733):
deriva de información de salud. Si se aprueba, agregar una línea en la política antes de activarla.

## Etiquetas por pregunta del chat (nivel 1): después del lanzamiento (aprobado el 5 nov. 2026)

Sin texto y sin consentimiento extra. Requiere SQL `024` (tres columnas en `chat_topics`; el 023 fue el panel v2), cambiar el agente
(`clasificar_tema` en `mindi_agent/agent.py`), una evaluación corta antes de desplegarlo y la línea de la política.

| Etiqueta | Valores | Quién la pone |
|---|---|---|
| `necesidad` | `entender`, `que_hacer`, `es_normal`, `ir_al_medico`, `emocional`, `otro` | el agente |
| `respuesta` | `orienta` (respondió), `deriva` (recomendó consultar o a un profesional), `alarma` (el mensaje fijo de señales de alarma) | el agente |
| `origen` | `sugerencia`, `escrita` | la web (sabe qué botón tocó) |

Instrucción propuesta para el agente:

> "En cada mensaje de la usuaria llama una vez a clasificar_tema con: el tema; la necesidad (entender = quiere saber
> por qué pasa algo; que_hacer = busca qué hacer o cómo aliviarlo; es_normal = pregunta si lo que le pasa es normal;
> ir_al_medico = pregunta si debe consultar o a quién; emocional = expresa cómo se siente más que preguntar; otro); y
> la respuesta que darás (orienta, deriva si recomiendas consultar a un profesional, alarma si das el mensaje fijo de
> señales de alarma). Llámala antes de escribir y no la menciones."

Línea de la política (nivel 1): "…el tema de cada pregunta, el tipo de necesidad (por ejemplo, entender algo o saber
si es normal), si Mindi te orientó o te recomendó consultar, si usaste una sugerencia, el área que respondió, el nivel
de tu test y la fecha. No guardamos el texto de tus preguntas ni nada que te identifique."
