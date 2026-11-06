-- Mindi · Conversaciones compartidas del chat (aprobado el 6 nov. 2026) — ejecutar UNA VEZ, después de 025.
-- Pegar en SQL Editor → Run. Seguro de re-ejecutar.
--
-- chat_messages_research: la conversación completa (preguntas de la usuaria y respuestas de Mindi), solo si
--   aceptó la tarjeta del chat con el texto chat-v3 ("guarde esta conversación"). Las une un identificador
--   al azar que se crea al abrir /chat: no es la sesión del test, ni el resultado, ni el contacto. Ambos
--   textos pasan por el mismo filtro de datos personales (nombres, correos, teléfonos, DNI, direcciones).
--   Se conserva 12 meses. Solo la escribe /api/agent (servidor); con la clave publicable solo se puede INSERTAR.
-- Las preguntas sueltas siguen yendo a chat_questions_research (pestaña Chat con IA del panel).

create table if not exists public.chat_messages_research (
  id                    bigint generated always as identity primary key,
  fecha                 date not null default current_date,
  conversacion          uuid not null,
  rol                   text not null check (rol in ('usuaria', 'mindi')),
  texto                 text not null check (char_length(texto) between 1 and 4000),
  tema                  text check (tema in ('bochornos', 'sueno', 'animo', 'peso', 'vida_intima', 'terapia_hormonal',
                                             'remedios_naturales', 'edad_inicio', 'duracion', 'trabajo', 'otro')),
  consent_text_version  text not null check (char_length(consent_text_version) <= 20),
  is_test               boolean not null default false
);
create index if not exists chat_messages_research_conv on public.chat_messages_research (conversacion, id);
alter table public.chat_messages_research enable row level security;
drop policy if exists "anon insert chat_messages_research" on public.chat_messages_research;
create policy "anon insert chat_messages_research" on public.chat_messages_research for insert to anon with check (true);
revoke all on public.chat_messages_research from anon, authenticated;
grant insert on public.chat_messages_research to anon;

-- Limpieza: la misma función de 022, más las conversaciones (12 meses).
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

  delete from public.chat_messages_research where fecha < current_date - interval '12 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('chat_messages_research', n);

  delete from public.sessions s
   where s.created_at < now() - interval '2 years'
     and not exists (select 1 from public.research_consents r where r.session_id = s.id);
  get diagnostics n = row_count; out := out || jsonb_build_object('sessions', n);

  return out;
end;
$$;
revoke all on function public.limpieza_datos() from public, anon, authenticated;

notify pgrst, 'reload schema';
