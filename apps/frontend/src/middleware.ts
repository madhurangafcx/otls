import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Next.js middleware — runs on every request (excluding static assets).
// Two jobs:
//   1. Refresh the Supabase session cookies if the access token is near expiry.
//      Without this, users get silently logged out when their 1h token expires.
//   2. Gate access to protected routes. If a user isn't authenticated and tries
//      to visit /my-courses or /admin/*, redirect to /login.

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/auth/callback',
  // Marketing placeholder pages (app/(marketing)/*): must be reachable unauthed
  // so the Footer links don't bounce anonymous visitors to /login.
  '/about',
  '/privacy',
  '/terms',
  '/contact',
];
// Prefixes that anyone (authed or not) can access. `/courses` is the public
// catalog + course detail pages.
const PUBLIC_PREFIXES = ['/courses'];
const ADMIN_PREFIX = '/admin';

export async function middleware(request: NextRequest) {
  // Start with a pass-through response. We may mutate its cookies if Supabase
  // decides to refresh the session. We may also return a redirect instead.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // getUser() forces a real token check + possibly refreshes the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  // Not authenticated + protected route → redirect to /login
  if (!user && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated + on /admin/* → verify role by calling our backend.
  // We keep this lightweight: only gate at the route level here; individual
  // routes re-check server-side. Three-layer authz per blueprint.
  if (user && pathname.startsWith(ADMIN_PREFIX)) {
    // The JWT's user_metadata doesn't carry role (we read it from profiles
    // in the backend). Here we just ensure authenticated; admin endpoints
    // enforce on the backend via requireRole('admin').
    // For a UI-level block we'd fetch /api/auth/me — skipped for v0.1 to keep
    // middleware fast. Route components can do this check if needed.
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
