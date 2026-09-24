-- Mindi · Experimento 2 — esquema mínimo
-- Pegar completo en Supabase → SQL Editor → Run.
-- Diseño: el navegador (rol anon) solo puede INSERTAR. Nadie puede leer con la clave pública.
-- Los datos se consultan desde el panel de Supabase (o con la service key, solo en servidor).

create table if not exists public.sessions (
  id               uuid primary key,                       -- generado en el navegador, anónimo
  created_at       timestamptz not null default now(),
  age_range        text check (char_length(age_range) <= 40),
  cycle            text check (char_length(cycle) <= 80),
  menopause_years  text check (char_length(menopause_years) <= 40),
  smoking          text check (char_length(smoking) <= 40),
  obesity          text check (char_length(obesity) <= 40),
  family_breast_ca text check (char_length(family_breast_ca) <= 40),
  migraine         text check (char_length(migraine) <= 100),
  current_treatment text check (char_length(current_treatment) <= 100),
  answers          jsonb not null default '{}'::jsonb,     -- p3..p13 -> 0..4 | null
  score_somatico   smallint not null check (score_somatico   between 0 and 16),
  score_psicologico smallint not null check (score_psicologico between 0 and 16),
  score_urogenital smallint not null check (score_urogenital between 0 and 12),
  score_total      smallint not null check (score_total      between 0 and 44),
  level            text not null check (level in ('A','B','C','alert')),
  red_flags        text[] not null default '{}',
  skipped_intimate boolean not null default false,
  is_test          boolean not null default false  -- sesión de prueba, se excluye del embudo real
);

-- Contacto separado de las respuestas de salud.
create table if not exists public.leads (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  name          text check (char_length(name) <= 80),
  contact       text not null check (char_length(contact) between 5 and 120),
  consent       boolean not null check (consent = true),
  consent_text_version text not null check (char_length(consent_text_version) <= 20),
  is_test       boolean not null default false
);

-- Embudo: page_view, cta_click, chat_start, mrs_complete, redflags_answered, lead, result, price_validation
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  session_id  uuid not null,
  name        text not null check (char_length(name) <= 40),
  props       jsonb not null default '{}'::jsonb check (pg_column_size(props) < 2000)
);
create index if not exists events_name_idx on public.events(name);

alter table public.sessions enable row level security;
alter table public.leads    enable row level security;
alter table public.events   enable row level security;

-- Solo INSERT para anon. Sin políticas de select/update/delete = nadie puede leer ni modificar desde el navegador.
create policy "anon insert sessions" on public.sessions for insert to anon with check (true);
create policy "anon insert leads"    on public.leads    for insert to anon with check (true);
create policy "anon insert events"   on public.events   for insert to anon with check (true);

revoke all on public.sessions, public.leads, public.events from anon;
grant insert on public.sessions, public.leads, public.events to anon;
grant usage, select on all sequences in schema public to anon;

-- Vista de embudo (consultar en el panel; anon no tiene acceso).
-- DROP + CREATE, no REPLACE: Postgres no deja que REPLACE reordene columnas de una vista.
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
where (props->>'is_test') is distinct from 'true';
alter view public.funnel set (security_invoker = true);
revoke all on public.funnel from anon, authenticated;
