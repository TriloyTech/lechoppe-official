import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/postgres/db';
import { guard, failure } from '@/lib/reservations/admin';
import { reservationColumns } from '@/lib/reservations/service';
export async function GET(req:NextRequest) {
 const denied=guard(req); if(denied)return denied;
 try { const result=await pool.query(`SELECT ${reservationColumns} FROM reservations ORDER BY date,time`); const problems=await pool.query("SELECT count(*)::int AS count FROM reservation_notifications WHERE status IN ('blocked','failed') OR last_error IS NOT NULL"); return NextResponse.json({reservations:result.rows,problems:problems.rows[0].count},{headers:{'Cache-Control':'no-store'}}); } catch(e){return failure(e);}
}
