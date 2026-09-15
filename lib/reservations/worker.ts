import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction } from './service.ts';
import { sendReservationEmail, providerConfigured } from '../email/reservation.ts';
export const MAX_ATTEMPTS = 6;
export const backoffSeconds = (attempt:number) => Math.min(3600,30 * 2 ** (attempt-1));
export async function workOne(pool:Pool, send = sendReservationEmail) {
 const token = randomUUID();
 const claim = await pool.query(`UPDATE reservation_notifications SET status='processing', claim_token=$1, lease_until=now()+interval '60 seconds', attempts=attempts+1, first_attempt_at=COALESCE(first_attempt_at,now()), payload=jsonb_set(payload,'{from}',COALESCE(NULLIF(payload->'from','null'::jsonb),to_jsonb($2::text),'null'::jsonb))
 WHERE id=(SELECT id FROM reservation_notifications WHERE (status='pending' AND next_attempt_at<=now()) OR (status='processing' AND lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id,event_id`,[token,process.env.EMAIL_FROM || null]);
 if (!claim.rows[0]) return false;
 const jobId = claim.rows[0].id;

 // 1. Pre-send inspection: verify eligibility, stale status, and recipient/provider readiness.
 // This transaction is brief and commits before any external network I/O.
 const check = await transaction(pool, async client => {
   const event = await client.query('SELECT e.kind,r.status FROM reservation_events e JOIN reservations r ON r.id=e.reservation_id WHERE e.id=$1 FOR UPDATE OF r',[claim.rows[0].event_id]);
   const jobs = await client.query('SELECT * FROM reservation_notifications WHERE id=$1 AND claim_token=$2 FOR UPDATE',[jobId,token]);
   const job = jobs.rows[0]; if (!job) return { action: 'abort' as const };
   const finish = async (status:string,error:string|null=null) => {
     await client.query('UPDATE reservation_notifications SET status=$2,last_error=$3,lease_until=NULL,claim_token=NULL WHERE id=$1',[jobId,status,error]);
   };
   const current = event.rows[0];
   if (job.audience==='customer' && ((current.kind==='received' && current.status!=='pending') || (current.kind==='confirmed' && current.status!=='confirmed'))) {
     await finish('superseded'); return { action: 'done' as const };
   }
   if (job.first_attempt_at && Date.now()-new Date(job.first_attempt_at).getTime()>23*3600000) {
     await finish('failed','delivery_uncertain_expired'); return { action: 'done' as const };
   }
   if (job.attempts>MAX_ATTEMPTS) {
     await finish('failed','attempts_exhausted'); return { action: 'done' as const };
   }
   if (!job.recipient || !providerConfigured()) {
     await finish('blocked',!job.recipient?'recipient_missing':'provider_missing'); return { action: 'done' as const };
   }
   if (!job.payload.from) job.payload.from=process.env.EMAIL_FROM;
   return { action: 'send' as const, job };
 });

 if (check.action !== 'send') return true;
 const { job } = check;

 // 2. External SMTP dispatch happens completely OUTSIDE any database transaction or row lock.
 let providerId: string | null = null;
 let sendError: string | null = null;
 try {
   providerId = await send(job.recipient,job.payload.message,`reservation/${jobId}`,undefined,job.payload.from);
 } catch (e) {
   sendError = e instanceof Error && /^(provider_(missing|uncertain|auth_failed|timeout|rejected))$/.test(e.message) ? e.message : 'provider_uncertain';
 }

 // 3. Post-send completion: brief transaction to record the outcome.
 await transaction(pool, async client => {
   const jobs = await client.query('SELECT id FROM reservation_notifications WHERE id=$1 AND claim_token=$2 FOR UPDATE',[jobId,token]);
   if (!jobs.rows[0]) return;

   if (providerId) {
     await client.query('UPDATE reservation_notifications SET status=$2,last_error=NULL,provider_message_id=COALESCE($3,provider_message_id),lease_until=NULL,claim_token=NULL WHERE id=$1',[jobId,'accepted',providerId]);
   } else {
     const finalStatus = job.attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
     await client.query('UPDATE reservation_notifications SET status=$2,last_error=$3,lease_until=NULL,claim_token=NULL WHERE id=$1',[jobId,finalStatus,sendError]);
     await client.query("UPDATE reservation_notifications SET next_attempt_at=now()+$2*interval '1 second' WHERE id=$1",[jobId,backoffSeconds(job.attempts)]);
   }
 });

 return true;
}
