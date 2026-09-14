import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/postgres/db';
import { verifyBotChallenge } from '@/lib/takeaway/security';
import { validateSubmission } from '@/lib/reservations/model';
import { submitReservation } from '@/lib/reservations/service';
export async function POST(req:NextRequest) {
 try {
  const body = await req.json();
  if (!body || typeof body!=='object') throw new Error('invalid_fields');
  if (body.website) return NextResponse.json({error:'bot_invalid'},{status:400});
  const input=validateSubmission(body,new Date(),true);
  const id=await submitReservation(pool,input,()=>{ validateSubmission(body); if (!Number.isFinite(body.form_started) || Date.now()-body.form_started<2000) return false; const check=verifyBotChallenge(body.captcha_token,body.captcha_answer,{consume:false}); return check.valid ? check.challengeId! : false; });
  return NextResponse.json({success:true,reference:id, status:'received'});
 } catch(e) {
  const code=e instanceof Error ? e.message : '';
  const status=code==='rate_limited'?429:code==='idempotency_conflict'?409:['invalid_email','invalid_fields','invalid_key','bot_invalid'].includes(code)?400:500;
  return NextResponse.json({error:status===500?'server_error':code},{status});
 }
}
