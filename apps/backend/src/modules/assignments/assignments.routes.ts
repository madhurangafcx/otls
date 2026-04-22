import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { supabase } from '../../config/supabase';
import { authMiddleware, requireRole } from '../../middleware/auth';
import {
  listAssignmentsQuerySchema,
  listMyAssignmentsQuerySchema,
  registerAssignmentSchema,
} from './assignments.schemas';
import { AssignmentsServiceError, assignmentsService } from './assignments.service';

export const assignmentsRoutes = new Hono();

const STATUS_MAP = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  FORBIDDEN_NOT_ENROLLED: 403,
  PATH_MISMATCH: 400,
  SEMESTER_NOT_FOUND: 404,
  OBJECT_NOT_FOUND: 422,
  INVALID_FILE_CONTENT: 422,
  STORAGE_SIGN_FAILED: 500,
} as const;

function handleErr(err: unknown) {
  if (err instanceof AssignmentsServiceError) {
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

// ── GET /api/assignments/me — student's own submissions
// Mounted BEFORE /:id so 'me' isn't parsed as a UUID.
assignmentsRoutes.get(
  '/me',
  authMiddleware,
  zValidator('query', listMyAssignmentsQuerySchema),
  async (c) => {
    const userId = c.get('userId') as string;
    const { semester_id } = c.req.valid('query');
    try {
      const rows = await assignmentsService.listMine(userId, semester_id);
      return c.json({ data: rows });
    } catch (err) {
      const { status, body } = handleErr(err);
      return c.json(body, status);
    }
  }
);

// ── GET /api/assignments — admin list, paginated + filterable
assignmentsRoutes.get(
  '/',
  authMiddleware,
  requireRole('admin'),
  zValidator('query', listAssignmentsQuerySchema),
  async (c) => {
    const { limit, cursor, course_id, semester_id, student_id } = c.req.valid('query');
    try {
      const { rows, next_cursor } = await assignmentsService.listForAdmin({
        limit,
        cursor,
        course_id,
        semester_id,
        student_id,
      });
      return c.json({ data: rows, pagination: { next_cursor } });
    } catch (err) {
      const { status, body } = handleErr(err);
      return c.json(body, status);
    }
  }
);

// ── POST /api/assignments — register a completed TUS upload.
// Client uploaded to Storage directly via TUS (user JWT + RLS). Here we verify
// enrollment, sniff magic bytes, insert row, upsert progress (blueprint §2.10+§2.11).
assignmentsRoutes.post(
  '/',
  authMiddleware,
  zValidator('json', registerAssignmentSchema),
  async (c) => {
    const studentId = c.get('userId') as string;
    const input = c.req.valid('json');
    try {
      const result = await assignmentsService.register({
        student_id: studentId,
        semester_id: input.semester_id,
        file_path: input.file_path,
        file_name: input.file_name,
        file_type: input.file_type,
      });
      return c.json({ data: result }, 201);
    } catch (err) {
      const { status, body } = handleErr(err);
      return c.json(body, status);
    }
  }
);

// ── GET /api/assignments/:id/download — 60-second signed URL.
// Admin OR owning student.
assignmentsRoutes.get('/:id/download', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  // Role lookup — required so we know whether to enforce "owning student" rule
  // at the service layer. Same defense-in-depth pattern as courses.routes does
  // for anonymous browsing.
  let role: 'admin' | 'student' = 'student';
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (profile?.role === 'admin') role = 'admin';

  try {
    const result = await assignmentsService.getDownloadUrl(id, userId, role);
    return c.json({ data: result });
  } catch (err) {
    const { status, body } = handleErr(err);
    return c.json(body, status);
  }
});
