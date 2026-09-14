import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '../admin/auth';
import { logServerError } from '../server/logError';
export function guard(req:NextRequest) {
 if (!isAdminRequest(req)) return NextResponse.json({error:'unauthorized'},{status:401});
 if (req.method!=='GET' && (req.headers.get('origin')!==req.nextUrl.origin || req.headers.get('sec-fetch-site')==='cross-site')) return NextResponse.json({error:'forbidden'},{status:403});
 return null;
}
export function failure(e:unknown) {
 const code=e instanceof Error?e.message:'';
 const status=code==='not_found'?404:code==='rate_limited'?429:code==='invalid_transition'||code==='retry_unsafe'?409:code.startsWith('invalid_')?400:code.startsWith('provider_')?502:500;
 if (status >= 500) logServerError('api.admin.reservations', e);
 return NextResponse.json({error:status===500?'server_error':code},{status});
}
