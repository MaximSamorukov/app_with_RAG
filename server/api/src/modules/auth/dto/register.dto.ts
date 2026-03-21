import { z } from 'zod';

/**
 * Password validation regex:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 digit
 */
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W]{8,}$/;

/**
 * Registration request validation schema
 */
export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain at least one uppercase letter and one digit'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
