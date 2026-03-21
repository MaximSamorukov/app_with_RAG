import { z } from 'zod';
import { registerSchema } from '../../auth/dto/register.dto';

/**
 * Admin create user validation schema
 * Extends registration schema with admin-specific fields
 */
export const adminCreateUserSchema = registerSchema.extend({
  role: z.enum(['user', 'admin']).optional().default('user'),
  isEmailVerified: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export type AdminCreateUserDto = z.infer<typeof adminCreateUserSchema>;
