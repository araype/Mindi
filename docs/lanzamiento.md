# Día del lanzamiento (cierra el hallazgo 2)

Se lanza **con el chat con IA encendido** si las evaluaciones del agente quedan aprobadas (paso 0b).
Si no, se lanza con el chat apagado (sin `VITE_AGENT_CHAT_ENABLED` en Production): los botones
"Pregúntale a Mindi" van a WhatsApp y `/chat` abre el test; se enciende después (paso h).

Cada paso dice cómo comprobarlo. Si una comprobación falla, para y no sigas.

## 0. Antes de empezar (el mismo día)

- [ ] SQL 018, 019, 020, 021 y 022 corridos (SQL Editor). Comprobar: `select jobname from cron.job;` muestra `mindi-limpieza`.
- [ ] Contactos antiguos cifrados (`docs/cifrado-contactos.md`); se repite después del lanzamiento.
- [ ] Vista previa probada: test completo, PDF, compartir, correo (llega y se abre), listas de espera.
- [ ] **`ALLOWED_ORIGINS` de Production incluye `https://mindi-beta.vercel.app`** (el sitio nuevo se
      publica primero ahí). Si no, todas las rutas `/api` responden 403. Valor recomendado para hoy:
      `https://mindi-beta.vercel.app,https://mindifem.com,https://www.mindifem.com`
- [ ] En Turnstile (Cloudflare → Turnstile → el sitio → Hostnames): `mindi-beta.vercel.app`, `mindifem.com`,
      `www.mindifem.com` y `mindi-rediseno.vercel.app`.
- [ ] `VITE_TEST_MODE=false` en Production.
- [ ] **Con el chat encendido:** `VITE_AGENT_CHAT_ENABLED=true` en Production (Vercel → Environment
      Variables; se lee al construir, así que entra con el despliegue del paso a). `VITE_CHAT_RESEARCH_ENABLED`
      y `CHAT_RESEARCH_ENABLED` quedan **sin definir** hasta aprobar la política del nivel 2.

## 0b. Agente: fusionar y desplegar (antes del paso a, solo con las evaluaciones aprobadas)

En Mindi_agents, fusionar `feat/recomendar-test` y `chore/seguridad-repo` en `master` y desplegar
**manteniendo el servicio privado**:

```bash
git switch master && git merge --no-ff feat/recomendar-test && git merge --no-ff chore/seguridad-repo
python -m unittest discover -s tests          # deben pasar todos
adk deploy cloud_run --project=beefocus-476502 --region=us-central1 --service_name=mindi-agent \
  --session_service_uri=memory:// --artifact_service_uri=memory:// ./mindi_agent \
  -- --set-secrets=OPENAI_API_KEY=OPENAI_API_KEY:latest --max-instances=1 --no-allow-unauthenticated
```

Comprobar:
- `gcloud run services get-iam-policy mindi-agent --region=us-central1 --project=beefocus-476502` muestra
  solo `mindi-web` (sin `allUsers`).
- Llamado directo a `https://mindi-agent-647713663993.us-central1.run.app/list-apps`: **403**.
- En la vista previa, `/chat` responde, recomienda el test cuando corresponde y `/chat?tema=peso` saluda sobre el peso.

## a) Publicar el sitio nuevo en producción

```bash
git switch rediseno-landing && git status          # sin cambios pendientes
npx vercel deploy --prod                            # el único --prod del día
npm run check:rutas -- https://mindi-beta.vercel.app
```

Comprobar a mano en `https://mindi-beta.vercel.app`: la portada, `/test` completo hasta el PDF, una lista
de espera, y "Pregúntale a Mindi" (con el chat encendido abre `/chat` y responde; apagado, WhatsApp). En el
panel (`/panel`): que carguen los números, la pestaña "Temas del chat" y una exportación en "Listas".

**Justo después**, desplegar las funciones nuevas (no antes: el sitio anterior las llamaba desde el
navegador y leía `?t=`; las nuevas no tienen CORS y mandan los enlaces con `#t=`):

```bash
npx supabase functions deploy send-report --use-api
npx supabase functions deploy funnel-stats --use-api
npx supabase functions deploy export-lists --use-api
```

Comprobar: pedir la copia del reporte por correo en el sitio publicado; el enlace del correo abre `/reporte`.

## b) Clave publicable nueva en `SUPABASE_KEY` y borrar la antigua

1. Supabase → Project Settings → **API Keys** → *Publishable keys* → **Create new publishable key**
   (nombre: `servidor-vercel`). Copiarla.
