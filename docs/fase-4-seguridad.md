# Fase 4 · Seguridad para publicar en mindifem.com

Qué cambió en el código y qué hay que configurar fuera de él. Sigue el orden de la sección C:
así el sitio actual no se cae mientras se hace el cambio.

## A. Qué cambió en el código

| Antes | Ahora | Handoff |
| :-- | :-- | :-- |
| El navegador insertaba en Supabase con la clave publicable | Todo pasa por `/api` (Vercel): `track`, `session`, `lead`, `report`, `waitlist`, `stats`, `agent` | 11.1 |
| El puntaje lo mandaba el navegador | El servidor valida cada campo y recalcula puntaje y nivel (`api/_lib/validar.js`) | 11.3 |
| Sin límites | Límite por IP en cada ruta (`api/_lib/limite.js`, Upstash) y Turnstile en listas, demo y correo | 11.3 |
| Correo en texto plano en `leads` | Cifrado AES-256-GCM (`api/_lib/cifrado.js`); solo `send-report` lo descifra | 11.4 |
| Correo con el reporte completo y el PDF adjunto | Resumen breve y el enlace a `/reporte`, que vence a los 30 días | 11.6 |
| Cloud Run público | `/api/agent` manda un ID token de una cuenta de servicio (`api/_lib/gcp.js`) | 11.5 |
| Sin cabeceras | CSP, HSTS, nosniff, `frame-ancestors 'none'`, Referrer-Policy y Permissions-Policy (`vercel.json`) | 11.3 |
| Google Fonts | Fuentes en el sitio (`public/fonts/`, `tokens/fonts-local.css`) | 4 |
| Eventos con nivel, señales de alerta, metas y etapa | Solo el nombre de la acción y datos de uso (también lo filtra el servidor) | 11.8 |
| Sin control de claves en los commits | Hook de pre-commit con gitleaks en los dos repos y `.gitignore` de credenciales | 11.7 |

La clave publicable de Supabase queda **solo en el servidor** (`SUPABASE_KEY`). El servidor también
está limitado por RLS: solo puede insertar (segunda capa). La service_role key nunca va a Vercel.

## B. Variables de entorno

**Vercel → Settings → Environment Variables** (solo *Production*, salvo donde se indica):

| Variable | Valor | Pública |
| :-- | :-- | :-- |
| `SUPABASE_URL` | `https://<proyecto>.supabase.co` | No |
| `SUPABASE_KEY` | Una clave publicable **nueva** (ver C.6) | No |
| `SEND_REPORT_SECRET` | Texto aleatorio largo (el mismo en Supabase) | No |
| `LEADS_ENC_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (la misma en Supabase) | No |
| `TURNSTILE_SECRET_KEY` | Secret key de Turnstile | No |
| `VITE_TURNSTILE_SITE_KEY` | Site key de Turnstile | Sí |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | De la base Redis de Upstash (plan gratuito) | No |
| `RATE_LIMIT_SALT` | Texto aleatorio | No |
| `ALLOWED_ORIGINS` | `https://mindifem.com,https://www.mindifem.com` | No |
| `AGENT_URL` | URL de Cloud Run (ya existe) | No |
| `GCP_SA_KEY` | El JSON de la cuenta de servicio `mindi-web` (ver C.7) | No |
| `VITE_CONSENT_VERSION`, `VITE_TEST_MODE`, `VITE_WHATSAPP_NUMBER`, `VITE_WHATSAPP_CHANNEL_URL`, `VITE_AGENT_CHAT_ENABLED` | Como hoy | Sí |

Después de desplegar, **borrar** `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`: el sitio ya no las usa.

**Supabase → Edge Functions → Secrets** (`npx supabase secrets set NOMBRE=valor`):
`SEND_REPORT_SECRET`, `LEADS_ENC_KEY`, `SITE_URL=https://mindifem.com`, `RESEND_FROM="Mindi <reportes@mindifem.com>"`
(más `RESEND_API_KEY` y `ADMIN_KEY`, que ya existen).

## C. Pasos, en este orden

1. **SQL** (Supabase → SQL Editor): `017_listas_espera.sql`, `018_compartir_reporte.sql`, `019_fase4_seguridad.sql`.
2. **Turnstile** (Cloudflare → Turnstile → Add site): dominio `mindifem.com`, modo *Managed*. Copiar la site key y la secret key.
3. **Upstash** (upstash.com → Redis → Create, región `us-east-1`): copiar la REST URL y el token.
4. **Funciones de Supabase**: configurar los secretos de la sección B **menos `SEND_REPORT_SECRET`**, y desplegar:
   `npx supabase functions deploy send-report` (toma el diseño nuevo del PDF y del correo, y el enlace de 30 días).
5. **Vercel**: cargar las variables de la sección B y desplegar primero en *Preview*. Probar el flujo completo
   (test, PDF, compartir, correo, lista de espera, chat). Si todo funciona, pasar a *Production*.
