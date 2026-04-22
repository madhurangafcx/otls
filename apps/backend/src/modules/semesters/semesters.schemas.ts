import { z } from 'zod';

// Blueprint §2.4 — YouTube URL regex validates youtube.com/watch?v= OR youtu.be/
// Matches the 11-char video ID pattern. Accepts query strings after.
const YOUTUBE_URL =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=[\w-]{11}(&[^\s]*)?|youtu\.be\/[\w-]{11}(\?[^\s]*)?)$/;

export const youtubeUrlSchema = z
  .string()
  .trim()
  .regex(
    YOUTUBE_URL,
    'Must be a valid YouTube URL (youtube.com/watch?v=... or youtu.be/...)'
  );

export const createSemesterSchema = z
  .object({
    course_id: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000).optional(),
    youtube_url: youtubeUrlSchema.optional(),
    sort_order: z.number().int().min(0).optional(),
  })
  .strict();

export const updateSemesterSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    youtube_url: youtubeUrlSchema.optional(),
    sort_order: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreateSemesterInput = z.infer<typeof createSemesterSchema>;
export type UpdateSemesterInput = z.infer<typeof updateSemesterSchema>;
