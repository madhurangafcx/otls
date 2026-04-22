import { z } from 'zod';

export const requestEnrollmentSchema = z
  .object({
    course_id: z.string().uuid(),
  })
  .strict();

export const reviewEnrollmentSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
  })
  .strict();

export const listEnrollmentsQuerySchema = z.object({
  course_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export type RequestEnrollmentInput = z.infer<typeof requestEnrollmentSchema>;
export type ReviewEnrollmentInput = z.infer<typeof reviewEnrollmentSchema>;
export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuerySchema>;
