import { z } from 'zod';

/**
 * Resend verification email request validation schema
 */
export const resendVerificationSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
});

export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
