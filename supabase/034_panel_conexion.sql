-- Mindi · Panel: áreas + tarjeta "Agendar por WhatsApp" por área (21 nov. 2026) — ejecutar UNA VEZ en Supabase →
-- SQL Editor → Run, después de 033. Seguro de re-ejecutar. NO cambia ningún dato: solo lee `sessions` y `events`.
--
-- Es la misma función panel_areas de 033, con campos nuevos: cuántas ven la tarjeta de conexión al final del reporte
-- (conexion_shown) y cuántas tocan "Agendar por WhatsApp" (conexion_whatsapp), en total y según su área más afectada.
-- Los eventos no guardan el área: se toma del resultado de esa visita (tabla sessions), con la regla de 033.

create or replace function public.panel_areas(p_since timestamptz default null, p_until timestamptz default null,
                                              p_include_test boolean default false, p_origin text default null)
returns jsonb
language sql
stable
set search_path = public
as $$
  with s as (
    select id, score_somatico as so, score_psicologico as ps, score_urogenital as ur, skipped_intimate
      from public.sessions
     where (p_since is null or created_at >= p_since)
       and (p_until is null or created_at < p_until)
       and (p_include_test or not is_test)
  ),
  c as (
    select e.session_id,
      coalesce((array_agg(e.props->>'origin' order by e.created_at) filter (where e.props->>'origin' is not null))[1], 'sin_origen') as canal
      from public.events e join s on s.id = e.session_id
     where p_origin is not null
     group by e.session_id
  ),
  f as (
    select s.*,
      case when so >= 8 then so / 16.0 end as r_so,
      case when ps >= 6 then ps / 16.0 end as r_ps,
      case when ur >= 3 then ur / 12.0 end as r_ur
      from s left join c on c.session_id = s.id
     where p_origin is null
        or (p_origin = 'none' and coalesce(c.canal, 'sin_origen') = 'sin_origen')
        or c.canal = p_origin
  ),
  m as (
    select *,
      case
        when r_so is not null and r_so >= coalesce(r_ps, -1) and r_so >= coalesce(r_ur, -1) then 'cuerpo'
        when r_ps is not null and r_ps >= coalesce(r_ur, -1) then 'animo'
        when r_ur is not null then 'intima'
        else 'ninguna'
      end as principal,
      (r_so is not null)::int + (r_ps is not null)::int + (r_ur is not null)::int as n_areas
      from f
  ),
  -- Tarjeta "Agendar por WhatsApp" del reporte (21 nov. 2026): una fila por visita y evento.
  cx as (
    select distinct m.principal, e.session_id, e.name
      from public.events e join m on m.id = e.session_id
     where e.name in ('conexion_shown', 'conexion_whatsapp')
  )
  select jsonb_build_object(
    'total',             (select count(*) from m),
    'cuerpo',            (select count(*) from m where r_so is not null),
    'animo',             (select count(*) from m where r_ps is not null),
    'intima',            (select count(*) from m where r_ur is not null),
    'dos_o_mas',         (select count(*) from m where n_areas >= 2),
    'principal_cuerpo',  (select count(*) from m where principal = 'cuerpo'),
    'principal_animo',   (select count(*) from m where principal = 'animo'),
    'principal_intima',  (select count(*) from m where principal = 'intima'),
    'principal_ninguna', (select count(*) from m where principal = 'ninguna'),
    'omiten_intimas',    (select count(*) from m where skipped_intimate),
    'conexion_vista',    (select count(*) from cx where name = 'conexion_shown'),
    'conexion_whatsapp', (select count(*) from cx where name = 'conexion_whatsapp'),
    'conexion_cuerpo_vista',    (select count(*) from cx where principal = 'cuerpo' and name = 'conexion_shown'),
    'conexion_cuerpo_whatsapp', (select count(*) from cx where principal = 'cuerpo' and name = 'conexion_whatsapp'),
    'conexion_animo_vista',    (select count(*) from cx where principal = 'animo' and name = 'conexion_shown'),
    'conexion_animo_whatsapp', (select count(*) from cx where principal = 'animo' and name = 'conexion_whatsapp'),
    'conexion_intima_vista',    (select count(*) from cx where principal = 'intima' and name = 'conexion_shown'),
    'conexion_intima_whatsapp', (select count(*) from cx where principal = 'intima' and name = 'conexion_whatsapp')
  );
$$;
revoke all on function public.panel_areas(timestamptz, timestamptz, boolean, text) from public, anon, authenticated;
grant execute on function public.panel_areas(timestamptz, timestamptz, boolean, text) to service_role;

notify pgrst, 'reload schema';
