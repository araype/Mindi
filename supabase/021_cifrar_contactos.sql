-- Mindi · Contactos cifrados en las listas (hallazgo 4) — ejecutar UNA VEZ, después de 020.
-- Pegar en SQL Editor → Run. Seguro de re-ejecutar.
--
-- Desde ahora /api/waitlist guarda el nombre, el correo y el WhatsApp cifrados ("v1:<iv>:<cifrado>",
-- AES-256-GCM con LEADS_ENC_KEY), como ya se hace con el correo de `leads`. El texto cifrado mide más
-- que el original, así que se amplían los límites. La validación del formato (correo, 9–15 dígitos)
-- la hace el servidor antes de cifrar (api/_lib/validar.js y src/landing.js).
-- Las filas anteriores se cifran con scripts/cifrar-contactos.mjs (ver docs/cifrado-contactos.md).

-- interest_signups (listas de espera, demo e interés del filtro de etapa)
alter table public.interest_signups drop constraint if exists interest_signups_contact_check;
alter table public.interest_signups add constraint interest_signups_contact_check check (char_length(contact) between 5 and 400);
alter table public.interest_signups drop constraint if exists interest_signups_name_check;
alter table public.interest_signups add constraint interest_signups_name_check check (char_length(name) <= 400);
alter table public.interest_signups drop constraint if exists interest_signups_whatsapp_check;
alter table public.interest_signups add constraint interest_signups_whatsapp_check
  check (whatsapp ~ '^[0-9]{9,15}$' or whatsapp like 'v1:%' and char_length(whatsapp) <= 400);

-- event_signups (conversatorios, inscripciones anteriores)
alter table public.event_signups drop constraint if exists event_signups_contact_check;
alter table public.event_signups add constraint event_signups_contact_check check (char_length(contact) between 5 and 400);
alter table public.event_signups drop constraint if exists event_signups_name_check;
alter table public.event_signups add constraint event_signups_name_check check (char_length(name) <= 400);

notify pgrst, 'reload schema';
