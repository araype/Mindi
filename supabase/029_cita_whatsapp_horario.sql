-- Mindi · "Agendar cita": WhatsApp obligatorio, correo opcional y horario preferido — ejecutar UNA VEZ,
-- después de 028. Pegar en Supabase → SQL Editor → Run. Seguro de re-ejecutar.
--
-- 1. Para las citas, lo más común es el WhatsApp: el correo (`contact`) pasa a ser opcional, pero cada fila
--    tiene que tener al menos un correo o un WhatsApp. Las demás listas siguen pidiendo correo (lo valida /api).
-- 2. `horario`: el horario tentativo que eligió en "Agendar cita" (p. ej. "jueves 19 · 3:00 p. m."), para que
--    el equipo lo vea junto al contacto en la exportación de la lista `consultas`. No es un dato sensible.

alter table public.interest_signups alter column contact drop not null;

alter table public.interest_signups drop constraint if exists interest_signups_contacto_check;
alter table public.interest_signups add constraint interest_signups_contacto_check
  check (contact is not null or whatsapp is not null);

alter table public.interest_signups add column if not exists horario text check (char_length(horario) <= 40);
