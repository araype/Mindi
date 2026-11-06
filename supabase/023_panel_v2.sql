-- Mindi · Panel v2 (aprobado el 6 nov. 2026) — ejecutar UNA VEZ, después de 022.
-- Pegar en Supabase → SQL Editor → Run. Seguro de re-ejecutar (CREATE OR REPLACE). NO cambia ningún dato.
--
-- 1. panel_stats: lo que hoy pasa en el sitio.
--    - "Ven su reporte" = report_shown (antes report_sent, que con el PDF precargado contaba a todas).
--    - "Descargan el PDF" = report_download (toques reales). Correo = report_sent con channel 'email'.
--    - Chat con IA: abren, aceptan la tarjeta, preguntan, comparten, llegan desde el resultado, errores.
--    - Permiso de investigación tras el resultado (research_consent), satisfacción omitida.
--    - WhatsApp: un solo total (hoy solo aparece si el chat falla).
-- 2. chat_questions_list: las preguntas que las usuarias aceptaron compartir (nivel 2), por tema, para
--    verlas al tocar un tema en el panel. Sin sesión ni resultado: solo fecha, tema y el texto ya filtrado.

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
      bool_or(name = 'report_shown') as rep
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
    'version',            2,
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
    'ven_reporte',        (select count(distinct session_id) from ev where name = 'report_shown'),
    'reportes',           (select count(distinct session_id) from ev where name = 'report_shown'),
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
    'whatsapp_total',     (select count(*) from ev where name = 'whatsapp_click'),
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
revoke all on function public.panel_stats(timestamptz, boolean, text) from public, anon, authenticated;
grant execute on function public.panel_stats(timestamptz, boolean, text) to service_role;

-- Preguntas compartidas (nivel 2) para la pestaña "Temas del chat". Solo la clave de servidor.
create or replace function public.chat_questions_list(p_since timestamptz default null, p_include_test boolean default false, p_limit int default 300)
returns table(fecha date, tema text, pregunta text)
language sql
security definer
set search_path = public
stable
as $$
  select q.fecha, coalesce(q.tema, 'otro') as tema, q.pregunta
    from public.chat_questions_research q
   where (p_since is null or q.fecha >= p_since::date)
     and (p_include_test or not q.is_test)
   order by q.fecha desc, q.id desc
   limit least(greatest(coalesce(p_limit, 300), 1), 1000);
$$;
revoke all on function public.chat_questions_list(timestamptz, boolean, int) from public, anon, authenticated;
grant execute on function public.chat_questions_list(timestamptz, boolean, int) to service_role;

notify pgrst, 'reload schema';