2. Vercel → Settings → Environment Variables → `SUPABASE_KEY` → editar en **Production y Preview** con la
   clave nueva. Volver a desplegar: `npx vercel deploy --prod` (y la vista previa, si se sigue usando).
3. Comprobar en el sitio publicado: un test completo se guarda (aparece en el panel) y el PDF se genera.
4. Recién entonces, en API Keys, **borrar la publicable antigua** (la *default*, la que estaba en el código
   del sitio anterior). Comprobar: con la clave antigua, `curl <SUPABASE_URL>/rest/v1/rpc/get_report_by_token`
   responde *Invalid API key*.

## c) `SEND_REPORT_SECRET` en Supabase

El valor tiene que ser **el mismo** que está en Vercel. Como en Vercel es un secreto y no se puede leer,
lo más simple es generar uno nuevo y cargarlo en los dos lados:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # copiar el valor
npx vercel env add SEND_REPORT_SECRET --environment production --sensitive --force   # pegar
npx vercel env add SEND_REPORT_SECRET --environment preview --sensitive --force      # pegar
npx supabase secrets set SEND_REPORT_SECRET=<el mismo valor>
npx vercel deploy --prod
```

Comprobar: llamar a `send-report` directo (sin la cabecera) responde **401**; en el sitio, el PDF y la
copia por correo siguen funcionando.

## d) Apagar las claves *legacy* de Supabase

Las funciones ya usan la clave secreta nueva (`SUPABASE_SECRET_KEYS`, ver `supabase/functions/_shared/clave.js`),
pero solo después de desplegarlas en el paso a.

1. Supabase → Project Settings → API Keys → pestaña **Legacy API keys**: si dice que están activas,
   **Disable JWT-based API keys**.
2. Comprobar en seguida: el PDF y el correo funcionan, y el panel carga. Si algo falla, volver a
   activarlas desde la misma pestaña y avisarme.

## e) Conectar mindifem.com

1. Hostinger → Dominios → mindifem.com → **Nameservers**: los dos de Cloudflare (Cloudflare → Add a site →
   mindifem.com → plan Free te los muestra). Puede tardar unas horas.
2. Vercel → Project → Settings → **Domains** → Add `mindifem.com` y `www.mindifem.com` (elegir que `www`
   redirija a `mindifem.com`). Vercel muestra los registros exactos; **copia los que muestre**. Suelen ser:

   | Tipo | Nombre | Valor | Proxy en Cloudflare |
   | :-- | :-- | :-- | :-- |
   | A | `@` | la IP que indique Vercel (p. ej. `76.76.21.21`) | **DNS only** (nube gris) |
   | CNAME | `www` | el que indique Vercel (p. ej. `cname.vercel-dns.com`) | **DNS only** (nube gris) |

3. Cloudflare → SSL/TLS: **Full (strict)**, *Always Use HTTPS* activado, HSTS activado.
4. Esperar a que Vercel marque los dos dominios como *Valid Configuration* (certificado emitido).
5. `SITE_URL=https://mindifem.com` en Supabase: `npx supabase secrets set SITE_URL=https://mindifem.com`.
6. Comprobar: `npm run check:rutas -- https://mindifem.com`, y que un correo nuevo traiga enlaces a mindifem.com.
7. Más adelante (cuando ya nadie use `mindi-beta.vercel.app`): sacarlo de `ALLOWED_ORIGINS` y de Turnstile.

## f) Borrar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`

Vercel → Environment Variables → borrar las dos (Production y Preview). El sitio nuevo ya no las usa; el
siguiente despliegue sale sin ellas. Comprobar: `npm run check:rutas -- https://mindifem.com`.

## g) Después

- Correo desde el dominio: Resend → Domains → `mindifem.com` (SPF, DKIM y DMARC en Cloudflare) y luego
  `RESEND_FROM` con `@mindifem.com` (paso C.9 de `docs/fase-4-seguridad.md`).
- **h) Encender el chat con IA** (solo si se lanzó apagado): `VITE_AGENT_CHAT_ENABLED=true` en
  Production y `npx vercel deploy --prod`. Comprobar `/chat` y "Pregúntale a Mindi sobre tu resultado".
- **Nivel 2 (preguntas compartidas)**, cuando apruebes la política: `VITE_CHAT_RESEARCH_ENABLED=true` y
  `CHAT_RESEARCH_ENABLED=true` en Production, y `npx vercel deploy --prod`.
