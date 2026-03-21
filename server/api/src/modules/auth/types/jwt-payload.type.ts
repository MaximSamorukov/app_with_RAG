import { UserRole } from '../../../database/entities/User.entity';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Decoded JWT payload with user information
 */
export interface DecodedToken {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Token pair (access + refresh)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

/**
 * Token refresh response
 */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
