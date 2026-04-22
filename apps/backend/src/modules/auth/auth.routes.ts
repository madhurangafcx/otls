import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../middleware/auth';
import { redactEmail } from '../../lib/redact';
import { AuthError, authService } from './auth.service';
import { loginInputSchema, registerInputSchema } from './auth.schemas';

export const authRoutes = new Hono();

// Maps AuthError.code → HTTP status
const AUTH_ERROR_STATUS = {
  EMAIL_TAKEN: 409,
  INVALID_CREDENTIALS: 401,
  WEAK_PASSWORD: 400,
  PROFILE_NOT_FOUND: 404,
  SUPABASE_ERROR: 500,
} as const;

function handleAuthError(err: unknown) {
  if (err instanceof AuthError) {
    return {
      status: AUTH_ERROR_STATUS[err.code],
      body: { error: { code: err.code, message: err.message } },
    };
  }
  const msg = err instanceof Error ? err.message : 'Unknown error';
  return {
    status: 500 as const,
    body: { error: { code: 'INTERNAL_ERROR', message: msg } },
  };
}

// ── POST /api/auth/register (public)
authRoutes.post('/register', zValidator('json', registerInputSchema), async (c) => {
  const input = c.req.valid('json');
  try {
    const { user, session } = await authService.register(input);
    console.log(`[auth.register] success email=${redactEmail(input.email)} userId=${user.id}`);
    return c.json(
      {
        data: {
          user: { id: user.id, email: user.email },
          session,
        },
      },
      201
    );
  } catch (err) {
    const { status, body } = handleAuthError(err);
    console.warn(`[auth.register] failed email=${redactEmail(input.email)} status=${status}`);
    return c.json(body, status);
  }
});

// ── POST /api/auth/login (public)
authRoutes.post('/login', zValidator('json', loginInputSchema), async (c) => {
  const input = c.req.valid('json');
  try {
    const { user, session } = await authService.login(input);
    console.log(`[auth.login] success email=${redactEmail(input.email)} userId=${user.id}`);
    return c.json({
      data: {
        user: { id: user.id, email: user.email },
        session,
      },
    });
  } catch (err) {
    const { status, body } = handleAuthError(err);
    console.warn(`[auth.login] failed email=${redactEmail(input.email)} status=${status}`);
    return c.json(body, status);
  }
});

// ── POST /api/auth/logout (any authenticated user)
authRoutes.post('/logout', authMiddleware, async (c) => {
  const authHeader = c.req.header('Authorization')!;
  const token = authHeader.slice('Bearer '.length);

  try {
    await authService.logout(token);
    return c.json({ data: { ok: true } });
  } catch (err) {
    const { status, body } = handleAuthError(err);
    return c.json(body, status);
  }
});

// ── GET /api/auth/me (any authenticated user)
authRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  try {
    const profile = await authService.getProfile(userId);
    return c.json({ data: profile });
  } catch (err) {
    const { status, body } = handleAuthError(err);
    return c.json(body, status);
  }
});
