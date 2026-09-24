-- Mindi · Marca de "sesión de prueba" — ejecutar UNA VEZ.
-- Pegar en Supabase → SQL Editor → Run, después de los scripts anteriores.
-- Seguro de re-ejecutar (usa IF NOT EXISTS / CREATE OR REPLACE).
--
-- Por qué: mientras se prueba el flujo (antes del lanzamiento real), esas sesiones no
-- deben contar para medir el 15% de conversión del experimento. La app ya marca cada
-- sesión nueva como is_test según VITE_TEST_MODE (por defecto, encendido). Este script:
--   1. Agrega la columna a sessions y leads.
--   2. Marca como prueba TODO lo que ya existe (hasta hoy, nada es lanzamiento real).
--   3. Actualiza la vista `funnel` para excluir las sesiones de prueba.

alter table public.sessions add column if not exists is_test boolean not null default false;
alter table public.leads    add column if not exists is_test boolean not null default false;

update public.sessions set is_test = true where is_test = false;
update public.leads    set is_test = true where is_test = false;
update public.events set props = props || '{"is_test": true}'::jsonb where not (props ? 'is_test');

-- DROP + CREATE en vez de CREATE OR REPLACE: Postgres no permite que REPLACE reordene
-- o inserte columnas en medio de una vista existente (por eso falló el intento anterior
-- con 005_funnel_v2.sql — no llegó a cambiar nada, así que esto es seguro de correr).
drop view if exists public.funnel;
create view public.funnel as
select
  count(distinct session_id) filter (where name = 'page_view')         as visitas,
  count(distinct session_id) filter (where name = 'chat_start')        as inician_chat,
  count(distinct session_id) filter (where name = 'mrs_complete')      as completan_sintomas,
  count(distinct session_id) filter (where name = 'result')            as ven_resultado,
  count(distinct session_id) filter (where name = 'goals')             as eligen_metas,
  count(distinct session_id) filter (where name = 'lead' and (props->>'captured') = 'true') as leads,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'Sí, lo probaría')  as precio_si,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'Tal vez, depende')  as precio_tal_vez,
  count(distinct session_id) filter (where name = 'price_validation' and props->>'answer' = 'No lo probaría')    as precio_no,
  count(distinct session_id) filter (where name = 'satisfaction' and (props->>'score')::int >= 3) as satisfaccion_alta,
  count(distinct session_id) filter (where name = 'satisfaction' and (props->>'score')::int = 2)  as satisfaccion_neutra,
  count(distinct session_id) filter (where name = 'satisfaction' and (props->>'score')::int <= 1) as satisfaccion_baja
from public.events
where (props->>'is_test') is distinct from 'true';   -- <- la única línea nueva de verdad
alter view public.funnel set (security_invoker = true);
revoke all on public.funnel from anon, authenticated;
