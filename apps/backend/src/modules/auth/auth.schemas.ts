import { z } from 'zod';

// Input schemas for auth endpoints. All use .strict() so unknown fields are
// rejected with a clear error (blueprint §5.5 security posture).

export const registerInputSchema = z
  .object({
    email: z.string().email().max(254),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password is too long (max 72 chars — bcrypt limit)'),
    full_name: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const loginInputSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(72),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
