import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    // Allow /admin/login to be accessed
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    // If no cookie or invalid session, redirect to login
    if (!isAdminRequest(request)) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
