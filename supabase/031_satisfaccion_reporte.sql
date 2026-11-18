-- Mindi · Panel: satisfacción en el reporte (18 nov. 2026) — ejecutar UNA VEZ en Supabase → SQL Editor → Run.
-- Seguro de re-ejecutar. NO cambia ningún dato: solo lee `events`.
--
-- Desde el 16 nov. 2026, "¿Te sirvió este resultado?" se pregunta dentro del reporte y se guarda como
-- `report_satisfaction` (antes: `satisfaction`, antes del reporte). Son preguntas en lugares distintos, así que
-- el panel las muestra en dos tarjetas, sin mezclarlas. Misma escala (0 a 4): alta ≥ 3, neutra = 2, baja ≤ 1.

create or replace function public.panel_satisfaccion_reporte(p_since timestamptz default null, p_until timestamptz default null,
                                                             p_include_test boolean default false, p_origin text default null)
returns jsonb
language sql
stable
set search_path = public
as $$
  with r as (
    select session_id, max((props->>'score')::int) as score
      from public.events
     where name = 'report_satisfaction'
       and props->>'score' ~ '^[0-9]+$'
       and (p_since is null or created_at >= p_since)
       and (p_until is null or created_at < p_until)
       and (p_include_test or (props->>'is_test') is distinct from 'true')
       and (p_origin is null
            or (p_origin = 'none' and props->>'origin' is null)
            or props->>'origin' = p_origin)
     group by session_id
  )
  select jsonb_build_object(
    'alta',   (select count(*) from r where score >= 3),
    'neutra', (select count(*) from r where score = 2),
    'baja',   (select count(*) from r where score <= 1)
  );
$$;
revoke all on function public.panel_satisfaccion_reporte(timestamptz, timestamptz, boolean, text) from public, anon, authenticated;
grant execute on function public.panel_satisfaccion_reporte(timestamptz, timestamptz, boolean, text) to service_role;

notify pgrst, 'reload schema';
