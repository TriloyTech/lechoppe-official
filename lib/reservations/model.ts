export type Language = 'fr' | 'en' | 'es' | 'it';
export type EventKind = 'received' | 'confirmed' | 'declined' | 'cancelled';
export const language = (value: unknown): Language => ['fr','en','es','it'].includes(String(value)) ? value as Language : 'fr';
export const SLOTS_LUNCH = ['12:00','12:30','13:00','13:30','14:00','14:30','15:00'];
export const SLOTS_DINNER = ['19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'];
export const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function emailAddress(v: unknown) {
  if (typeof v !== 'string' || /[\r\n\x00-\x1f\x7f]/.test(v)) throw new Error('invalid_email');
  const email = v.trim().toLowerCase();
  if (email.length > 254 || email.split('@')[0].length > 64 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email) || email.split('@')[0].startsWith('.') || email.includes('..')) throw new Error('invalid_email');
  return email;
}
export function parisNow(now = new Date()) {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(now);
  const get = (type: string) => p.find(v => v.type === type)!.value;
  return {date:`${get('year')}-${get('month')}-${get('day')}`, time:`${get('hour')}:${get('minute')}`};
}
export function bookingDate(date: string, time: string, lang: Language) {
  // Date-only SQL values stay strings; noon UTC cannot cross a Paris calendar boundary.
  return `${new Intl.DateTimeFormat(lang, {timeZone:'Europe/Paris', dateStyle:'full'}).format(new Date(`${date}T12:00:00Z`))} · ${time.slice(0,5)} (Europe/Paris)`;
}
function field(v: unknown, max: number, required = false) {
  if (v === undefined || v === null) v = '';
  if (typeof v !== 'string' || v.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v) || (required && !v.trim())) throw new Error('invalid_fields');
  return v.trim();
}
export function validateSubmission(body: Record<string, unknown>, now = new Date(), allowPastRetry = false) {
  const name = field(body.name, 120, true), email = emailAddress(body.email), phone = field(body.phone, 40), notes = field(body.notes, 2000);
  if (/[\r\n]/.test(name) || (phone && !/^[+\d () .-]{5,40}$/.test(phone))) throw new Error('invalid_fields');
  if (!Number.isInteger(body.party_size) || Number(body.party_size) < 1 || Number(body.party_size) > 40) throw new Error('invalid_fields');
  const date = field(body.date,10,true), time = field(body.time,5,true), today = parisNow(now);
  const last = new Date(`${today.date}T12:00:00Z`); last.setUTCDate(last.getUTCDate()+29);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) !== date || ![...SLOTS_LUNCH,...SLOTS_DINNER].includes(time) || (!allowPastRetry && (date < today.date || date > last.toISOString().slice(0,10) || (date === today.date && time <= today.time)))) throw new Error('invalid_fields');
  if (!uuid(body.submission_key)) throw new Error('invalid_key');
  return { name,email,phone,notes,date,time,party_size:Number(body.party_size),lang:language(body.lang),submission_key:body.submission_key };
}
export function transition(previous: string, next: unknown, reason: unknown): EventKind | null {
  if (!['confirmed','cancelled'].includes(String(next))) throw new Error('invalid_transition');
  if (previous === next) return null;
  if (previous === 'cancelled' || (previous === 'confirmed' && next !== 'cancelled')) throw new Error('invalid_transition');
  if (next === 'cancelled') { field(reason,1000,true); return previous === 'pending' ? 'declined' : 'cancelled'; }
  if (previous !== 'pending') throw new Error('invalid_transition');
  return 'confirmed';
}
export function newArrivals(previous: Set<string> | null, rows: {id:string}[]) { return previous === null ? [] : rows.filter(r => !previous.has(r.id)); }
