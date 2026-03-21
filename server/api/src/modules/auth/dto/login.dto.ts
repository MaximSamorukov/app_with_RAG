import { z } from 'zod';

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
});

export type LoginDto = z.infer<typeof loginSchema>;
