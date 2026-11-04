-- Mindi · Listas de espera de la landing nueva — ejecutar UNA VEZ, después de 016.
-- Pegar en Supabase → SQL Editor → Run. Seguro de re-ejecutar.
--
-- Usa `interest_signups` (SQL 015) como base, como se decidió: la misma tabla guarda ahora
-- cuatro listas más, separadas por `segment`:
--   plus          → "Quiero acceso anticipado" (Mindi Plus): nombre, correo, WhatsApp opcional
--   consultas     → "Agendar cita" (consultas con especialistas): nombre, correo, WhatsApp opcional
--   especialistas → "Para especialistas" (Red Mindi): nombre, correo, WhatsApp opcional
--   empresas      → "Agenda una demo" (Mindi Enterprise): empresa, cargo, n.º de colaboradoras, correo
-- `contact` sigue siendo el correo. Mismo modelo de seguridad: el navegador solo puede INSERTAR.
-- En la Fase 4 estas inserciones pasan a una función /api y el contacto se guarda cifrado.

alter table public.interest_signups drop constraint if exists interest_signups_segment_check;
alter table public.interest_signups add constraint interest_signups_segment_check
  check (segment in ('under40_regular', 'under40_irregular', 'plus', 'consultas', 'especialistas', 'empresas'));

alter table public.interest_signups add column if not exists name      text check (char_length(name) <= 80);
alter table public.interest_signups add column if not exists whatsapp  text check (whatsapp ~ '^[0-9]{9,15}$');
alter table public.interest_signups add column if not exists company   text check (char_length(company) <= 120);
alter table public.interest_signups add column if not exists job_title text check (char_length(job_title) <= 80);
alter table public.interest_signups add column if not exists team_size integer check (team_size between 1 and 1000000);
alter table public.interest_signups add column if not exists origin    text check (char_length(origin) <= 30);

notify pgrst, 'reload schema';
