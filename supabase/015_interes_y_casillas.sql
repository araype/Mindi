-- Mindi · Lista de interés y casillas opcionales — ejecutar UNA VEZ, después de 014.
-- Pegar en Supabase → SQL Editor → Run. Seguro de re-ejecutar (IF NOT EXISTS / DROP POLICY IF EXISTS).
--
-- Por qué:
--   1. Las menores de 40 salen del test antes de que exista una sesión, así que su correo no
--      cabe en `leads` (exige session_id). Va en `interest_signups`, con el segmento del filtro.
--   2. "Avisos de Mindi" (opcional, junto al correo del reporte) → columna `opt_news` en `leads`.
--   3. "Investigación" (opcional, no exige correo) → `research_consents`, aparte del contacto:
--      una fila por sesión que dio el permiso, sin nombre ni correo.
-- Mismo modelo de seguridad que `leads`: el navegador (rol anon) solo puede INSERTAR.

-- 1. Lista de interés -------------------------------------------------------------------------
create table if not exists public.interest_signups (
  id                    bigint generated always as identity primary key,
  created_at            timestamptz not null default now(),
  contact               text not null check (char_length(contact) between 5 and 120),
  segment               text not null check (segment in ('under40_regular', 'under40_irregular')),
  consent               boolean not null check (consent = true),
  consent_text_version  text not null check (char_length(consent_text_version) <= 20),
  is_test               boolean not null default false
);
alter table public.interest_signups enable row level security;
drop policy if exists "anon insert interest_signups" on public.interest_signups;
create policy "anon insert interest_signups" on public.interest_signups for insert to anon with check (true);
revoke all on public.interest_signups from anon;
grant insert on public.interest_signups to anon;
grant usage, select on sequence public.interest_signups_id_seq to anon;

-- 2. Avisos de Mindi --------------------------------------------------------------------------
alter table public.leads add column if not exists opt_news boolean not null default false;

-- 3. Investigación ----------------------------------------------------------------------------
create table if not exists public.research_consents (
  session_id            uuid primary key references public.sessions(id) on delete cascade,
  created_at            timestamptz not null default now(),
  consent_text_version  text not null check (char_length(consent_text_version) <= 20),
  is_test               boolean not null default false
);
alter table public.research_consents enable row level security;
drop policy if exists "anon insert research_consents" on public.research_consents;
create policy "anon insert research_consents" on public.research_consents for insert to anon with check (true);
revoke all on public.research_consents from anon;
grant insert on public.research_consents to anon;

notify pgrst, 'reload schema';
