-- Mindi · Agrega la pregunta de satisfacción a la vista del embudo — ejecutar UNA VEZ.
-- Pegar en Supabase → SQL Editor → Run, después de schema.sql, 002_reports.sql y 003_storage.sql.
-- Seguro de re-ejecutar (CREATE OR REPLACE VIEW), no toca datos ni otras tablas.

create or replace view public.funnel as
select
  count(distinct session_id) filter (where name = 'page_view')         as visitas,
  count(distinct session_id) filter (where name = 'chat_start')        as inician_chat,
  count(distinct session_id) filter (where name = 'mrs_complete')      as completan_sintomas,
  count(distinct session_id) filter (where name = 'result')            as ven_resultado,
  count(distinct session_id) filter (where name = 'lead' and (props->>'captured') = 'true') as leads,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'Sí, lo probaría')     as precio_si,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'Tal vez, depende')     as precio_tal_vez,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'No lo creo')           as precio_no,
  count(distinct session_id) filter (where name = 'satisfaction' and props->>'answer' = 'Me sentí escuchada')      as satisfaccion_escuchada,
  count(distinct session_id) filter (where name = 'satisfaction' and props->>'answer' = 'Bien, sin más')            as satisfaccion_neutra,
  count(distinct session_id) filter (where name = 'satisfaction' and props->>'answer' = 'No tan cómoda')            as satisfaccion_incomoda
from public.events;
alter view public.funnel set (security_invoker = true);
revoke all on public.funnel from anon, authenticated;
