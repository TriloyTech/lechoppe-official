import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/postgres/db';
import { guard, failure } from '@/lib/reservations/admin';
import { uuid } from '@/lib/reservations/model';
export async function POST(req:NextRequest) {
 const denied=guard(req); if(denied)return denied;
 try {
 const {id}=await req.json(); if(!uuid(id))throw new Error('invalid_id');
 const result=await pool.query(`UPDATE reservation_notifications SET status='pending',next_attempt_at=now(),last_error=NULL WHERE id=$1 AND status IN ('blocked','failed') AND recipient IS NOT NULL AND attempts<6 AND (first_attempt_at IS NULL OR first_attempt_at>now()-interval '23 hours') AND last_error IS DISTINCT FROM 'site_url_missing' RETURNING id`,[id]);
 if(!result.rowCount)throw new Error('retry_unsafe');
 return NextResponse.json({queued:true});
 }catch(e){return failure(e);}
}
