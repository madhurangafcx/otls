import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { env } from './config/env';
import { requestId } from './middleware/request-id';
import { healthRoutes } from './routes/health';
import { authRoutes } from './modules/auth/auth.routes';
import { coursesRoutes } from './modules/courses/courses.routes';
import {
  semestersRoutes,
  courseSemestersRoute,
} from './modules/semesters/semesters.routes';

export const app = new Hono();

// ── Middleware chain (order matters)
// 1. requestId first so every log line + error has a correlation ID
app.use('*', requestId);
// 2. request logger
app.use('*', logger());
// 3. security headers
app.use('*', secureHeaders());
// 4. CORS (credentials for cookie flows later)
app.use(
  '*',
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposeHeaders: ['X-Request-Id'],
  })
);

// ── Routes
app.route('/health', healthRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/courses', coursesRoutes);
// Mounted as /api/courses/:courseId/semesters so the URL reads naturally
app.route('/api/courses', courseSemestersRoute);
app.route('/api/semesters', semestersRoutes);

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
  const requestId = c.get('requestId') as string | undefined;
  console.error(`[error] request_id=${requestId}`, err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message:
          env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        ...(requestId ? { request_id: requestId } : {}),
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
