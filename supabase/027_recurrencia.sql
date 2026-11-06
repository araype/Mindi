-- Mindi · Recurrencia en el chat (Experimento 2 · PC4, 6 nov. 2026) — ejecutar UNA VEZ, después de 026.
-- Pegar en SQL Editor → Run. Seguro de re-ejecutar.
--
-- chat_messages_research.usuaria: código al azar (u-…) que el navegador crea cuando ella acepta guardar
--   su conversación y guarda en localStorage. Une sus conversaciones guardadas en ese navegador; no es su
--   sesión del test, ni su resultado, ni su contacto. Si borra los datos del navegador o cambia de equipo,
--   cuenta como usuaria nueva. Solo en conversaciones con chat-v4 (el texto de la política que lo explica).
-- fecha: el día en Lima (antes, en UTC), para contar bien los "días distintos".
-- chat_recurrence_stats: la tarjeta "Recurrencia" del panel (pestaña Chat con IA).

alter table public.chat_messages_research add column if not exists usuaria text
  check (usuaria is null or usuaria ~ '^u-[0-9a-z]{16}$');
alter table public.chat_messages_research alter column fecha set default (now() at time zone 'America/Lima')::date;
create index if not exists chat_messages_research_usuaria on public.chat_messages_research (usuaria, fecha) where usuaria is not null;

-- Periodo: según el día de la PRIMERA conversación de cada usuaria (p_since ≤ primera < p_until).
-- Vuelve en 7 días = pregunta en 2 días distintos o más entre su primer día y los 6 siguientes. Solo
-- cuentan para el % las usuarias cuyo primer día fue hace 7 días o más (ya tuvieron la semana completa).
create or replace function public.chat_recurrence_stats(p_since timestamptz default null, p_until timestamptz default null,
                                                        p_include_test boolean default false)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with m as (
    select usuaria, conversacion, fecha, rol
      from public.chat_messages_research
     where usuaria is not null and (p_include_test or not is_test)
  ), u as (
    select usuaria, min(fecha) as primera from m group by usuaria
  ), u_p as (
    select * from u
     where (p_since is null or primera >= (p_since at time zone 'America/Lima')::date)
       and (p_until is null or primera <  (p_until at time zone 'America/Lima')::date)
  ), dias as (
    select u_p.usuaria, u_p.primera, count(distinct m.fecha) filter (where m.rol = 'usuaria' and m.fecha < u_p.primera + 7) as dias_7
      from u_p join m using (usuaria)
     group by 1, 2
  ), conv as (
    select m.conversacion, count(*) filter (where m.rol = 'usuaria') as preguntas
      from m join u_p using (usuaria)
     group by 1
  )
  select jsonb_build_object(
    'usuarias',            (select count(*) from u_p),
    'usuarias_7d',         (select count(*) from dias where primera <= (now() at time zone 'America/Lima')::date - 7),
    'vuelven_7d',          (select count(*) from dias where primera <= (now() at time zone 'America/Lima')::date - 7 and dias_7 >= 2),
    'conversaciones',      (select count(*) from conv),
    'mensajes_promedio',   (select round(avg(preguntas)::numeric, 1) from conv)
  );
$$;
revoke all on function public.chat_recurrence_stats(timestamptz, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.chat_recurrence_stats(timestamptz, timestamptz, boolean) to service_role;

notify pgrst, 'reload schema';
