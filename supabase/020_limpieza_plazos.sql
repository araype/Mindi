-- Mindi · Borrado automático según los plazos de la política de privacidad (sección 7).
-- Ejecutar UNA VEZ, después de 019. Antes: Database → Extensions → activar pg_cron.
-- Seguro de re-ejecutar.
--
-- Plazos (aprobados el 4 nov. 2026):
--   reports (copia del correo)            30 días
--   report_shares (copia compartida)      al vencer (30 días)
--   PDF en Storage                        30 días  → función `limpieza` (los archivos no se borran con SQL)
--   events (datos de uso)                 1 año
--   interest_signups (listas de espera)   12 meses (las de Plus, consultas, especialistas y empresas)
--   leads, event_signups (contacto)       2 años
--   sessions (respuestas del test)        2 años, salvo las autorizadas para investigación
--                                         (research_consents): esas se conservan sin contacto,
--                                         como dice la política.
-- Corre todos los días a las 03:00 de Lima (08:00 UTC).

create or replace function public.limpieza_datos()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare out jsonb := '{}'::jsonb; n int;
begin
  delete from public.reports where created_at < now() - interval '30 days';
  get diagnostics n = row_count; out := out || jsonb_build_object('reports', n);

  delete from public.report_shares where expires_at < now();
  get diagnostics n = row_count; out := out || jsonb_build_object('report_shares', n);

  delete from public.events where created_at < now() - interval '1 year';
  get diagnostics n = row_count; out := out || jsonb_build_object('events', n);

  delete from public.interest_signups
   where segment in ('plus', 'consultas', 'especialistas', 'empresas') and created_at < now() - interval '12 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('interest_signups', n);

  delete from public.leads where created_at < now() - interval '2 years';
  get diagnostics n = row_count; out := out || jsonb_build_object('leads', n);

  delete from public.event_signups where created_at < now() - interval '2 years';
  get diagnostics n = row_count; out := out || jsonb_build_object('event_signups', n);

  -- Las sesiones se borran en cascada con sus copias; las de investigación se quedan, sin contacto.
  delete from public.sessions s
   where s.created_at < now() - interval '2 years'
     and not exists (select 1 from public.research_consents r where r.session_id = s.id);
  get diagnostics n = row_count; out := out || jsonb_build_object('sessions', n);

  return out;
end;
$$;
revoke all on function public.limpieza_datos() from public, anon, authenticated;

-- Tarea diaria (si ya existe, se reemplaza).
select cron.unschedule(jobid) from cron.job where jobname = 'mindi-limpieza';
select cron.schedule('mindi-limpieza', '0 8 * * *', $$select public.limpieza_datos()$$);

-- PDF de Storage (bucket `reports`) con más de 30 días: los borra la función `limpieza`.
-- Programarla después de desplegarla (necesita pg_net y el secreto LIMPIEZA_SECRET en la función):
--   1. Database → Extensions → activar pg_net.
--   2. Guardar la URL y el secreto en Vault (SQL Editor):
--        select vault.create_secret('https://<proyecto>.supabase.co/functions/v1/limpieza', 'limpieza_url');
--        select vault.create_secret('<el mismo LIMPIEZA_SECRET>', 'limpieza_secret');
--   3. Programar:
--        select cron.schedule('mindi-limpieza-pdf', '15 8 * * *', $job$
--          select net.http_post(
--            url := (select decrypted_secret from vault.decrypted_secrets where name = 'limpieza_url'),
--            headers := jsonb_build_object('Content-Type', 'application/json',
--              'x-mindi-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'limpieza_secret')),
--            body := '{}'::jsonb)
--        $job$);
