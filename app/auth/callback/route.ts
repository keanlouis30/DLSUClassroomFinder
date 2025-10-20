import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const email = data.user.email;

      // Enforce @dlsu.edu.ph domain
      if (!email?.endsWith('@dlsu.edu.ph')) {
        // Sign out user
        await supabase.auth.signOut();

        // Redirect to login with error
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/login?error=invalid_domain`
        );
      }

      // Redirect to dashboard on success
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
    }
  }

  // Redirect to login on error
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`);
}

