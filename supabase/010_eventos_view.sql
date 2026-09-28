-- Mindi · Vista `eventos`: registros a la lista de espera del conversatorio — ejecutar UNA VEZ.
-- Pegar en Supabase → SQL Editor → Run, después de 007_event_signups.sql.
-- Seguro de re-ejecutar (DROP + CREATE).
--
-- Separada de `funnel` a propósito: el conversatorio es otro objetivo, no un paso del chat.
-- Se consulta con:  select * from eventos;
--
--   clic_en_registrarse   sesiones que tocaron "Separar mi cupo en lista de espera"
--   completan_registro    sesiones que enviaron el formulario con su contacto
--   pct_completan         completan_registro / clic_en_registrarse (%)
--   inscritas             filas en event_signups (la lista real, sin pruebas)
--
-- Como el resto de las métricas, excluye las sesiones de prueba.

drop view if exists public.eventos;
create view public.eventos as
with ev as (
  select
    count(distinct session_id) filter (where name = 'cta_click' and props->>'source' = 'eventos')                as clic_en_registrarse,
    count(distinct session_id) filter (where name = 'event_waitlist_join' and props->>'captured' = 'true')       as completan_registro
  from public.events
  where (props->>'is_test') is distinct from 'true'
)
select
  ev.clic_en_registrarse,
  ev.completan_registro,
  case when ev.clic_en_registrarse > 0
       then round(ev.completan_registro * 100.0 / ev.clic_en_registrarse, 1) end as pct_completan,
  (select count(*) from public.event_signups where not is_test) as inscritas
from ev;
alter view public.eventos set (security_invoker = true);
revoke all on public.eventos from anon, authenticated;
