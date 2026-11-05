// Mindi · Validación en el servidor de todo lo que escribe el navegador (handoff 11.3).
// Lo que no pasa, no se guarda. El puntaje y el nivel se recalculan aquí desde las respuestas:
// nunca se confía en los que mande el navegador.
import { computeScores, computeLevel } from '../../supabase/functions/_shared/mrs.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID.test(v);
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v) => typeof v === 'string' && v.length <= 120 && EMAIL_RE.test(v);
const str = (v, max) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);
const bool = (v) => v === true;

/* Opciones del test, iguales a las de src/main.js (tests/api.test.js revisa que coincidan). */
export const OPTIONS = {
  age: ['Menor de 40', '40 a 45', '46 a 52', 'Mayor de 52'],
  cycle: ['Sigue regular', 'Es irregular (varía o se retrasa)', 'Más de 60 días sin regla', 'Más de 12 meses sin regla', 'Me hicieron una histerectomía'],
  smoking: ['No fumo', 'Fumo ocasionalmente', 'Fumo a diario', 'Fumaba antes, ya no'],
  obesity: ['Sí', 'No', 'No estoy segura'],
  family: ['Sí', 'No', 'No sé / no tengo ese dato'],
  migraine: ['No', 'Sí, sin aura', 'Sí, con aura (destellos, luces u otros síntomas antes del dolor)'],
  treatment: ['No uso ningún tratamiento', 'Sí, tratamiento hormonal', 'Sí, tratamiento no hormonal (plantas, suplementos, etc.)', 'No estoy segura'],
};
const ITEMS = ['p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13'];
const SKIPPABLE = new Set(['p11', 'p13']);
const FLAGS = new Set(['rf1', 'rf2', 'rf3', 'rf4', 'rf5', 'rf6', 'none']);
const oneOf = (v, list) => (list.includes(v) ? v : undefined);

/** Sesión del test → fila de `sessions` o { error }. */
export function sessionRow(b) {
  if (!b || !isUuid(b.id)) return { error: 'id' };
  const answers = {};
  for (const id of ITEMS) {
    const v = b.answers ? b.answers[id] : undefined;
    if (v === null && SKIPPABLE.has(id)) { answers[id] = null; continue; }
    if (!Number.isInteger(v) || v < 0 || v > 4) return { error: `answers.${id}` };
    answers[id] = v;
  }
  if (!b.answers || Object.keys(b.answers).length !== ITEMS.length) return { error: 'answers' };
  const fields = { age_range: ['age', b.age_range], cycle: ['cycle', b.cycle], smoking: ['smoking', b.smoking], obesity: ['obesity', b.obesity],
    family_breast_ca: ['family', b.family_breast_ca], migraine: ['migraine', b.migraine], current_treatment: ['treatment', b.current_treatment] };
  const row = { id: b.id };
  for (const [col, [opt, v]] of Object.entries(fields)) {
    const ok = oneOf(v, OPTIONS[opt]);
    if (ok === undefined) return { error: col };
    row[col] = ok;
  }
  const flags = Array.isArray(b.red_flags) ? [...new Set(b.red_flags)] : null;
  if (!flags || !flags.length || flags.some((f) => !FLAGS.has(f)) || (flags.includes('none') && flags.length > 1)) return { error: 'red_flags' };
  const s = computeScores(answers);
  const alert = !flags.includes('none');
  return {
    row: {
      ...row, answers,
      score_somatico: s.somatico, score_psicologico: s.psicologico, score_urogenital: s.urogenital, score_total: s.total,
      level: alert ? 'alert' : computeLevel(s), red_flags: flags,
      skipped_intimate: answers.p11 === null || answers.p13 === null,
      is_test: bool(b.is_test),
    },
  };
}

/** Pedido de copia por correo (y casillas opcionales) → { lead?, research } o { error }. */
export function leadRequest(b) {
  if (!b || !isUuid(b.session_id)) return { error: 'session_id' };
  const version = str(b.consent_text_version, 20);
  if (!version) return { error: 'consent_text_version' };
  const out = { session_id: b.session_id, version, is_test: bool(b.is_test), research: bool(b.research) };
  if (b.email != null && b.email !== '') {
    const email = typeof b.email === 'string' ? b.email.trim() : '';
    if (!isEmail(email)) return { error: 'email' };
    const name = b.name == null || b.name === '' ? null : str(b.name, 80);
    if (b.name && !name) return { error: 'name' };
    out.lead = { email, name, news: bool(b.news) };
  } else if (b.news) {
    return { error: 'news_sin_correo' };
  }
  return out;
}

/* Eventos de analítica (handoff 11.8): solo el nombre de la acción y datos de uso. Nunca
   respuestas, puntajes, niveles, señales de alerta, metas, correos ni teléfonos. */
const EVENT_NAME = /^[a-z][a-z0-9_]{1,47}$/;
const PROP_KEYS = new Set(['source', 'origen', 'origin', 'tester', 'q', 'channel', 'captured', 'news', 'research', 'in_app',
  'list', 'n', 'area', 'code', 'error', 'method', 'desde', 'answer', 'score', 'version', 'tema']);
const BLOCKED_EVENT_PROPS = { result: true, goals: true, redflags_answered: true, stage_filter_exit: true, interest_signup: true, interest_skip: true };
/** → { row } o { error }. Las props de más se descartan (no se rechaza el evento). */
export function eventRow(b) {
  if (!b || !isUuid(b.session_id)) return { error: 'session_id' };
  if (typeof b.name !== 'string' || !EVENT_NAME.test(b.name)) return { error: 'name' };
  const props = { is_test: bool(b.props && b.props.is_test) };
  if (b.props && typeof b.props === 'object' && !BLOCKED_EVENT_PROPS[b.name]) {
    for (const [k, v] of Object.entries(b.props)) {
      if (!PROP_KEYS.has(k)) continue;
      if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e6)) props[k] = v;
      else if (typeof v === 'string' && v.length <= 40 && !v.includes('@')) props[k] = v;
    }
  }
  return { row: { session_id: b.session_id, name: b.name, props } };
}

/** Lista de interés de quienes salen por el filtro de etapa (sin sesión ni respuestas). */
export function interestRow(b) {
  const email = b && typeof b.email === 'string' ? b.email.trim() : '';
  if (!isEmail(email)) return { error: 'email' };
  if (!['under40_regular', 'under40_irregular'].includes(b.segment)) return { error: 'segment' };
  const version = str(b.consent_text_version, 20);
  if (!version) return { error: 'consent_text_version' };
  return { row: { contact: email, segment: b.segment, consent: true, consent_text_version: version, is_test: bool(b.is_test) } };
}
