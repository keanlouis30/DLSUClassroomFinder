import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    await supabase.from('audit_logs').insert({
      user_id: null, // unknown user
      action: 'unauthenticated_access',
      resource_type: 'page',
      resource_id: request.nextUrl.pathname,
      details: { reason: 'not logged in' },
      ip_address: request.ip || null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // If authenticated and trying to access auth pages, redirect to dashboard
  if (user && request.nextUrl.pathname.startsWith('/auth/login')) {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'redirect_from_login',
      resource_type: 'page',
      resource_id: request.nextUrl.pathname,
      details: { reason: 'already logged in' },
      ip_address: request.ip || null,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Get user profile to check role
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Restrict admin routes
    if (request.nextUrl.pathname.startsWith('/admin') && profile?.role !== 'admin') {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'unauthorized_access',
        resource_type: 'page',
        resource_id: request.nextUrl.pathname,
        details: { reason: 'not admin' },
        ip_address: request.ip || null,
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Restrict manager routes
    if (request.nextUrl.pathname.startsWith('/manager') && 
        !['manager', 'admin'].includes(profile?.role || '')) {
      
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'unauthorized_access',
            resource_type: 'page',
            resource_id: request.nextUrl.pathname,
            details: { reason: 'not manager/admin' },
            ip_address: request.ip || null,
            timestamp: new Date().toISOString(),
          });
      
          return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/manager/:path*',
    '/auth/login',
  ],
};

