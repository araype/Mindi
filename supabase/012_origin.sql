-- Mindi · Origen de la visita (TikTok, etc.) — ejecutar UNA VEZ, después de 009 y 011.
-- Pegar en Supabase → SQL Editor → Run. Seguro de re-ejecutar.
-- IMPORTANTE: correr ANTES de desplegar la versión del sitio que guarda el origen.
--
-- Por qué: separar a quienes llegan por TikTok (link con ?utm_source=tiktok) de la data
-- anterior. La app guarda el origen en props->>'origin' de cada evento; lo ya registrado no
-- lo tiene y aparece como "Sin origen". No se modifica ni se borra ningún dato existente.
--
--   1. event_signups gana la columna `origin` (vacía en las filas que ya existen).
--   2. panel_stats y event_stats aceptan p_origin:
--        null    → todos los orígenes (igual que antes)
--        'none'  → solo visitas sin origen (tu círculo / lo registrado hasta ahora)
--        'tiktok'→ solo ese origen (sirve cualquier valor de utm_source)
--      Nivel y edad (tabla sessions) se filtran por el origen de los eventos de esa sesión.

alter table public.event_signups add column if not exists origin text check (char_length(origin) <= 30);

-- La firma cambia (nuevo parámetro): se reemplazan las versiones anteriores.
drop function if exists public.panel_stats(timestamptz, boolean);
drop function if exists public.event_stats(timestamptz, boolean);

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
  se as (
    select s.level, s.age_range
    from public.sessions s
    where (p_since is null or s.created_at >= p_since)
      and (p_include_test or not s.is_test)
      and (p_origin is null or s.id in (select session_id from ev))
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

create or replace function public.event_stats(p_since timestamptz default null, p_include_test boolean default false, p_origin text default null)
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
      and name in ('cta_click', 'event_waitlist_join')
      and (p_origin is null
           or (p_origin = 'none' and props->>'origin' is null)
           or props->>'origin' = p_origin)
  ),
  su as (
    select created_at, name, contact, is_test, origin
    from public.event_signups
    where (p_since is null or created_at >= p_since)
      and (p_include_test or not is_test)
      and (p_origin is null
           or (p_origin = 'none' and origin is null)
           or origin = p_origin)
  )
  select jsonb_build_object(
    'clic_en_registrarse', (select count(distinct session_id) from ev where name = 'cta_click' and props->>'source' = 'eventos'),
    'completan_registro',  (select count(distinct session_id) from ev where name = 'event_waitlist_join' and props->>'captured' = 'true'),
    'inscritas',           (select count(*) from su),
    'inscritas_total',     (select count(*) from public.event_signups where p_include_test or not is_test),
    'lista',               coalesce((select jsonb_agg(jsonb_build_object('fecha', created_at, 'nombre', name, 'contacto', contact, 'prueba', is_test, 'origen', origin) order by created_at desc)
                                     from (select * from su order by created_at desc limit 500) s), '[]'::jsonb)
  );
$$;

revoke all on function public.panel_stats(timestamptz, boolean, text) from public, anon, authenticated;
grant execute on function public.panel_stats(timestamptz, boolean, text) to service_role;
revoke all on function public.event_stats(timestamptz, boolean, text) from public, anon, authenticated;
grant execute on function public.event_stats(timestamptz, boolean, text) to service_role;

-- Que la API reconozca las funciones nuevas de inmediato.
notify pgrst, 'reload schema';
