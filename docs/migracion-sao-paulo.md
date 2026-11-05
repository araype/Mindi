# Pendiente: mover Supabase a São Paulo (sa-east-1)

Decisión de la Fase 0: por ahora se queda en `us-east-1`. El handoff (11.4) pide São Paulo. Supabase no
mueve un proyecto de región: hay que crear uno nuevo y migrar.

1. Crear el proyecto nuevo en **sa-east-1**, con 2FA y los mismos miembros.
2. Correr en orden `schema.sql` y `002` a `019` (o restaurar el esquema con `pg_dump --schema-only`).
3. Migrar los datos: `pg_dump --data-only --schema=public` del proyecto actual → `psql` en el nuevo.
   Copiar los PDF del bucket `reports` (o no copiarlos, si ya se aprobó borrarlos a los 30 días).
4. Desplegar `send-report` y `funnel-stats` en el proyecto nuevo y cargar sus secretos
   (`SEND_REPORT_SECRET`, `LEADS_ENC_KEY` igual que antes, para poder leer los correos cifrados).
5. En Vercel: `SUPABASE_URL` y `SUPABASE_KEY` del proyecto nuevo, y la región de las funciones en
   São Paulo (`"regions": ["gru1"]` en `vercel.json`) para que queden cerca de la base.
6. Actualizar la política de privacidad (sección 5: ubicación de Supabase).
7. Probar el flujo completo, y recién después pausar y borrar el proyecto de us-east-1.

Hacerlo en una ventana de poco tráfico: los eventos y las sesiones que lleguen durante la copia se pierden
si no se repite el paso 3 al final.
