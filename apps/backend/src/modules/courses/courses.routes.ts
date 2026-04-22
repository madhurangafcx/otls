import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { supabase } from '../../config/supabase';
import { coursesService, CoursesServiceError } from './courses.service';
import {
  createCourseSchema,
  listCoursesQuerySchema,
  publishCourseSchema,
  updateCourseSchema,
} from './courses.schemas';

export const coursesRoutes = new Hono();

const STATUS_MAP = {
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  PUBLISH_REQUIRES_SEMESTERS: 422,
  PUBLISH_REQUIRES_YOUTUBE_URLS: 422,
} as const;

function handleErr(err: unknown) {
  if (err instanceof CoursesServiceError) {
    return {
      status: STATUS_MAP[err.code],
      body: { error: { code: err.code, message: err.message } },
    };
  }
  const msg = err instanceof Error ? err.message : 'Unknown error';
  return { status: 500 as const, body: { error: { code: 'INTERNAL_ERROR', message: msg } } };
}

// ── GET /api/courses — list courses
//   Students see only published; admins see all or filter by ?status=
// Auth is optional here so unauthenticated landing-page visitors can browse the
// public catalog. If a JWT IS present we check the role and serve accordingly.
coursesRoutes.get('/', zValidator('query', listCoursesQuerySchema), async (c) => {
  const query = c.req.valid('query');

  // Optional auth: if Authorization header present, use authMiddleware-equivalent
  // role lookup; else treat as anonymous (student-equivalent view).
  let isAdmin = false;
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      // Minimal inline check: use the anon client to get the user from the JWT
      const token = authHeader.slice('Bearer '.length);
      const { data } = await supabase.auth.getUser(token);
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        isAdmin = profile?.role === 'admin';
      }
    } catch {
      // Invalid token on a public endpoint is non-fatal — fall through as anonymous
    }
  }

  try {
    const result = await coursesService.list(query, isAdmin);
    return c.json(result);
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});

// ── GET /api/courses/:id — get one course
coursesRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const course = await coursesService.get(id);
    // Non-admins only see published courses. Run the same optional-auth dance.
    if (course.status === 'draft') {
      const authHeader = c.req.header('Authorization');
      let isAdmin = false;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.slice('Bearer '.length);
          const { data } = await supabase.auth.getUser(token);
          if (data.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.user.id)
              .single();
            isAdmin = profile?.role === 'admin';
          }
        } catch {}
      }
      if (!isAdmin) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);
      }
    }
    return c.json({ data: course });
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});

// ── POST /api/courses — admin create
coursesRoutes.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', createCourseSchema),
  async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId') as string;
    try {
      const course = await coursesService.create(input, userId);
      return c.json({ data: course }, 201);
    } catch (err) {
      const { status, body } = handleErr(err);
      return c.json(body, status);
    }
  }
);

// ── PATCH /api/courses/:id — admin update title/description
coursesRoutes.patch(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', updateCourseSchema),
  async (c) => {
    const id = c.req.param('id');
    const patch = c.req.valid('json');
    try {
      const course = await coursesService.update(id, patch);
      return c.json({ data: course });
    } catch (err) {
      const { status, body } = handleErr(err);
      return c.json(body, status);
    }
  }
);

// ── PATCH /api/courses/:id/publish — admin toggle status
coursesRoutes.patch(
  '/:id/publish',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', publishCourseSchema),
  async (c) => {
    const id = c.req.param('id');
    const { status } = c.req.valid('json');
    try {
      const course = await coursesService.setStatus(id, status);
      return c.json({ data: course });
    } catch (err) {
      const { status: httpStatus, body } = handleErr(err);
      return c.json(body, httpStatus);
    }
  }
);

// ── DELETE /api/courses/:id — admin delete (cascades)
coursesRoutes.delete('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  try {
    await coursesService.delete(id);
    return c.body(null, 204);
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});
