"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponses = exports.tokenResponse = exports.authResponse = exports.userResponse = exports.jwtPayload = exports.nonExistentUserLogin = exports.invalidLoginRequest = exports.loginRequest = exports.mockExpiredRefreshToken = exports.mockRevokedRefreshToken = exports.mockRefreshTokenEntity = exports.mockTokens = exports.mockAdminUser = exports.mockUser = void 0;
const User_entity_1 = require("../../src/database/entities/User.entity");
/**
 * Test fixtures for authentication module
 */
exports.mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: User_entity_1.UserRole.USER,
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.2f2f2f2f2f2f',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
};
exports.mockAdminUser = {
    id: 'admin-user-id',
    email: 'admin@example.com',
    name: 'Admin User',
    role: User_entity_1.UserRole.ADMIN,
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.2f2f2f2f2f2f',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
};
exports.mockTokens = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5OTIyfQ.mocked-signature',
    refreshToken: 'mocked-random-bytes-64-chars-for-refresh-token-1234567890',
};
exports.mockRefreshTokenEntity = {
    id: 'refresh-token-id',
    tokenHash: 'mocked-sha256-hash',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    revokedAt: null,
    revokedReason: null,
    fingerprint: 'test-fingerprint',
    createdAt: new Date(),
    userId: exports.mockUser.id,
    user: exports.mockUser,
};
exports.mockRevokedRefreshToken = {
    ...exports.mockRefreshTokenEntity,
    revokedAt: new Date(),
    revokedReason: 'User logged out',
};
exports.mockExpiredRefreshToken = {
    ...exports.mockRefreshTokenEntity,
    expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
};
exports.loginRequest = {
    email: 'test@example.com',
    password: 'Password123!',
};
exports.invalidLoginRequest = {
    email: 'test@example.com',
    password: 'WrongPassword',
};
exports.nonExistentUserLogin = {
    email: 'nonexistent@example.com',
    password: 'Password123!',
};
exports.jwtPayload = {
    sub: exports.mockUser.id,
    email: exports.mockUser.email,
    role: exports.mockUser.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
};
exports.userResponse = {
    id: exports.mockUser.id,
    email: exports.mockUser.email,
    name: exports.mockUser.name,
    role: exports.mockUser.role,
};
exports.authResponse = {
    accessToken: exports.mockTokens.accessToken,
    refreshToken: exports.mockTokens.refreshToken,
    user: exports.userResponse,
};
exports.tokenResponse = {
    accessToken: exports.mockTokens.accessToken,
    refreshToken: exports.mockTokens.refreshToken,
};
/**
 * Error response helpers
 */
exports.errorResponses = {
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
//# sourceMappingURL=auth.fixture.js.map