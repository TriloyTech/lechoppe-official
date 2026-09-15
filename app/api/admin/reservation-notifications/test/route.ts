import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/postgres/db';
import { guard, failure } from '@/lib/reservations/admin';
import { SETTING_KEY } from '@/lib/reservations/service';
import { renderReservationTest, sendReservationEmail } from '@/lib/email/reservation';
export async function POST(req:NextRequest) {
 const denied=guard(req); if(denied)return denied;
 try {
 const limit=await pool.query(`INSERT INTO reservation_notification_test_limits(key,last_attempt_at) VALUES('test',now()) ON CONFLICT(key) DO UPDATE SET last_attempt_at=now() WHERE reservation_notification_test_limits.last_attempt_at<now()-interval '60 seconds' RETURNING key`);
 if(!limit.rowCount)throw new Error('rate_limited');
 const result=await pool.query('SELECT value FROM site_settings WHERE key=$1',[SETTING_KEY]);
 const recipient=result.rows[0]?.value?.recipient; if(!recipient)throw new Error('invalid_recipient_missing');
 const id=await sendReservationEmail(recipient,renderReservationTest(),`reservation-test/${randomUUID()}`);
 return NextResponse.json({accepted:true,providerMessageId:id});
 }catch(e){return failure(e);}
}
