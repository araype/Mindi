-- Mindi · Panel: nivel A dividido en 0-4 y 5-7 — ejecutar UNA VEZ, después de 013.
-- Pegar en Supabase → SQL Editor → Run. Seguro de re-ejecutar (CREATE OR REPLACE).
--
-- Por qué: el resultado de la usuaria ahora distingue "Sin molestias importantes" (A con
-- total 0-4) de "Síntomas leves" (A con total 5-7). El panel muestra lo mismo, calculándolo
-- con score_total, que ya está guardado. NO cambia los niveles A/B/C guardados ni ningún dato:
-- solo agrega las claves nivel_a0 y nivel_a1 a panel_stats (nivel_a se mantiene).

create or replace function public.panel_stats(p_since timestamptz default null, p_include_test boolean default false, p_origin text default null)
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
      and (p_origin is null
           or (p_origin = 'none' and props->>'origin' is null)
           or props->>'origin' = p_origin)
  ),
  -- Pasos del embudo por visita: cada paso exige haber pasado por todos los anteriores.
  fl as (
    select session_id,
      bool_or(name = 'page_view')    as v,
      bool_or(name = 'chat_start')   as c,
      bool_or(name = 'mrs_complete') as m,
      bool_or(name = 'result')       as r,
      bool_or(name = 'goals')        as g,
      bool_or(name = 'report_sent')  as rep
    from ev group by session_id
  ),
  se as (
    select s.level, s.age_range, s.score_total
    from public.sessions s
    where (p_since is null or s.created_at >= p_since)
      and (p_include_test or not s.is_test)
      and (p_origin is null or s.id in (select session_id from ev))
  )
  select jsonb_build_object(
    'embudo_visitas',     (select count(*) from fl where v),
    'embudo_chat',        (select count(*) from fl where v and c),
    'embudo_sintomas',    (select count(*) from fl where v and c and m),
    'embudo_resultado',   (select count(*) from fl where v and c and m and r),
    'embudo_metas',       (select count(*) from fl where v and c and m and r and g),
    'embudo_reporte',     (select count(*) from fl where v and c and m and r and g and rep),
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
    -- A se divide al mostrar con el total ya guardado; el nivel guardado sigue siendo A.
    'nivel_a0',           (select count(*) from se where level = 'A' and score_total <= 4),
    'nivel_a1',           (select count(*) from se where level = 'A' and score_total >= 5),
    'nivel_b',            (select count(*) from se where level = 'B'),
    'nivel_c',            (select count(*) from se where level = 'C'),
    'nivel_alerta',       (select count(*) from se where level = 'alert'),
    'edad_menor_40',      (select count(*) from se where age_range = 'Menor de 40'),
    'edad_40_45',         (select count(*) from se where age_range = '40 a 45'),
    'edad_46_52',         (select count(*) from se where age_range = '46 a 52'),
    'edad_mayor_52',      (select count(*) from se where age_range = 'Mayor de 52')
  );
$$;

revoke all on function public.panel_stats(timestamptz, boolean, text) from public, anon, authenticated;
grant execute on function public.panel_stats(timestamptz, boolean, text) to service_role;

notify pgrst, 'reload schema';
