import type { MiddlewareHandler } from 'hono';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../config/env';

// Supabase JWT verification via JWKS.
//
// CEO-review amendment: stale-while-revalidate JWKS caching so a brief Supabase
// Auth outage doesn't kill every authenticated request.
//   cooldownDuration — min time between cache refetches on miss
//   cacheMaxAge      — treat cached keys as fresh for this long
// If Supabase Auth is temporarily unreachable, `jose` keeps serving requests
// with the last-known keys rather than failing open OR hard-rejecting.
const JWKS = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
  {
    cooldownDuration: 60_000, // 1 minute between refetches
    cacheMaxAge: 24 * 60 * 60 * 1000, // 24h cache window
    timeoutDuration: 5_000, // 5s per JWKS fetch
  }
);

export type AuthenticatedPayload = JWTPayload & {
  sub: string; // user UUID (auth.users.id)
  email?: string;
  role?: 'admin' | 'student';
};

// Verifies the bearer JWT. Sets `userId` and `tokenPayload` on context.
// On invalid/missing token: 401 with uniform error envelope.
//
// Role on context is whatever the JWT claims (from profiles via
// supabase auth hooks, OR 'student' as safe default). The authoritative role
// check for admin endpoints lives in requireRole() below, which re-reads from
// profiles for every admin-gated request — defense in depth.
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' } },
      401
    );
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    if (!payload.sub) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Token missing subject' } },
        401
      );
    }

    c.set('userId', payload.sub);
    c.set('tokenPayload', payload as AuthenticatedPayload);
    await next();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid token';
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: msg } },
      401
    );
  }
};

// Role gate. Placed AFTER authMiddleware in the middleware chain.
// Reads role from profiles every request (not from JWT claim) so admin
// promotion takes effect on the very next request without token rotation.
export function requireRole(required: 'admin' | 'student'): MiddlewareHandler {
  return async (c, next) => {
    const userId = c.get('userId') as string | undefined;
    if (!userId) {
      return c.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        401
      );
    }

    const { supabase } = await import('../config/supabase');
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Profile not found' } },
        403
      );
    }

    if (data.role !== required) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: `${required} role required`,
          },
        },
        403
      );
    }

    c.set('userRole', data.role);
    await next();
  };
}
