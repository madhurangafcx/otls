import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';

// Column lengths match the CHECK constraints in 0001_initial_schema.sql.

export const createAnnouncementSchema = z
  .object({
    course_id: z.string().uuid(),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(2000),
    pinned: z.boolean().optional().default(false),
  })
  .strict();

export const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    body: z.string().trim().min(1).max(2000).optional(),
    pinned: z.boolean().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: 'At least one field must be provided',
  });

export const listByCourseQuerySchema = paginationQuerySchema;

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type ListByCourseQuery = z.infer<typeof listByCourseQuerySchema>;
