import { UserRole } from '../../src/database/entities/User.entity';

/**
 * Test fixtures for authentication module
 */

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: UserRole.USER,
  passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.2f2f2f2f2f2f',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockAdminUser = {
  id: 'admin-user-id',
  email: 'admin@example.com',
  name: 'Admin User',
  role: UserRole.ADMIN,
  passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.2f2f2f2f2f2f',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockTokens = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5OTIyfQ.mocked-signature',
  refreshToken: 'mocked-random-bytes-64-chars-for-refresh-token-1234567890',
};

export const mockRefreshTokenEntity = {
  id: 'refresh-token-id',
  tokenHash: 'mocked-sha256-hash',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  revokedAt: null,
  revokedReason: null,
  fingerprint: 'test-fingerprint',
  createdAt: new Date(),
  userId: mockUser.id,
  user: mockUser,
};

export const mockRevokedRefreshToken = {
  ...mockRefreshTokenEntity,
  revokedAt: new Date(),
  revokedReason: 'User logged out',
};

export const mockExpiredRefreshToken = {
  ...mockRefreshTokenEntity,
  expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
};

export const loginRequest = {
  email: 'test@example.com',
  password: 'Password123!',
};

export const invalidLoginRequest = {
  email: 'test@example.com',
  password: 'WrongPassword',
};

export const nonExistentUserLogin = {
  email: 'nonexistent@example.com',
  password: 'Password123!',
};

export const jwtPayload = {
  sub: mockUser.id,
  email: mockUser.email,
  role: mockUser.role,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
};

export const userResponse = {
  id: mockUser.id,
  email: mockUser.email,
  name: mockUser.name,
  role: mockUser.role,
};

export const authResponse = {
  accessToken: mockTokens.accessToken,
  refreshToken: mockTokens.refreshToken,
  user: userResponse,
};

export const tokenResponse = {
  accessToken: mockTokens.accessToken,
  refreshToken: mockTokens.refreshToken,
};

/**
 * Error response helpers
 */
export const errorResponses = {
  invalidCredentials: {
    status: 401,
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect',
    },
  },
  userNotFound: {
    status: 404,
    error: {
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    },
  },
  invalidToken: {
    status: 401,
    error: {
      code: 'INVALID_TOKEN',
      message: 'Invalid token',
    },
  },
  tokenExpired: {
    status: 401,
    error: {
      code: 'TOKEN_EXPIRED',
      message: 'Token has expired',
    },
  },
  tokenRevoked: {
    status: 401,
    error: {
      code: 'TOKEN_REVOKED',
      message: 'Token has been revoked',
    },
  },
  unauthorized: {
    status: 401,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    },
  },
};
