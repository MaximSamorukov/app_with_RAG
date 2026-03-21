import { z } from 'zod';

/**
 * Forgot password request validation schema
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
