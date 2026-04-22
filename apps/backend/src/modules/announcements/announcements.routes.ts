import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { supabase } from '../../config/supabase';
import { authMiddleware, requireRole } from '../../middleware/auth';
import {
  createAnnouncementSchema,
  listByCourseQuerySchema,
  updateAnnouncementSchema,
} from './announcements.schemas';
import { AnnouncementsServiceError, announcementsService } from './announcements.service';

export const announcementsRoutes = new Hono();

const STATUS_MAP = {
  NOT_FOUND: 404,
  COURSE_NOT_FOUND: 404,
  FORBIDDEN_NOT_ENROLLED: 403,
  PIN_CONFLICT: 409,
} as const;

function handleErr(err: unknown) {
  if (err instanceof AnnouncementsServiceError) {
    return {
      status: STATUS_MAP[err.code],
      body: { error: { code: err.code, message: err.message } },
    };
  }
  const msg = err instanceof Error ? err.message : 'Unknown error';
  return {
    status: 500 as const,
    body: { error: { code: 'INTERNAL_ERROR', message: msg } },
  };
}

// Role helper — same inline pattern the other routes use.
async function resolveRole(userId: string): Promise<'admin' | 'student'> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin' ? 'admin' : 'student';
}

// ── GET /api/announcements/overview — student's per-course unread counts + recents.
// Mounted BEFORE /:id so 'overview' isn't parsed as a UUID param.
announcementsRoutes.get('/overview', authMiddleware, async (c) => {
  const userId = c.get('userId');
  try {
    const rows = await announcementsService.overviewForStudent(userId);
    return c.json({ data: rows });
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});

// ── POST /api/announcements — admin create
announcementsRoutes.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', createAnnouncementSchema),
  async (c) => {
    const adminId = c.get('userId');
    const input = c.req.valid('json');
    try {
      const row = await announcementsService.create(adminId, input);
      return c.json({ data: row }, 201);
    } catch (err) {
      const { status, body } = handleErr(err);
      return c.json(body, status);
    }
  }
);

// ── GET /api/announcements/:id — single fetch (admin or approved-enrolled student).
// Backend RLS would also filter student reads to their enrolled courses, but
// service-role bypasses RLS, so we re-enforce here.
announcementsRoutes.get('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  try {
    const row = await announcementsService.get(id);
    const role = await resolveRole(userId);
    if (role !== 'admin') {
      const { data } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', userId)
        .eq('course_id', row.course_id)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();
      if (!data) {
        return c.json(
          { error: { code: 'FORBIDDEN_NOT_ENROLLED', message: 'Not allowed' } },
          403
        );
      }
    }
    return c.json({ data: row });
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});

// ── PATCH /api/announcements/:id — admin edit (incl. pin toggle)
announcementsRoutes.patch(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', updateAnnouncementSchema),
  async (c) => {
    const id = c.req.param('id');
    const patch = c.req.valid('json');
    try {
      const row = await announcementsService.update(id, patch);
      return c.json({ data: row });
    } catch (err) {
      const { status, body } = handleErr(err);
      return c.json(body, status);
    }
  }
);

// ── DELETE /api/announcements/:id — admin soft delete (sets deleted_at)
announcementsRoutes.delete('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  try {
    await announcementsService.softDelete(id);
    return c.body(null, 204);
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});

// ── GET /api/courses/:courseId/announcements — mounted on the courses path.
// Admin sees all; approved-enrolled students see + get marked-read as a side
// effect on page 1 (the act of loading the feed counts as reading it).
export const courseAnnouncementsRoute = new Hono();

courseAnnouncementsRoute.get(
  '/:courseId/announcements',
  authMiddleware,
  zValidator('query', listByCourseQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const courseId = c.req.param('courseId');
    const { limit, cursor } = c.req.valid('query');

    try {
      const role = await resolveRole(userId);

      if (role !== 'admin') {
        const { data } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', userId)
          .eq('course_id', courseId)
          .eq('status', 'approved')
          .limit(1)
          .maybeSingle();
        if (!data) {
          return c.json(
            {
              error: {
                code: 'FORBIDDEN_NOT_ENROLLED',
                message: 'You must be approved-enrolled to read announcements',
              },
            },
            403
          );
        }
      }

      const { rows, next_cursor } = await announcementsService.listByCourse(
        courseId,
        limit,
        cursor
      );

      // Mark-read side effect — only for students, only on page 1 (no cursor).
      // Page 1 represents "loaded the feed"; subsequent pages are scrolling
      // back through history and shouldn't re-mark.
      if (role !== 'admin' && !cursor) {
        void announcementsService.markReadForStudent(userId, courseId);
      }

      return c.json({ data: rows, pagination: { next_cursor } });
    } catch (err) {
      const { status, body } = handleErr(err);
      return c.json(body, status);
    }
  }
);
