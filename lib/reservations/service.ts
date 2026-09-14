import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { transition, language, type EventKind } from './model.ts';
import { providerConfigured, renderReservation, type ReservationMail } from '../email/reservation.ts';
export const SETTING_KEY = 'reservation_notifications';
export const reservationColumns = 'id, created_at, name, email, phone, party_size, date::text, time::text, status, notes, lang';
export async function transaction<T>(pool:Pool, run:(client:PoolClient)=>Promise<T>) {
 const client = await pool.connect();
 try { await client.query('BEGIN'); const result = await run(client); await client.query('COMMIT'); return result; }
 catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
async function enqueue(client:PoolClient, row:Record<string, any>, kind:EventKind, reason = '') {
 const event = await client.query('INSERT INTO reservation_events(reservation_id,kind) VALUES($1,$2) RETURNING id',[row.id,kind]);
 const settings = await client.query("SELECT key,value FROM site_settings WHERE key = ANY($1)",[[SETTING_KEY,'site_content']]);
 const recipient = settings.rows.find(s=>s.key===SETTING_KEY)?.value?.recipient || null;
 const content = settings.rows.find(s=>s.key==='site_content')?.value || {};
 const contact = `${content.address || '16 Rue Léon Frot, 75011 Paris'}\n${content.phone || '+33 1 53 27 95 39'}`;
 const origin = process.env.SITE_URL;
 let managementUrl = '';
 try { if (origin && /^https?:\/\//.test(origin)) managementUrl = `${new URL('/admin',origin).href}?reservation=${row.id}`; } catch { /* Missing/invalid configuration must never discard a booking. */ }
 for (const audience of (kind === 'received' ? ['customer','restaurant'] : ['customer']) as ('customer'|'restaurant')[]) {
   const to = audience === 'customer' ? row.email : recipient;
   const mail:ReservationMail = {kind,audience,id:row.id,name:row.name,email:row.email,phone:row.phone || '',date:row.date,time:row.time,party_size:row.party_size,lang:language(row.lang),notes:row.notes || '',reason,contact,managementUrl};
   const issue = !to ? 'recipient_missing' : audience === 'restaurant' && !managementUrl ? 'site_url_missing' : !providerConfigured() ? 'provider_missing' : null;
   await client.query(`INSERT INTO reservation_notifications(event_id,audience,recipient,payload,status,last_error) VALUES($1,$2,$3,$4,$5,$6)`,[event.rows[0].id,audience,to,JSON.stringify({message:renderReservation(mail),from:process.env.RESEND_FROM_EMAIL || null}),issue?'blocked':'pending',issue]);
 }
}
export async function submitReservation(pool:Pool, input:ReturnType<typeof import('./model.ts').validateSubmission>, authorize:()=>string|false) {
 const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
 return transaction(pool, async client => {
   // Serialize email quotas and retries, including requests handled by other app processes.
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,2))',[input.submission_key]);
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.email]);
   const old = await client.query('SELECT id,submission_hash FROM reservations WHERE submission_key=$1',[input.submission_key]);
   if (old.rows[0]) { if (old.rows[0].submission_hash !== hash) throw new Error('idempotency_conflict'); return old.rows[0].id as string; }
   const challengeId=authorize(); if (!challengeId) throw new Error('bot_invalid');
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,1))',[challengeId]);
   const used=await client.query('SELECT id FROM reservations WHERE bot_challenge_id=$1',[challengeId]);
   if (used.rowCount) throw new Error('bot_invalid');
   const count = await client.query("SELECT count(*)::int AS count FROM reservations WHERE email=$1 AND created_at >= date_trunc('day',now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris'",[input.email]);
   if (count.rows[0].count >= 3) throw new Error('rate_limited');
   const result = await client.query(`INSERT INTO reservations(name,email,phone,party_size,date,time,notes,status,lang,submission_key,submission_hash,bot_challenge_id) VALUES($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11) RETURNING ${reservationColumns}`,[input.name,input.email,input.phone,input.party_size,input.date,input.time,input.notes,input.lang,input.submission_key,hash,challengeId]);
   await enqueue(client,result.rows[0],'received'); return result.rows[0].id as string;
 });
}
export async function changeStatus(pool:Pool,id:string,next:unknown,reason:unknown) {
 return transaction(pool,async client=>{
   const result = await client.query(`SELECT ${reservationColumns} FROM reservations WHERE id=$1 FOR UPDATE`,[id]);
   const row = result.rows[0]; if (!row) throw new Error('not_found');
   const kind = transition(row.status,next,reason);
   if (!kind) return {changed:false};
   await client.query('UPDATE reservations SET status=$2 WHERE id=$1',[id,next]);
   await enqueue(client,row,kind,typeof reason==='string' && next==='cancelled' ? reason.trim() : '');
   return {changed:true};
 });
}
