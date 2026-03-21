import { z } from 'zod';

/**
 * Password validation regex:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 digit
 */
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W]{8,}$/;

/**
 * Change password request validation schema (authenticated users)
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain at least one uppercase letter and one digit'),
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
