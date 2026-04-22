import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { supabase } from '../../config/supabase';
import { semestersService, SemestersServiceError } from './semesters.service';
import { createSemesterSchema, updateSemesterSchema } from './semesters.schemas';

export const semestersRoutes = new Hono();

const STATUS_MAP = {
  NOT_FOUND: 404,
  COURSE_NOT_FOUND: 404,
  FORBIDDEN_NOT_ENROLLED: 403,
} as const;

function handleErr(err: unknown) {
  if (err instanceof SemestersServiceError) {
    return {
      status: STATUS_MAP[err.code],
      body: { error: { code: err.code, message: err.message } },
    };
  }
  const msg = err instanceof Error ? err.message : 'Unknown error';
  return { status: 500 as const, body: { error: { code: 'INTERNAL_ERROR', message: msg } } };
}

// ── GET /api/semesters/:id — approved-student or admin
// Admin sees without an enrollment check. Student must be approved-enrolled
// for the course. Also logs a semester_views row for students (Pillar 1 telemetry).
semestersRoutes.get('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId') as string;

  try {
    // Check role first. requireRole isn't easy to use conditionally, so we
    // do the same DB lookup inline.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'admin') {
      const semester = await semestersService.get(id);
      return c.json({ data: semester });
    }

    const semester = await semestersService.getAsStudent(id, userId);
    return c.json({ data: semester });
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});

// ── POST /api/semesters — admin create
semestersRoutes.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', createSemesterSchema),
  async (c) => {
    const input = c.req.valid('json');
    try {
      const semester = await semestersService.create(input);
      return c.json({ data: semester }, 201);
    } catch (err) {
      const { status, body } = handleErr(err);
      return c.json(body, status);
    }
  }
);

// ── PATCH /api/semesters/:id — admin update
semestersRoutes.patch(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  zValidator('json', updateSemesterSchema),
  async (c) => {
    const id = c.req.param('id');
    const patch = c.req.valid('json');
    try {
      const semester = await semestersService.update(id, patch);
      return c.json({ data: semester });
    } catch (err) {
      const { status, body } = handleErr(err);
      return c.json(body, status);
    }
  }
);

// ── DELETE /api/semesters/:id — admin delete
semestersRoutes.delete('/:id', authMiddleware, requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  try {
    await semestersService.delete(id);
    return c.body(null, 204);
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});

// ── GET /api/courses/:courseId/semesters — list semesters for a course
// Mounted on the courses router; the logic lives here.
export const courseSemestersRoute = new Hono();

// ── GET /api/courses/:courseId/semester-titles — public, title-only list
// For the course-detail "locked" preview. Returns only { id, title, sort_order }
// so non-enrolled visitors can see what they'll get. Gated to published courses
// only; the full GET /api/courses/:courseId/semesters endpoint below stays
// enrollment-gated and still owns youtube_url / description exposure.
courseSemestersRoute.get('/:courseId/semester-titles', async (c) => {
  const courseId = c.req.param('courseId');
  try {
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id, status')
      .eq('id', courseId)
      .maybeSingle();
    if (courseErr) throw courseErr;
    if (!course || course.status !== 'published') {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Course not found' } },
        404
      );
    }
    const all = await semestersService.listByCourse(courseId);
    const titles = all.map((s) => ({
      id: s.id,
      title: s.title,
      sort_order: s.sort_order,
    }));
    return c.json({ data: titles });
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});

courseSemestersRoute.get('/:courseId/semesters', authMiddleware, async (c) => {
  const courseId = c.req.param('courseId');
  const userId = c.get('userId') as string;

  try {
    // Admin sees all semesters. Student must be approved-enrolled in the course.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.role === 'admin';

    if (!isAdmin) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', userId)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();

      if (!enrollment) {
        return c.json(
          {
            error: {
              code: 'FORBIDDEN_NOT_ENROLLED',
              message: 'You must be approved-enrolled to see this course\'s semesters',
            },
          },
          403
        );
      }
    }

    const semesters = await semestersService.listByCourse(courseId);
    return c.json({ data: semesters });
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});
