-- Mindi · Panel: conversaciones del chat con IA (aprobado el 6 nov. 2026) — ejecutar UNA VEZ, después de 023.
-- Pegar en Supabase → SQL Editor → Run. Seguro de re-ejecutar (CREATE OR REPLACE). NO cambia ningún dato.
--
-- Cada apertura de /chat es su propia sesión de eventos (= una conversación). Conversación EXITOSA:
--   1. acepta la tarjeta y hace al menos 2 preguntas;
--   2. ninguna respuesta con error;
--   3. no llega al límite de mensajes;
--   4. termina con una señal de valor: marca "Sí, me sirvió", o toca "Haz el test" cuando Mindi lo recomienda,
--      o llegó desde su resultado y siguió preguntando (≥ 2 preguntas).
-- (Las señales de alarma con su mensaje fijo se sumarán con la etiqueta `respuesta`, después del lanzamiento.)
-- Solo cuentas: sin texto ni nada que identifique a la usuaria.

create or replace function public.chat_conversation_stats(p_since timestamptz default null, p_include_test boolean default false, p_origin text default null)
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
  cv as (
    select session_id,
      bool_or(name = 'agent_open')    as abre,
      bool_or(name = 'agent_open' and props->>'source' = 'resultado') as desde_resultado,
      bool_or(name = 'agent_consent') as acepta,
      count(*) filter (where name = 'agent_message') as preguntas,
      bool_or(name = 'agent_error')   as error,
      bool_or(name = 'agent_limit')   as limite,
      bool_or(name = 'agent_feedback' and props->>'answer' = 'si') as sirvio,
      bool_or(name = 'chat_to_test')  as al_test,
      bool_or(name = 'chat_test_recommended') as recomendado
    from ev group by session_id
  ),
  c as (select * from cv where abre),
  ok as (
    select *, (acepta and preguntas >= 2 and not error and not limite and (sirvio or al_test or desde_resultado)) as exitosa from c
  ),
  lat as (select (props->>'ms')::numeric as ms from ev where name = 'agent_latency' and props->>'ms' ~ '^[0-9]+$')
  select jsonb_build_object(
    'conv_abren',        (select count(*) from ok),
    'conv_aceptan',      (select count(*) from ok where acepta),
    'conv_dos_preguntas',(select count(*) from ok where acepta and preguntas >= 2),
    'conv_exitosas',     (select count(*) from ok where exitosa),
    'conv_mediana_preguntas', (select percentile_cont(0.5) within group (order by preguntas) from ok where preguntas > 0),
    'conv_con_error',    (select count(*) from ok where error),
    'conv_limite',       (select count(*) from ok where limite),
    'fb_si',             (select count(distinct session_id) from ev where name = 'agent_feedback' and props->>'answer' = 'si'),
    'fb_no',             (select count(distinct session_id) from ev where name = 'agent_feedback' and props->>'answer' = 'no'),
    'test_recomendado',  (select count(*) from ok where recomendado),
    'test_desde_chat',   (select count(*) from ok where al_test),
    'test_completo_desde_chat', (select count(distinct session_id) from ev where name = 'mrs_complete' and props->>'origen' = 'chat'),
    'latencia_mediana_ms', (select round(percentile_cont(0.5) within group (order by ms)) from lat),
    'latencia_p90_ms',     (select round(percentile_cont(0.9) within group (order by ms)) from lat)
  );
$$;
revoke all on function public.chat_conversation_stats(timestamptz, boolean, text) from public, anon, authenticated;
grant execute on function public.chat_conversation_stats(timestamptz, boolean, text) to service_role;

notify pgrst, 'reload schema';
