import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination';

export const createCourseSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000).optional(),
  })
  .strict();

export const updateCourseSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field (title or description) must be provided',
  });

export const publishCourseSchema = z
  .object({
    status: z.enum(['published', 'draft']),
  })
  .strict();

export const listCoursesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['published', 'draft']).optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type PublishCourseInput = z.infer<typeof publishCourseSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
