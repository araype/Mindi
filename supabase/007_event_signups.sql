-- Mindi · Lista de espera del conversatorio (sección "Eventos") — ejecutar UNA VEZ,
-- después de schema.sql. Pegar completo en Supabase → SQL Editor → Run.
--
-- Mismo modelo de seguridad que `leads`: el navegador (rol anon) solo puede INSERTAR.
-- Nadie puede leer esta tabla con la clave pública — se consulta desde el panel de
-- Supabase (o con la service key, solo en servidor).

create table if not exists public.event_signups (
  id                    bigint generated always as identity primary key,
  created_at            timestamptz not null default now(),
  name                  text check (char_length(name) <= 80),
  contact               text not null check (char_length(contact) between 5 and 120),
  consent               boolean not null check (consent = true),
  consent_text_version  text not null check (char_length(consent_text_version) <= 20),
  is_test               boolean not null default false
);

alter table public.event_signups enable row level security;

create policy "anon insert event_signups" on public.event_signups for insert to anon with check (true);

revoke all on public.event_signups from anon;
grant insert on public.event_signups to anon;
-- El grant "a todas las secuencias" de schema.sql solo alcanzó a las que ya existían
-- cuando corrió; esta tabla es nueva, así que su secuencia necesita su propio grant.
grant usage, select on sequence public.event_signups_id_seq to anon;
