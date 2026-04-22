import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';

// Blueprint §14.2: path shape is `{student_id}/{semester_id}/{unix_ms}_{sanitized_filename}`.
// We don't parse this out here — the service re-validates the prefix against the
// authenticated student + the submitted semester_id.

export const registerAssignmentSchema = z
  .object({
    semester_id: z.string().uuid(),
    file_path: z.string().min(1).max(500),
    file_name: z.string().min(1).max(255),
    file_type: z.enum(['pdf', 'docx']),
  })
  .strict();

export const listAssignmentsQuerySchema = paginationQuerySchema.extend({
  course_id: z.string().uuid().optional(),
  semester_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
});

export const listMyAssignmentsQuerySchema = z.object({
  semester_id: z.string().uuid().optional(),
});

export type RegisterAssignmentInput = z.infer<typeof registerAssignmentSchema>;
export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuerySchema>;
export type ListMyAssignmentsQuery = z.infer<typeof listMyAssignmentsQuerySchema>;
