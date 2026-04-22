import { z } from 'zod';

// Zod-validated env at boot. If a required var is missing, the backend refuses
// to start with a clear error. This catches typo-level config bugs immediately
// instead of at first request.
//
// Local dev: values come from apps/backend/.env or apps/backend/.env.local
// Production: values come from Fly.io secrets (flyctl secrets set KEY=value)
// Not .strict() — Bun.env contains hundreds of system vars (PATH, HOME, SHELL,
// TERM, ...) that we don't care about. We only validate the keys we need; extras
// are ignored.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Optional: only set if your Supabase project uses legacy HS256 signing.
  // Check: https://<ref>.supabase.co/auth/v1/.well-known/jwks.json
  // If that URL returns {"keys":[...]}, leave this blank.
  SUPABASE_JWT_SECRET: z.string().optional(),

  // CORS
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // JWT
  JWT_ISSUER: z.string().url(),
  JWT_AUDIENCE: z.string().default('authenticated'),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),
  RATE_LIMIT_UPLOAD_MAX: z.coerce.number().default(10),

  // Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
});

const parsed = schema.safeParse(Bun.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  console.error('\nCheck apps/backend/.env against apps/backend/.env.example');
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
