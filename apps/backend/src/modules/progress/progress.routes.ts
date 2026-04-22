import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../middleware/auth';
import { progressService } from './progress.service';

export const progressRoutes = new Hono();

const courseQuerySchema = z.object({
  course_id: z.string().uuid(),
});

// ── GET /api/progress/overview — all approved courses
// Mounted before /?course_id so routing is predictable.
progressRoutes.get('/overview', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  try {
    const rows = await progressService.overview(userId);
    return c.json({ data: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: { code: 'INTERNAL_ERROR', message: msg } }, 500);
  }
});

// ── GET /api/progress?course_id=X — single-course progress
progressRoutes.get(
  '/',
  authMiddleware,
  zValidator('query', courseQuerySchema),
  async (c) => {
    const userId = c.get('userId') as string;
    const { course_id } = c.req.valid('query');
    try {
      const summary = await progressService.forCourse(userId, course_id);
      return c.json({ data: summary });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: { code: 'INTERNAL_ERROR', message: msg } }, 500);
    }
  }
);
