-- Mindi · Reportes obtenidos en la vista `funnel` — ejecutar UNA VEZ.
-- Pegar en Supabase → SQL Editor → Run, después de 006_test_mode.sql.
-- Seguro de re-ejecutar (DROP + CREATE).
--
-- Por qué: la app ya registra el evento `report_sent` cada vez que una usuaria recibe su
-- reporte (props.channel = 'email', 'link' para WhatsApp, o 'download' para el PDF sin
-- dejar contacto), pero la vista no lo contaba. Se agregan 4 columnas justo después de
-- `leads`: el total y el desglose por canal. `reportes` cuenta sesiones (una usuaria que
-- lo pide dos veces cuenta una sola vez).
--
-- DROP + CREATE (no CREATE OR REPLACE) porque las columnas nuevas van en medio de la vista.

drop view if exists public.funnel;
create view public.funnel as
select
  count(distinct session_id) filter (where name = 'page_view')         as visitas,
  count(distinct session_id) filter (where name = 'chat_start')        as inician_chat,
  count(distinct session_id) filter (where name = 'mrs_complete')      as completan_sintomas,
  count(distinct session_id) filter (where name = 'result')            as ven_resultado,
  count(distinct session_id) filter (where name = 'goals')             as eligen_metas,
  count(distinct session_id) filter (where name = 'lead' and (props->>'captured') = 'true') as leads,
  count(distinct session_id) filter (where name = 'report_sent')                                  as reportes,
  count(distinct session_id) filter (where name = 'report_sent' and props->>'channel' = 'email')    as reporte_correo,
  count(distinct session_id) filter (where name = 'report_sent' and props->>'channel' = 'link')     as reporte_whatsapp,
  count(distinct session_id) filter (where name = 'report_sent' and props->>'channel' = 'download') as reporte_descarga,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'Sí, lo probaría')  as precio_si,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'Tal vez, depende')  as precio_tal_vez,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'No lo probaría')    as precio_no,
  count(distinct session_id) filter (where name = 'satisfaction' and (props->>'score')::int >= 3) as satisfaccion_alta,
  count(distinct session_id) filter (where name = 'satisfaction' and (props->>'score')::int = 2)  as satisfaccion_neutra,
  count(distinct session_id) filter (where name = 'satisfaction' and (props->>'score')::int <= 1) as satisfaccion_baja
from public.events
where (props->>'is_test') is distinct from 'true';
alter view public.funnel set (security_invoker = true);
revoke all on public.funnel from anon, authenticated;
