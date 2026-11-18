-- Mindi · Panel: embudo por canal (18 nov. 2026) — ejecutar UNA VEZ en Supabase → SQL Editor → Run.
-- Seguro de re-ejecutar. NO cambia ningún dato: solo lee `events`.
--
-- Una fila por canal (`origin` de los eventos: lo que va en ?src= o se detecta solo). Cada `src` nuevo
-- (wa_terapia, fb_grupo, ig_pauta…) aparece solo en la tabla "Por canal" del panel, sin tocar código.
-- Por sesión (una sesión = una visita en una pestaña):
--   usan = ven su reporte y lo descargan, piden copia por correo, lo comparten o piden una cita.
--   nsm  = completan el test y lo usan o piden una cita (la North Star).

create or replace function public.panel_canales(p_since timestamptz default null, p_until timestamptz default null,
                                                p_include_test boolean default false)
returns jsonb
language sql
stable
set search_path = public
as $$
  with ev as (
    select session_id, name, props, created_at
      from public.events
     where (p_since is null or created_at >= p_since)
       and (p_until is null or created_at < p_until)
       and (p_include_test or (props->>'is_test') is distinct from 'true')
  ),
  s as (
    select session_id,
      coalesce((array_agg(props->>'origin' order by created_at) filter (where props->>'origin' is not null))[1], 'sin_origen') as canal,
      bool_or(name = 'page_view')    as visita,
      bool_or(name = 'chat_start')   as inicia,
      bool_or(name = 'mrs_complete') as completa,
      bool_or(name in ('report_shown', 'report_sent')) as reporte,
      bool_or(name in ('report_download', 'report_share', 'cita_whatsapp', 'cita_reserva')
              or (name = 'report_sent' and props->>'channel' = 'email')
              or (name = 'waitlist_join' and props->>'list' = 'consultas' and props->>'captured' = 'true')) as accion
    from ev
    group by session_id
  ),
  c as (
    select canal,
      count(*) filter (where visita)              as visitas,
      count(*) filter (where inicia)              as inician,
      count(*) filter (where completa)            as completan,
      count(*) filter (where reporte)             as ven_reporte,
      count(*) filter (where reporte and accion)  as usan,
      count(*) filter (where completa and accion) as nsm
    from s group by canal
  )
  select coalesce(jsonb_agg(to_jsonb(c) order by c.visitas desc, c.inician desc, c.canal), '[]'::jsonb)
    from c where visitas > 0 or inician > 0;
$$;
revoke all on function public.panel_canales(timestamptz, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.panel_canales(timestamptz, timestamptz, boolean) to service_role;

notify pgrst, 'reload schema';
