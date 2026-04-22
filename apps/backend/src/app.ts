import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { env } from './config/env';
import { healthRoutes } from './routes/health';

export const app = new Hono();

// ── Middleware chain
app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// ── Routes
app.route('/health', healthRoutes);

// ── Root
app.get('/', (c) =>
  c.json({
    service: 'otls-backend',
    version: '0.1.0',
    docs: 'See docs/blueprint.md §10',
  })
);

// ── Uniform error envelope
app.onError((err, c) => {
  console.error('[error]', err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      },
    },
    500
  );
});

// ── 404
app.notFound((c) =>
  c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `Route not found: ${c.req.method} ${c.req.path}`,
      },
    },
    404
  )
);
