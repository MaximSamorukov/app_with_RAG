import { z } from 'zod';

/**
 * Refresh token request validation schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