6. **Clave publicable nueva** (Supabase → Project Settings → API Keys): crear una publicable nueva, ponerla en
   `SUPABASE_KEY` de Vercel y volver a desplegar. Cuando el sitio funcione con la nueva, **borrar la anterior**:
   es la que quedó en el código de las versiones viejas del sitio. Recién entonces, configurar
   `SEND_REPORT_SECRET` en Supabase (a partir de ahí, solo `/api` puede llamar a `send-report`).
7. **Cloud Run privado** (Google Cloud): los comandos están en el README de Mindi_agents, sección
   "Private Cloud Run". Crear la cuenta `mindi-web`, darle `roles/run.invoker` solo sobre `mindi-agent`,
   crear su clave JSON, pegarla en `GCP_SA_KEY` (Vercel), desplegar, y **después** quitar `allUsers`.
   Borra el archivo JSON de tu computadora después de pegarlo. Más adelante se puede cambiar la clave por
   Workload Identity Federation con el OIDC de Vercel (sin claves guardadas).
8. **Dominio** (handoff 11.2):
   - Hostinger → Dominios → mindifem.com → DNS/Nameservers: poner los dos nameservers que da Cloudflare
     (Cloudflare → Add a site → plan Free).
   - Vercel → Project → Domains: agregar `mindifem.com` y `www.mindifem.com`; copiar en Cloudflare los
     registros que indique Vercel (proxy en gris, *DNS only*, para que Vercel emita el certificado).
   - Cloudflare → SSL/TLS: **Full (strict)**, *Always Use HTTPS* y HSTS. Vercel → Domains: redirigir
     `www` → `mindifem.com`.
9. **Correo del dominio** (Resend → Domains → Add `mindifem.com`): copiar en Cloudflare los registros
   SPF (TXT) y DKIM (CNAME/TXT) que muestra Resend, y agregar DMARC: TXT `_dmarc` con
   `v=DMARC1; p=quarantine; rua=mailto:mindifem@gmail.com`. Después, `RESEND_FROM` con `@mindifem.com`.
10. **Cuentas**: 2FA en GitHub, Vercel, Supabase, Cloudflare, Hostinger, Google Cloud, Upstash, Resend y el
    correo de Mindi. Cada persona del equipo, solo con los permisos que necesita.

## D. GitHub: Secret Scanning y Push Protection (gratis en repos públicos)

En **Mindi** y en **Mindi_agents**: Settings → *Advanced Security* (o *Code security*) →
- **Secret Protection / Secret scanning**: *Enable*.
- **Push protection**: *Enable*. Bloquea el `git push` que traiga una clave conocida.
- (Opcional) Settings → *Code security* → *Dependabot alerts*: *Enable*.

Además, en cada copia de cada repo, una vez: `git config core.hooksPath .githooks` (en Mindi lo hace
`npm install`). El hook necesita gitleaks: `winget install gitleaks` (Windows) o `brew install gitleaks` (Mac).

## E. Propuesta de plazos de borrado (por aprobar)

Hoy la política dice que el PDF se conserva 2 años. Propuesta:

| Qué | Dónde | Propuesta |
| :-- | :-- | :-- |
| Copia del reporte del correo | tabla `reports` | Borrar a los 30 días (el enlace ya venció). El correo queda cifrado hasta entonces. |
| Copia compartida con el médico | tabla `report_shares` | Borrar al vencer (30 días) |
| PDF de descarga y de enlaces antiguos | Storage `reports/` | Borrar a los 30 días: se puede volver a generar desde la sesión mientras exista |
| Respuestas del test y correo | `sessions`, `leads` | Como dice la política: 2 años (pendiente desde el README) |
| Listas de espera | `interest_signups` | 12 meses (ya en la política) |
| Eventos | `events` | 1 año (ya en la política) |

Si se aprueba: una tarea diaria con `pg_cron` para las tablas, una función programada para Storage
(los archivos no se pueden borrar con SQL) y el cambio en la sección 7 de la política de privacidad.

## F. Antes de lanzar (handoff 11.10)

- [x] La clave publicable no puede leer `sessions`, `leads`, `events`, `reports`, `interest_signups`,
      `research_consents` ni `event_signups` (401 *permission denied*), ni listar el bucket `reports`
      (probado el 4 nov. 2026). Repetir con `report_shares` después de correr 018.
- [ ] Cloud Run responde 403 si se llama sin token: `curl -s -o /dev/null -w "%{http_code}" -X POST <AGENT_URL>/run`.
- [ ] Cabeceras: securityheaders.com con `https://mindifem.com` (esperado: A o A+).
- [ ] `send-report` responde 401 sin `x-mindi-secret` (después del paso C.6).
- [ ] Pedir a Claude Code una revisión de seguridad del repo completo antes del lanzamiento.
