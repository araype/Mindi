-- Mindi · Datos del conversatorio para el panel (pestaña "Conversatorio") — ejecutar UNA VEZ,
-- después de 007_event_signups.sql. Pegar en Supabase → SQL Editor → Run.
-- Seguro de re-ejecutar (CREATE OR REPLACE).
--
-- Mismos filtros que panel_stats (009): desde una fecha y con o sin sesiones de prueba.
-- Mismo cálculo que la vista `eventos` (010), más la lista de inscritas para verla en el panel.
-- Solo la llama la Edge Function `funnel-stats` (service_role). Cerrada para el navegador:
-- devuelve nombres y contactos, así que nunca se abre a anon.

create or replace function public.event_stats(p_since timestamptz default null, p_include_test boolean default false)
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
  ),
  su as (
    select created_at, name, contact, is_test
    from public.event_signups
    where (p_since is null or created_at >= p_since)
      and (p_include_test or not is_test)
  )
  select jsonb_build_object(
    'clic_en_registrarse', (select count(distinct session_id) from ev where name = 'cta_click' and props->>'source' = 'eventos'),
    'completan_registro',  (select count(distinct session_id) from ev where name = 'event_waitlist_join' and props->>'captured' = 'true'),
    'inscritas',           (select count(*) from su),
    'inscritas_total',     (select count(*) from public.event_signups where p_include_test or not is_test),
    'lista',               coalesce((select jsonb_agg(jsonb_build_object('fecha', created_at, 'nombre', name, 'contacto', contact, 'prueba', is_test) order by created_at desc)
                                     from (select * from su order by created_at desc limit 500) s), '[]'::jsonb)
  );
$$;

revoke all on function public.event_stats(timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.event_stats(timestamptz, boolean) to service_role;
