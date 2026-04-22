import type { MiddlewareHandler } from 'hono';

// CEO-review amendment: every request gets a UUID at CORS layer. Stored on
// Hono context for log correlation, returned to client as X-Request-Id so
// support flows can tie a user complaint to a specific backend log.
//
// If the client sends an X-Request-Id header (e.g., from Sentry breadcrumb
// or a proxy), we trust it so the same ID spans frontend → backend in logs.
export const requestId: MiddlewareHandler = async (c, next) => {
  const incoming = c.req.header('X-Request-Id');
  // Accept incoming IDs but enforce sane length to avoid log-injection surprises
  const id =
    incoming && incoming.length > 0 && incoming.length <= 128
      ? incoming
      : crypto.randomUUID();

  c.set('requestId', id);
  c.header('X-Request-Id', id);
  await next();
};
