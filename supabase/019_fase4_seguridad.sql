-- Mindi · Fase 4 (seguridad) — ejecutar UNA VEZ, después de 018. Pegar en SQL Editor → Run.
-- Seguro de re-ejecutar.
--
-- 1. Correo cifrado en `leads` (y copiado a `reports`): /api/lead guarda "v1:<iv>:<cifrado>" en
--    base64, que mide más de 120 caracteres. Se amplía el límite; solo send-report lo descifra.
-- 2. Los enlaces a /reporte de los correos (`reports`) vencen a los 30 días, igual que los de
--    "Compartir con mi médico" (`report_shares`, 018).
-- 3. Sigue igual: RLS activado y la clave publicable solo puede INSERTAR (segunda capa). Desde la
--    Fase 4 esa clave vive solo en el servidor (Vercel); el navegador ya no escribe directo.

-- 1 ----------------------------------------------------------------------------------------------
alter table public.leads drop constraint if exists leads_contact_check;
alter table public.leads add constraint leads_contact_check check (char_length(contact) between 5 and 400);
alter table public.reports drop constraint if exists reports_contact_check;
alter table public.reports add constraint reports_contact_check check (char_length(contact) <= 400);

-- 2 ----------------------------------------------------------------------------------------------
create or replace function public.get_report_by_token(p_token uuid)
returns table(html text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select r.html, r.created_at from public.reports r
   where r.token = p_token and r.created_at > now() - interval '30 days'
  union all
  select s.html, s.created_at from public.report_shares s
   where s.token = p_token and s.expires_at > now()
  limit 1;
$$;
revoke all on function public.get_report_by_token(uuid) from public;
grant execute on function public.get_report_by_token(uuid) to anon;

notify pgrst, 'reload schema';
