"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockCrypto = exports.mockJwt = exports.mockBcrypt = void 0;
require("reflect-metadata");
// Global test setup
beforeEach(() => {
    jest.clearAllMocks();
});
// Mock environment variables for tests
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-min-32-chars-long-for-security';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-min-32-chars-long-for-security';
process.env.JWT_ACCESS_EXPIRATION = '15m';
process.env.JWT_REFRESH_EXPIRATION = '7d';
// Mock bcrypt
jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn().mockResolvedValue(true),
    genSalt: jest.fn().mockResolvedValue(12),
}));
// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mocked-jwt-token'),
    verify: jest.fn().mockImplementation((token) => {
        if (token === 'expired-token') {
            const error = new Error('Token expired');
            error.name = 'TokenExpiredError';
            throw error;
        }
        if (token === 'invalid-token') {
            const error = new Error('Invalid token');
            error.name = 'JsonWebTokenError';
            throw error;
        }
        return {
            sub: 'test-user-id',
            email: 'test@example.com',
            role: 'user',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
        };
    }),
    decode: jest.fn().mockReturnValue({
        sub: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
    }),
}));
// Mock crypto
jest.mock('crypto', () => ({
    randomBytes: jest.fn().mockReturnValue(Buffer.from('mocked-random-bytes-64-chars-for-refresh-token-1234567890')),
    createHash: jest.fn().mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('mocked-sha256-hash'),
    })),
}));
// Export mock helpers
exports.mockBcrypt = require('bcrypt');
exports.mockJwt = require('jsonwebtoken');
exports.mockCrypto = require('crypto');
//# sourceMappingURL=setup.js.map