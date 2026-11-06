-- Mindi · Panel por experimento (aprobado el 6 nov. 2026) — ejecutar UNA VEZ, después de 024.
-- Pegar en Supabase → SQL Editor → Run. Seguro de re-ejecutar. NO cambia ningún dato.
--
-- 1. "Ven su reporte" = report_shown O report_sent: report_shown existe desde el 22 oct. 2026, así el
--    Experimento 1 recupera sus reportes; en los datos nuevos da el mismo número.
-- 2. p_until (fin del periodo), para comparar "Experimento 1" y "Experimento 2 · Lanzamiento".
-- 3. Vuelven las cifras que solo existían en el Experimento 1: envío por WhatsApp, clics por origen y precio.
-- (Corregido el 6 nov.: el objeto va en dos partes unidas con ||, porque Postgres admite hasta 100 argumentos.)

-- La versión de 3 argumentos se reemplaza por la de 4 (con p_until): si quedaran las dos, la API no sabría cuál usar.
drop function if exists public.panel_stats(timestamptz, boolean, text);

create or replace function public.panel_stats(p_since timestamptz default null, p_include_test boolean default false, p_origin text default null, p_until timestamptz default null)
returns jsonb
language sql
stable
set search_path = public
as $$
  with ev as (
    select session_id, name, props
    from public.events
    where (p_since is null or created_at >= p_since)
      and (p_until is null or created_at < p_until)
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
      bool_or(name in ('report_shown', 'report_sent')) as rep
    from ev group by session_id
  ),
  se as (
    select s.level, s.age_range, s.score_total
    from public.sessions s
    where (p_since is null or s.created_at >= p_since)
      and (p_until is null or s.created_at < p_until)
      and (p_include_test or not s.is_test)
      and (p_origin is null or s.id in (select session_id from ev))
  )
  select jsonb_build_object(
    'version',            3,
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
    -- report_shown existe desde el 22 oct. 2026; antes, el reporte se contaba con report_sent.
    'ven_reporte',        (select count(distinct session_id) from ev where name in ('report_shown', 'report_sent')),
    'reportes',           (select count(distinct session_id) from ev where name in ('report_shown', 'report_sent')),
    'descargan_pdf',      (select count(distinct session_id) from ev where name = 'report_download'),
    'pdf_compartido',     (select count(distinct session_id) from ev where name = 'report_download' and props->>'method' = 'share'),
    'reporte_correo',     (select count(distinct session_id) from ev where name = 'report_sent' and props->>'channel' = 'email'),
    'enlace_medico',      (select count(distinct session_id) from ev where name = 'report_share' and props->>'method' in ('link', 'copy', 'manual')),
    'leads',              (select count(distinct session_id) from ev where name = 'lead' and props->>'captured' = 'true'),
    'investigacion_si',   (select count(distinct session_id) from ev where name = 'research_consent' and props->>'captured' = 'true'),
    'investigacion_no',   (select count(distinct session_id) from ev where name = 'research_consent' and props->>'captured' = 'false'),
    -- Chat con IA (páginas /chat: cada apertura es su propia sesión de eventos)
    'chat_abren',         (select count(distinct session_id) from ev where name = 'agent_open'),
    'chat_aceptan',       (select count(distinct session_id) from ev where name = 'agent_consent'),
    'chat_preguntan',     (select count(distinct session_id) from ev where name = 'agent_message'),
    'chat_mensajes',      (select count(*) from ev where name = 'agent_message'),
    'chat_comparten',     (select count(distinct session_id) from ev where name = 'chat_share' and props->>'captured' = 'true'),
    'chat_desde_resultado', (select count(*) from ev where name = 'test_to_chat' and props->>'source' = 'resultado'),
    'chat_errores',       (select count(*) from ev where name = 'agent_error'),
    'whatsapp_total',     (select count(*) from ev where name = 'whatsapp_click')
  ) || jsonb_build_object(  -- en dos partes: jsonb_build_object admite hasta 100 argumentos
    -- Solo para el Experimento 1 (envío por WhatsApp, clics por origen y pregunta de precio).
    'reporte_whatsapp',   (select count(distinct session_id) from ev where name = 'report_sent' and props->>'channel' = 'link'),
    'reporte_descarga',   (select count(distinct session_id) from ev where name = 'report_sent' and props->>'channel' = 'download'),
    'whatsapp_landing',   (select count(*) from ev where name = 'whatsapp_click' and props->>'origen' = 'landing'),
    'whatsapp_resultado', (select count(*) from ev where name = 'whatsapp_click' and props->>'origen' = 'resultado'),
    'whatsapp_filtro',    (select count(*) from ev where name = 'whatsapp_click' and props->>'origen' = 'filtro'),
    'precio_si',          (select count(distinct session_id) from ev where name = 'price_validation' and props->>'answer' = 'Sí, lo probaría'),
    'precio_tal_vez',     (select count(distinct session_id) from ev where name = 'price_validation' and props->>'answer' = 'Tal vez, depende'),
    'precio_no',          (select count(distinct session_id) from ev where name = 'price_validation' and props->>'answer' = 'No lo probaría'),
    'satisfaccion_alta',  (select count(distinct session_id) from ev where name = 'satisfaction' and (props->>'score')::int >= 3),
    'satisfaccion_neutra',(select count(distinct session_id) from ev where name = 'satisfaction' and (props->>'score')::int = 2),
    'satisfaccion_baja',  (select count(distinct session_id) from ev where name = 'satisfaction' and (props->>'score')::int <= 1),
    'satisfaccion_omitida', (select count(distinct session_id) from ev where name = 'satisfaction_skip'),
    'nivel_a',            (select count(*) from se where level = 'A'),
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
revoke all on function public.panel_stats(timestamptz, boolean, text, timestamptz) from public, anon, authenticated;
grant execute on function public.panel_stats(timestamptz, boolean, text, timestamptz) to service_role;

notify pgrst, 'reload schema';
