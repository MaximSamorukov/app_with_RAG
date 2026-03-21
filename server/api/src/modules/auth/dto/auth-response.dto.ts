import { z } from 'zod';
import { userResponseSchema } from './user-response.dto';

/**
 * Authentication response schema
 */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userResponseSchema,
});

export type AuthResponseDto = z.infer<typeof authResponseSchema>;

/**
 * Token refresh response schema
 */
export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type TokenResponseDto = z.infer<typeof tokenResponseSchema>;
