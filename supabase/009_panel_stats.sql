-- Mindi · Datos del panel con filtros — ejecutar UNA VEZ, después de 008_funnel_reportes.sql.
-- Pegar en Supabase → SQL Editor → Run. Seguro de re-ejecutar (CREATE OR REPLACE).
--
-- Por qué: la vista `funnel` no acepta filtros. El panel (/panel.html) necesita el mismo
-- embudo por periodo (desde una fecha) y con o sin sesiones de prueba, más dos desgloses
-- que salen de `sessions`: nivel de resultado y rango de edad. Mismos criterios que la
-- vista `funnel` (sesiones distintas por evento) — la vista sigue igual para el SQL Editor.
--
-- Solo la llama la Edge Function `funnel-stats` (service_role). Cerrada para el navegador.

create or replace function public.panel_stats(p_since timestamptz default null, p_include_test boolean default false)
returns jsonb
language sql
stable
set search_path = public
as $$
  with ev as (
    select session_id, name, props
    from public.events
    where (p_since is null or created_at >= p_since)
      and (p_include_test or (props->>'is_test') is distinct from 'true')
  ),
  se as (
    select level, age_range
    from public.sessions
    where (p_since is null or created_at >= p_since)
      and (p_include_test or not is_test)
  )
  select jsonb_build_object(
    'visitas',            (select count(distinct session_id) from ev where name = 'page_view'),
    'inician_chat',       (select count(distinct session_id) from ev where name = 'chat_start'),
    'completan_sintomas', (select count(distinct session_id) from ev where name = 'mrs_complete'),
    'ven_resultado',      (select count(distinct session_id) from ev where name = 'result'),
    'eligen_metas',       (select count(distinct session_id) from ev where name = 'goals'),
    'leads',              (select count(distinct session_id) from ev where name = 'lead' and props->>'captured' = 'true'),
    'reportes',           (select count(distinct session_id) from ev where name = 'report_sent'),
    'reporte_correo',     (select count(distinct session_id) from ev where name = 'report_sent' and props->>'channel' = 'email'),
    'reporte_whatsapp',   (select count(distinct session_id) from ev where name = 'report_sent' and props->>'channel' = 'link'),
    'reporte_descarga',   (select count(distinct session_id) from ev where name = 'report_sent' and props->>'channel' = 'download'),
    'precio_si',          (select count(distinct session_id) from ev where name = 'price_validation' and props->>'answer' = 'Sí, lo probaría'),
    'precio_tal_vez',     (select count(distinct session_id) from ev where name = 'price_validation' and props->>'answer' = 'Tal vez, depende'),
    'precio_no',          (select count(distinct session_id) from ev where name = 'price_validation' and props->>'answer' = 'No lo probaría'),
    'satisfaccion_alta',  (select count(distinct session_id) from ev where name = 'satisfaction' and (props->>'score')::int >= 3),
    'satisfaccion_neutra',(select count(distinct session_id) from ev where name = 'satisfaction' and (props->>'score')::int = 2),
    'satisfaccion_baja',  (select count(distinct session_id) from ev where name = 'satisfaction' and (props->>'score')::int <= 1),
    'nivel_a',            (select count(*) from se where level = 'A'),
    'nivel_b',            (select count(*) from se where level = 'B'),
    'nivel_c',            (select count(*) from se where level = 'C'),
    'nivel_alerta',       (select count(*) from se where level = 'alert'),
    'edad_menor_40',      (select count(*) from se where age_range = 'Menor de 40'),
    'edad_40_45',         (select count(*) from se where age_range = '40 a 45'),
    'edad_46_52',         (select count(*) from se where age_range = '46 a 52'),
    'edad_mayor_52',      (select count(*) from se where age_range = 'Mayor de 52')
  );
$$;

revoke all on function public.panel_stats(timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.panel_stats(timestamptz, boolean) to service_role;

-- Acelera los filtros por fecha cuando haya muchos eventos.
create index if not exists events_created_at_idx on public.events(created_at);
