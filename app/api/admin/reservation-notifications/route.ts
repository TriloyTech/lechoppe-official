import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/postgres/db';
import { guard, failure } from '@/lib/reservations/admin';
import { emailAddress } from '@/lib/reservations/model';
import { SETTING_KEY } from '@/lib/reservations/service';
import { providerConfigured } from '@/lib/email/reservation';
export async function GET(req:NextRequest) {
 const denied=guard(req); if(denied)return denied;
 try {
 const [settings,jobs]=await Promise.all([
 pool.query('SELECT value FROM site_settings WHERE key=$1',[SETTING_KEY]),
 pool.query(`SELECT n.id,e.reservation_id,e.kind,n.audience,n.status,n.attempts,n.last_error,n.provider_message_id,n.next_attempt_at,
 (n.recipient IS NOT NULL AND n.status IN ('blocked','failed') AND n.attempts<6 AND (n.first_attempt_at IS NULL OR n.first_attempt_at>now()-interval '23 hours') AND n.last_error IS DISTINCT FROM 'site_url_missing') AS retryable
 FROM reservation_notifications n JOIN reservation_events e ON e.id=n.event_id WHERE n.status IN ('blocked','failed') OR n.last_error IS NOT NULL ORDER BY n.created_at DESC LIMIT 50`)]);
 return NextResponse.json({recipient:settings.rows[0]?.value?.recipient || '',providerConfigured:providerConfigured(),siteUrlConfigured:Boolean(process.env.SITE_URL),problems:jobs.rows},{headers:{'Cache-Control':'no-store'}});
 } catch(e){return failure(e);}
}
export async function PUT(req:NextRequest) {
 const denied=guard(req); if(denied)return denied;
 try {const body=await req.json(); const recipient=body.recipient===''?'':emailAddress(body.recipient); await pool.query(`INSERT INTO site_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`,[SETTING_KEY,JSON.stringify({recipient})]); return NextResponse.json({saved:true});}catch(e){return failure(e);}
}
