-- Mindi · Bucket de Storage para el PDF que se envía por WhatsApp — ejecutar UNA VEZ.
-- Pegar en Supabase → SQL Editor → Run, después de schema.sql y 002_reports.sql.
--
-- El bucket es privado: nadie puede listarlo ni leerlo con la clave pública. La única
-- forma de acceder a un PDF es con el enlace firmado (URL temporal, válida 30 días) que
-- genera la Edge Function `send-report` con la service_role key — el mismo modelo de
-- seguridad que ya usamos con el token de la tabla `reports`.

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;
