'use client';

import { createBrowserClient } from '@supabase/ssr';

// Browser Supabase client. Reads/writes HTTP-only cookies that the Next.js
// middleware + Server Components also see. We use this for two things:
//
//   1. After our backend returns a session (on login/register), we call
//      supabase.auth.setSession({...}) to persist cookies. From that point
//      the session exists in cookies; Server Components + middleware can read it.
//
//   2. Google OAuth — supabase.auth.signInWithOAuth() kicks off the redirect
//      dance (handled by src/app/(auth)/callback/route.ts on return).
//
// We do NOT use this for direct data queries — that goes through our Bun
// backend so authz + rate limiting + logs live in one place.
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
