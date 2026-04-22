import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../../middleware/auth';
import {
  listEnrollmentsQuerySchema,
  requestEnrollmentSchema,
  reviewEnrollmentSchema,
} from './enrollments.schemas';
import { EnrollmentsServiceError, enrollmentsService } from './enrollments.service';

export const enrollmentsRoutes = new Hono();

const STATUS_MAP = {
  COURSE_NOT_FOUND: 404,
  COURSE_NOT_PUBLISHED: 422,
  ALREADY_REQUESTED: 409,
  NOT_FOUND: 404,
  INVALID_TRANSITION: 400,
} as const;

function handleErr(err: unknown) {
  if (err instanceof EnrollmentsServiceError) {
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

// ── GET /api/enrollments/me — student sees their own (all statuses)
// Mounted BEFORE /:id so 'me' isn't parsed as a UUID param.
enrollmentsRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  try {
    const list = await enrollmentsService.listForStudent(userId);
    return c.json({ data: list });
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});

// ── GET /api/enrollments — admin list, filter by course_id + status
// course_id optional: if omitted, returns cross-course enrollments with the
// course relation populated (used by the admin dashboard's "recent pending"
// section). When present, returns the per-course payload shape.
enrollmentsRoutes.get(
  '/',
  authMiddleware,
  requireRole('admin'),
  zValidator('query', listEnrollmentsQuerySchema),
  async (c) => {
    const { course_id, status, limit } = c.req.valid('query');
    try {
      if (course_id) {
        const list = await enrollmentsService.listForCourse(course_id, status);
        return c.json({ data: list });
      }
      const list = await enrollmentsService.listAll(status, limit ?? 20);
      return c.json({ data: list });
    } catch (err) {
      const { status: httpStatus, body } = handleErr(err);
      return c.json(body, httpStatus);
    }
  }
);

// ── POST /api/enrollments — student requests enrollment
enrollmentsRoutes.post(
  '/',
  authMiddleware,
  zValidator('json', requestEnrollmentSchema),
  async (c) => {
    const userId = c.get('userId') as string;
    const { course_id } = c.req.valid('json');
    try {
      const enrollment = await enrollmentsService.request(userId, course_id);
      return c.json({ data: enrollment }, 201);
    } catch (err) {
      const { status, body } = handleErr(err);
      return c.json(body, status);
    }
  }
);

// ── PATCH /api/enrollments/:id — admin approve/reject
enrollmentsRoutes.patch(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', reviewEnrollmentSchema),
  async (c) => {
    const adminId = c.get('userId') as string;
    const id = c.req.param('id');
    const { status } = c.req.valid('json');
    try {
      const enrollment = await enrollmentsService.review(id, adminId, status);
      return c.json({ data: enrollment });
    } catch (err) {
      const { status: httpStatus, body } = handleErr(err);
      return c.json(body, httpStatus);
    }
  }
);
