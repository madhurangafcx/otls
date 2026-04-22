import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Server-side Supabase client for Server Components, Server Actions, and
// Route Handlers. Reads the same cookies the browser client + middleware write.
//
// We use this for two things:
//
//   1. Reading the current session — so pages can show "Logged in as..." or
//      gate themselves server-side before rendering.
//
//   2. The OAuth callback Route Handler exchanges the authorization code for
//      a session and writes cookies via this client.
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll() throws in Server Components (cookies() there is read-only).
            // The Next.js middleware writes on every request, so as long as
            // middleware is running, cookies stay fresh. Safe to swallow here.
          }
        },
      },
    }
  );
}
