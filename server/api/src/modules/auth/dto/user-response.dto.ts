import { z } from 'zod';
import { UserRole } from '../../../database/entities/User.entity';

/**
 * User response schema
 */
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.nativeEnum(UserRole),
});

export type UserResponseDto = z.infer<typeof userResponseSchema>;
