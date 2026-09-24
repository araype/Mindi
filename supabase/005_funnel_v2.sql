-- Mindi · Actualiza la vista del embudo: reemplaza 004_funnel_satisfaction.sql —
-- ejecutar UNA VEZ (seguro de re-ejecutar, CREATE OR REPLACE VIEW).
-- Pegar en Supabase → SQL Editor → Run.
--
-- Cambios respecto a la versión anterior:
--   - "No lo creo" pasó a llamarse "No lo probaría" en la pregunta de precio.
--   - La satisfacción ahora es una escala de 1 a 5 (carita), no 3 frases de texto —
--     se agrupa por puntaje (score) en vez de por el texto exacto.
--   - Se agrega la nueva pregunta de metas ("¿Qué te gustaría lograr a partir de ahora?").

create or replace view public.funnel as
select
  count(distinct session_id) filter (where name = 'page_view')         as visitas,
  count(distinct session_id) filter (where name = 'chat_start')        as inician_chat,
  count(distinct session_id) filter (where name = 'mrs_complete')      as completan_sintomas,
  count(distinct session_id) filter (where name = 'result')            as ven_resultado,
  count(distinct session_id) filter (where name = 'goals')             as eligen_metas,
  count(distinct session_id) filter (where name = 'lead' and (props->>'captured') = 'true') as leads,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'Sí, lo probaría')  as precio_si,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'Tal vez, depende')  as precio_tal_vez,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'No lo probaría')    as precio_no,
  count(distinct session_id) filter (where name = 'satisfaction' and (props->>'score')::int >= 3) as satisfaccion_alta,
  count(distinct session_id) filter (where name = 'satisfaction' and (props->>'score')::int = 2)  as satisfaccion_neutra,
  count(distinct session_id) filter (where name = 'satisfaction' and (props->>'score')::int <= 1) as satisfaccion_baja
from public.events;
alter view public.funnel set (security_invoker = true);
revoke all on public.funnel from anon, authenticated;
