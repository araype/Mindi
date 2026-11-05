-- Mindi · Qué preguntan en el chat (aprobado el 5 nov. 2026) — ejecutar UNA VEZ, después de 021.
-- Pegar en SQL Editor → Run. Seguro de re-ejecutar.
--
-- Nivel 1 · chat_topics: por cada pregunta, solo una etiqueta de tema (la elige el agente con la
--   herramienta clasificar_tema), el área que respondió, el nivel del test si lo hizo, la fecha (el día,
--   sin hora) y si llegó por ?tema=. Sin texto, sin sesión ni nada que la vincule con una usuaria.
--   Se conserva 2 años. Activo desde el lanzamiento.
-- Nivel 2 · chat_questions_research: el texto de la pregunta (no la respuesta de Mindi), solo si marcó
--   la casilla del chat, después de quitar nombres, correos, teléfonos, DNI y direcciones. Sin sesión,
--   correo ni resultado. Se conserva 12 meses. Apagado hasta aprobar la política (CHAT_RESEARCH_ENABLED).
-- Las dos las escribe solo /api/agent (servidor). Con la clave publicable solo se puede INSERTAR.

create table if not exists public.chat_topics (
  id          bigint generated always as identity primary key,
  fecha       date not null default current_date,
  tema        text not null check (tema in ('bochornos', 'sueno', 'animo', 'peso', 'vida_intima', 'terapia_hormonal',
                                            'remedios_naturales', 'edad_inicio', 'duracion', 'trabajo', 'otro')),
  area        text not null check (area in ('coordinador', 'psicologia', 'hormonal', 'ginecologia', 'otro')),
  nivel_test  text check (nivel_test in ('A', 'B', 'C', 'alert')),
  desde_tema  boolean not null default false,
  is_test     boolean not null default false
);
alter table public.chat_topics enable row level security;
drop policy if exists "anon insert chat_topics" on public.chat_topics;
create policy "anon insert chat_topics" on public.chat_topics for insert to anon with check (true);
revoke all on public.chat_topics from anon, authenticated;
grant insert on public.chat_topics to anon;

create table if not exists public.chat_questions_research (
  id                    bigint generated always as identity primary key,
  fecha                 date not null default current_date,
  pregunta              text not null check (char_length(pregunta) between 1 and 1000),
  tema                  text check (tema in ('bochornos', 'sueno', 'animo', 'peso', 'vida_intima', 'terapia_hormonal',
                                             'remedios_naturales', 'edad_inicio', 'duracion', 'trabajo', 'otro')),
  consent_text_version  text not null check (char_length(consent_text_version) <= 20),
  is_test               boolean not null default false
);
alter table public.chat_questions_research enable row level security;
drop policy if exists "anon insert chat_questions_research" on public.chat_questions_research;
create policy "anon insert chat_questions_research" on public.chat_questions_research for insert to anon with check (true);
revoke all on public.chat_questions_research from anon, authenticated;
grant insert on public.chat_questions_research to anon;

-- Panel: temas por mes (solo cuentas). La llama funnel-stats con la clave de servidor.
create or replace function public.chat_topics_stats(p_since timestamptz default null, p_include_test boolean default false)
returns table(mes text, tema text, n bigint)
language sql
security definer
set search_path = public
stable
as $$
  select to_char(date_trunc('month', fecha), 'YYYY-MM') as mes, tema, count(*) as n
    from public.chat_topics
   where (p_since is null or fecha >= p_since::date)
     and (p_include_test or not is_test)
   group by 1, 2
   order by 1, 3 desc;
$$;
revoke all on function public.chat_topics_stats(timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.chat_topics_stats(timestamptz, boolean) to service_role;

-- Borrado automático: la misma limpieza diaria de 020, con las dos tablas nuevas.
create or replace function public.limpieza_datos()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare out jsonb := '{}'::jsonb; n int;
begin
  delete from public.reports where created_at < now() - interval '30 days';
  get diagnostics n = row_count; out := out || jsonb_build_object('reports', n);

  delete from public.report_shares where expires_at < now();
  get diagnostics n = row_count; out := out || jsonb_build_object('report_shares', n);

  delete from public.events where created_at < now() - interval '1 year';
  get diagnostics n = row_count; out := out || jsonb_build_object('events', n);

  delete from public.interest_signups
   where segment in ('plus', 'consultas', 'especialistas', 'empresas') and created_at < now() - interval '12 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('interest_signups', n);

  delete from public.leads where created_at < now() - interval '2 years';
  get diagnostics n = row_count; out := out || jsonb_build_object('leads', n);

  delete from public.event_signups where created_at < now() - interval '2 years';
  get diagnostics n = row_count; out := out || jsonb_build_object('event_signups', n);

  delete from public.chat_topics where fecha < current_date - interval '2 years';
  get diagnostics n = row_count; out := out || jsonb_build_object('chat_topics', n);

  delete from public.chat_questions_research where fecha < current_date - interval '12 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('chat_questions_research', n);

  delete from public.sessions s
   where s.created_at < now() - interval '2 years'
     and not exists (select 1 from public.research_consents r where r.session_id = s.id);
  get diagnostics n = row_count; out := out || jsonb_build_object('sessions', n);

  return out;
end;
$$;
revoke all on function public.limpieza_datos() from public, anon, authenticated;

notify pgrst, 'reload schema';
