import type { JWTPayload } from 'jose';

// Augments Hono's ContextVariableMap so c.get/c.set have real types for our
// middleware-populated values. Without this, c.get('userId') returns `never`
// and every caller has to `as string` assert — which defeats `strict` mode.
//
// Keep this in sync with what middleware actually sets.

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    tokenPayload: JWTPayload & {
      sub: string;
      email?: string;
      role?: 'admin' | 'student';
    };
    userRole: 'admin' | 'student';
    requestId: string;
  }
}
