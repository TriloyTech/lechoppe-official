import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction } from './service.ts';
import { sendReservationEmail, providerConfigured } from '../email/reservation.ts';
import { createAdminClient } from '../supabase/server.ts';

export const MAX_ATTEMPTS = 6;
export const backoffSeconds = (attempt:number) => Math.min(3600,30 * 2 ** (attempt-1));

export async function workOne(poolOrSupabase?: any, send = sendReservationEmail) {
  // ── 1. Legacy / Unit test branch with pg.Pool ──
  if (poolOrSupabase && typeof poolOrSupabase.query === 'function') {
    const pool: Pool = poolOrSupabase;
    const token = randomUUID();
    const claim = await pool.query(`UPDATE reservation_notifications SET status='processing', claim_token=$1, lease_until=now()+interval '60 seconds', attempts=attempts+1, first_attempt_at=COALESCE(first_attempt_at,now()), payload=jsonb_set(payload,'{from}',COALESCE(NULLIF(payload->'from','null'::jsonb),to_jsonb($2::text),'null'::jsonb))
    WHERE id=(SELECT id FROM reservation_notifications WHERE (status='pending' AND next_attempt_at<=now()) OR (status='processing' AND lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id,event_id`,[token,process.env.EMAIL_FROM || null]);
    if (!claim.rows[0]) return false;
    const jobId = claim.rows[0].id;

    // Pre-send inspection
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

    let providerId: string | null = null;
    let sendError: string | null = null;
    try {
      providerId = await send(job.recipient,job.payload.message,`reservation/${jobId}`,undefined,job.payload.from);
    } catch (e) {
      sendError = e instanceof Error && /^(provider_(missing|uncertain|auth_failed|timeout|rejected))$/.test(e.message) ? e.message : 'provider_uncertain';
    }

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

  // ── 2. Supabase PostgREST branch ──
  const supabase = poolOrSupabase?.from ? poolOrSupabase : createAdminClient();
  const nowIso = new Date().toISOString();

  // Find candidate jobs
  const { data: candidates, error: findErr } = await supabase
    .from('reservation_notifications')
    .select('id, event_id, status, attempts, first_attempt_at, payload')
    .or(`and(status.eq.pending,next_attempt_at.lte.${nowIso}),and(status.eq.processing,lease_until.lt.${nowIso})`)
    .order('created_at', { ascending: true })
    .limit(1);

  if (findErr || !candidates || candidates.length === 0) return false;
  const candidate = candidates[0];

  const token = randomUUID();
  const leaseUntil = new Date(Date.now() + 60000).toISOString();
  const payload = { ...(candidate.payload || {}) };
  if (!payload.from && process.env.EMAIL_FROM) {
    payload.from = process.env.EMAIL_FROM;
  }

  // Optimistic claim
  const { data: claimed, error: claimErr } = await supabase
    .from('reservation_notifications')
    .update({
      status: 'processing',
      claim_token: token,
      lease_until: leaseUntil,
      attempts: (candidate.attempts || 0) + 1,
      first_attempt_at: candidate.first_attempt_at || nowIso,
      payload,
    })
    .eq('id', candidate.id)
    .eq('status', candidate.status)
    .select('id, event_id, audience, recipient, payload, attempts, first_attempt_at')
    .maybeSingle();

  if (claimErr || !claimed) return false;

  const jobId = claimed.id;

  // Pre-send inspection
  const { data: event } = await supabase
    .from('reservation_events')
    .select('kind, reservation_id')
    .eq('id', claimed.event_id)
    .maybeSingle();

  let reservationStatus: string | null = null;
  if (event?.reservation_id) {
    const { data: res } = await supabase
      .from('reservations')
      .select('status')
      .eq('id', event.reservation_id)
      .maybeSingle();
    reservationStatus = res?.status || null;
  }

  const finish = async (status: string, error: string | null = null) => {
    await supabase
      .from('reservation_notifications')
      .update({ status, last_error: error, lease_until: null, claim_token: null })
      .eq('id', jobId)
      .eq('claim_token', token);
  };

  if (claimed.audience === 'customer' && event) {
    if ((event.kind === 'received' && reservationStatus !== 'pending') ||
        (event.kind === 'confirmed' && reservationStatus !== 'confirmed')) {
      await finish('superseded');
      return true;
    }
  }

  if (claimed.first_attempt_at && Date.now() - new Date(claimed.first_attempt_at).getTime() > 23 * 3600000) {
    await finish('failed', 'delivery_uncertain_expired');
    return true;
  }

  if (claimed.attempts > MAX_ATTEMPTS) {
    await finish('failed', 'attempts_exhausted');
    return true;
  }

  if (!claimed.recipient || !providerConfigured()) {
    await finish('blocked', !claimed.recipient ? 'recipient_missing' : 'provider_missing');
    return true;
  }

  // SMTP dispatch
  let providerId: string | null = null;
  let sendError: string | null = null;
  try {
    providerId = await send(claimed.recipient, claimed.payload?.message, `reservation/${jobId}`, undefined, claimed.payload?.from);
  } catch (e) {
    sendError = e instanceof Error && /^(provider_(missing|uncertain|auth_failed|timeout|rejected))$/.test(e.message) ? e.message : 'provider_uncertain';
  }

  // Post-send update
  if (providerId) {
    await supabase
      .from('reservation_notifications')
      .update({
        status: 'accepted',
        last_error: null,
        provider_message_id: providerId,
        lease_until: null,
        claim_token: null,
      })
      .eq('id', jobId)
      .eq('claim_token', token);
  } else {
    const finalStatus = claimed.attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
    const nextAttempt = new Date(Date.now() + backoffSeconds(claimed.attempts) * 1000).toISOString();
    await supabase
      .from('reservation_notifications')
      .update({
        status: finalStatus,
        last_error: sendError,
        next_attempt_at: nextAttempt,
        lease_until: null,
        claim_token: null,
      })
      .eq('id', jobId)
      .eq('claim_token', token);
  }

  return true;
}
