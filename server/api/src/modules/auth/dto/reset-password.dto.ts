import { z } from 'zod';

/**
 * Password validation regex:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 digit
 */
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W]{8,}$/;

/**
 * Reset password request validation schema
 */
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Token is required')
    .max(255, 'Token must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain at least one uppercase letter and one digit'),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
