import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Helper function to get client IP
function getClientIP(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const supabase = await createClient();
  
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const email = data.user.email;

      // Enforce @dlsu.edu.ph domain
      if (!email?.endsWith('@dlsu.edu.ph')) {
        // Log failed login attempt due to invalid domain
        await supabase.rpc('log_login_attempt', {
          user_email: email || 'unknown',
          is_success: false,
          client_ip: clientIP,
          client_user_agent: userAgent,
          error_msg: 'Invalid domain - not @dlsu.edu.ph',
          is_domain_valid: false
        });

        // Sign out user
        await supabase.auth.signOut();

        // Redirect to login with error
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/login?error=invalid_domain`
        );
      }

      // Log successful login attempt
      await supabase.rpc('log_login_attempt', {
        user_email: email,
        is_success: true,
        client_ip: clientIP,
        client_user_agent: userAgent,
        error_msg: null,
        is_domain_valid: true
      });

      // Update user login status
      await supabase.rpc('update_user_login_status', {
        user_id: data.user.id,
        is_success: true
      });

      // Create audit log entry for successful login
      await supabase.from('audit_logs').insert({
        user_id: data.user.id,
        action: 'user_login',
        resource_type: 'auth',
        resource_id: data.user.id,
        details: {
          email: email,
          login_method: 'oauth_google',
          ip_address: clientIP
        },
        ip_address: clientIP
      });

      // Redirect to dashboard on success
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
    } else {
      // Log failed OAuth exchange
      await supabase.rpc('log_login_attempt', {
        user_email: 'unknown',
        is_success: false,
        client_ip: clientIP,
        client_user_agent: userAgent,
        error_msg: error?.message || 'OAuth code exchange failed',
        is_domain_valid: true
      });
    }
  } else {
    // Log failed attempt - no code
    await supabase.rpc('log_login_attempt', {
      user_email: 'unknown',
      is_success: false,
      client_ip: clientIP,
      client_user_agent: userAgent,
      error_msg: 'No authorization code provided',
      is_domain_valid: true
    });
  }

  // Redirect to login on error
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`);
}

