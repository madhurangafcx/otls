import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../../middleware/auth';
import {
  enrollmentsService,
  EnrollmentsServiceError,
} from './enrollments.service';
import {
  listEnrollmentsQuerySchema,
  requestEnrollmentSchema,
  reviewEnrollmentSchema,
} from './enrollments.schemas';

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
  return { status: 500 as const, body: { error: { code: 'INTERNAL_ERROR', message: msg } } };
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
enrollmentsRoutes.get(
  '/',
  authMiddleware,
  requireRole('admin'),
  zValidator('query', listEnrollmentsQuerySchema),
  async (c) => {
    const { course_id, status } = c.req.valid('query');
    if (!course_id) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'course_id query param required' } },
        400
      );
    }
    try {
      const list = await enrollmentsService.listForCourse(course_id, status);
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
