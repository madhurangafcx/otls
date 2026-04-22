import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// Google OAuth returns here after the consent screen. Supabase ships a
// `?code=...` authorization code that we exchange for a session; @supabase/ssr
// writes the session cookies automatically during exchangeCodeForSession.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/my-courses';

  if (!code) {
    // No code — OAuth was cancelled or malformed
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('OAuth was cancelled')}`
    );
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
