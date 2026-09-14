import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/postgres/db';
import { guard, failure } from '@/lib/reservations/admin';
import { uuid } from '@/lib/reservations/model';
import { changeStatus } from '@/lib/reservations/service';
export async function POST(req:NextRequest,ctx:{params:Promise<{id:string}>}) {
 const denied=guard(req); if(denied)return denied;
 try {const {id}=await ctx.params; if(!uuid(id))throw new Error('invalid_id'); const body=await req.json(); return NextResponse.json(await changeStatus(pool,id,body.status,body.reason));}catch(e){return failure(e);}
}
