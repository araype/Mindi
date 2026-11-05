-- Mindi · "Compartir con mi médico" — ejecutar UNA VEZ, después de 017.
-- Pegar en Supabase → SQL Editor → Run. Seguro de re-ejecutar.
--
-- Al tocar "Compartir con mi médico", la función send-report guarda aquí una copia del reporte
-- (el mismo HTML del correo, sin nombre ni contacto) y devuelve el enlace /reporte?t=<token>.
-- Solo se crea si la usuaria toca el botón, y vence a los 30 días (expires_at).
-- Igual que `reports`: solo la escribe send-report con la service_role key. El navegador no
-- puede leerla ni escribirla; la única puerta pública es get_report_by_token() con el token exacto.

create extension if not exists pgcrypto;

create table if not exists public.report_shares (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  session_id  uuid not null unique references public.sessions(id) on delete cascade,
  token       uuid not null default gen_random_uuid() unique,
  html        text not null check (char_length(html) < 50000),
  expires_at  timestamptz not null default (now() + interval '30 days')
);

alter table public.report_shares enable row level security;
revoke all on public.report_shares from anon, authenticated;

-- Misma firma que en 002: ahora busca también en report_shares, solo si no venció.
create or replace function public.get_report_by_token(p_token uuid)
returns table(html text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select r.html, r.created_at from public.reports r where r.token = p_token
  union all
  select s.html, s.created_at from public.report_shares s where s.token = p_token and s.expires_at > now()
  limit 1;
$$;
revoke all on function public.get_report_by_token(uuid) from public;
grant execute on function public.get_report_by_token(uuid) to anon;
