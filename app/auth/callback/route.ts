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

  console.log('[OAuth Callback] Starting OAuth callback process');
  console.log(`[OAuth Callback] Code: ${code ? 'Present' : 'Missing'}`);
  console.log(`[OAuth Callback] Client IP: ${clientIP}`);

  if (code) {
    console.log('[OAuth Callback] Exchanging code for session...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[OAuth Callback] OAuth exchange error:', error.message);
    } else {
      console.log('[OAuth Callback] OAuth exchange successful');
      console.log(`[OAuth Callback] User ID: ${data.user?.id}`);
      console.log(`[OAuth Callback] User Email: ${data.user?.email}`);
    }

    if (!error && data.user) {
      const email = data.user.email;
      console.log(`[OAuth Callback] Processing login for: ${email}`);

      // Check IP-based rate limiting
      const { data: ipLimitData } = await supabase.rpc('is_ip_rate_limited', {
        client_ip: clientIP
      });

      if (ipLimitData?.[0]?.is_limited) {
        const minutesRemaining = ipLimitData[0].minutes_remaining;
        
        // Log blocked attempt
        await supabase.rpc('log_login_attempt', {
          user_email: email || 'unknown',
          is_success: false,
          client_ip: clientIP,
          client_user_agent: userAgent,
          error_msg: `IP rate limited. Try again in ${minutesRemaining} minutes`,
          is_domain_valid: true
        });

        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/login?error=rate_limited&minutes=${minutesRemaining}`
        );
      }

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

      // Check account-based rate limiting
      const { data: accountLimitData } = await supabase.rpc('is_account_rate_limited', {
        user_email: email
      });

      if (accountLimitData?.[0]?.is_limited) {
        const minutesRemaining = accountLimitData[0].minutes_remaining;
        
        // Log blocked attempt
        await supabase.rpc('log_login_attempt', {
          user_email: email,
          is_success: false,
          client_ip: clientIP,
          client_user_agent: userAgent,
          error_msg: `Account rate limited. Try again in ${minutesRemaining} minutes`,
          is_domain_valid: true
        });

        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/login?error=account_locked&minutes=${minutesRemaining}`
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

      // Fetch user profile to verify role
      console.log(`[OAuth Callback] Fetching user profile for ID: ${data.user.id}`);
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, email, role, name')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('[OAuth Callback] Error fetching profile:', profileError.message);
        console.log(`[OAuth Callback] User may not exist in users table. Creating/updating...`);
        
        // If user doesn't exist, create a record
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email,
            role: 'user',
            name: data.user.user_metadata?.name || email?.split('@')[0] || 'User',
            id_number: data.user.user_metadata?.id_number || 'N/A'
          })
          .select()
          .single();

        if (insertError) {
          console.error('[OAuth Callback] Error creating user record:', insertError.message);
        } else {
          console.log('[OAuth Callback] User record created successfully');
        }
      } else {
        console.log('[OAuth Callback] User profile found:');
        console.log(`  - ID: ${profile?.id}`);
        console.log(`  - Email: ${profile?.email}`);
        console.log(`  - Role: ${profile?.role}`);
        console.log(`  - Name: ${profile?.name}`);
      }

      // Create audit log entry for successful login
      await supabase.from('audit_logs').insert({
        user_id: data.user.id,
        action: 'user_login',
        resource_type: 'auth',
        resource_id: data.user.id,
        details: {
          email: email,
          login_method: 'oauth_google',
          ip_address: clientIP,
          user_role: profile?.role || 'user'
        },
        ip_address: clientIP
      });

      console.log('[OAuth Callback] Login successful, redirecting to dashboard');
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

