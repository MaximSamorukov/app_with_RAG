import { z } from 'zod';

/**
 * Email verification request validation schema
 */
export const verifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required')
    .max(255, 'Token must be less than 255 characters'),
});

export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
