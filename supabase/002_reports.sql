-- Mindi · Reporte por correo/WhatsApp — ejecutar UNA VEZ, después de schema.sql
-- Pegar completo en Supabase → SQL Editor → Run.
--
-- Esta tabla la escribe y la lee SOLO la Edge Function `send-report`, con la
-- service_role key (nunca la clave pública). El navegador nunca puede leerla
-- ni escribirla directamente — ni siquiera la propia usuaria dueña del dato.
-- La única puerta pública es la función get_report_by_token() de más abajo,
-- que solo devuelve un reporte si conoces su token exacto (no se puede listar).

create extension if not exists pgcrypto;

create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  session_id  uuid not null unique references public.sessions(id) on delete cascade,
  token       uuid not null default gen_random_uuid() unique,  -- para el enlace privado (caso WhatsApp)
  channel     text not null check (channel in ('email','link')),
  contact     text not null check (char_length(contact) <= 120),
  subject     text check (char_length(subject) <= 140),
  html        text not null check (char_length(html) < 50000),
  status      text not null default 'pending' check (status in ('pending','sent','failed')),
  error       text,
  sent_at     timestamptz
);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

-- Lectura pública, pero solo fila-por-fila y solo con el token exacto (uuid random
-- de 122 bits: no se puede adivinar por fuerza bruta). Nunca permite listar todos.
create or replace function public.get_report_by_token(p_token uuid)
returns table(html text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select r.html, r.created_at from public.reports r where r.token = p_token limit 1;
$$;
revoke all on function public.get_report_by_token(uuid) from public;
grant execute on function public.get_report_by_token(uuid) to anon;
