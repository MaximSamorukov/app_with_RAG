import request from 'supertest';
import express from 'express';
import { AuthService } from './auth.service';
import { createAuthRouter } from './auth.router';
import { User, UserRole } from '../../database/entities/User.entity';
import { RefreshToken } from '../../database/entities/RefreshToken.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

/**
 * Integration Tests for Authentication Endpoints
 * 
 * These tests verify the full HTTP request/response flow
 * for authentication endpoints with mocked services
 */

// Mock external dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('crypto');
jest.mock('typeorm', () => {
  const actualTypeorm = jest.requireActual('typeorm');
  return {
    ...actualTypeorm,
    DataSource: jest.fn().mockImplementation(() => ({
      initialize: jest.fn(),
      getRepository: jest.fn(),
      destroy: jest.fn(),
    })),
  };
});

describe('Authentication Endpoints (Integration)', () => {
  let app: express.Express;
  let authService: AuthService;
  let mockUserRepository: Partial<Repository<User>>;
  let mockRefreshTokenRepository: Partial<Repository<RefreshToken>>;

  // Mock data
  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.2f2f2f2f2f2f',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mocked-access-token',
    refreshToken: 'mocked-refresh-token-64-chars-long-enough-for-security-testing',
  };

  const mockRefreshTokenEntity: Partial<RefreshToken> = {
    id: 'refresh-token-id',
    tokenHash: 'mocked-sha256-hash',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    revokedReason: null,
    fingerprint: 'test-fingerprint',
    createdAt: new Date(),
    userId: mockUser.id,
    user: mockUser as User,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock repositories
    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    mockRefreshTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    // Setup mock implementations
    (crypto.randomBytes as jest.Mock).mockReturnValue(
      Buffer.from(mockTokens.refreshToken)
    );

    (crypto.createHash as jest.Mock).mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-sha256-hash'),
    }));

    (jwt.sign as jest.Mock).mockReturnValue(mockTokens.accessToken);

    (jwt.verify as jest.Mock).mockImplementation((token: string) => {
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
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };
    });

    (bcrypt.compare as jest.Mock).mockImplementation((password: string) => {
      return password === 'Password123!';
    });

    (bcrypt.genSalt as jest.Mock).mockResolvedValue(12);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    // Create auth service with mocked repositories
    authService = new AuthService(
      mockUserRepository as Repository<User>,
      mockRefreshTokenRepository as Repository<RefreshToken>
    );

    // Create Express app with auth routes
    app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter(authService));
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials (success)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
    });

    it('should return 401 with invalid password (failure)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      // bcrypt.compare mock returns false for any password that's not 'Password123!'
      // So 'WrongPass1' will fail comparison

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPass1',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 404 with non-existent user', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 with invalid email format', async () => {
      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
        });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 with short password', async () => {
      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'short',
        });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      // Arrange
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(mockRefreshTokenEntity);
      (mockRefreshTokenRepository.save as jest.Mock).mockResolvedValue(mockRefreshTokenEntity);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: mockTokens.refreshToken,
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should return 401 with expired token', async () => {
      // Arrange
      const expiredToken = {
        ...mockRefreshTokenEntity,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        revokedAt: null, // Make sure revokedAt is null
      };
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(expiredToken);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'expired-token',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should return 401 with revoked token', async () => {
      // Arrange
      const revokedToken = {
        ...mockRefreshTokenEntity,
        revokedAt: new Date(),
        revokedReason: 'User logged out',
      };
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(revokedToken);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'revoked-token',
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_REVOKED');
    });

    it('should return 401 with non-existent token', async () => {
      // Arrange
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'non-existent-token',
        });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 400 with missing refresh token', async () => {
      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      // Arrange
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(mockRefreshTokenEntity);
      (mockRefreshTokenRepository.save as jest.Mock).mockResolvedValue(mockRefreshTokenEntity);

      // Act
      const response = await request(app)
        .post('/auth/logout')
        .send({
          refreshToken: mockTokens.refreshToken,
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should handle logout with non-existent token gracefully', async () => {
      // Arrange
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/auth/logout')
        .send({
          refreshToken: 'non-existent-token',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should return 401 with missing refresh token', async () => {
      // Act
      const response = await request(app)
        .post('/auth/logout')
        .send({});

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid token (authenticated)', async () => {
      // Arrange
      const validToken = 'valid-access-token';

      // Act
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should return 401 without token (unauthenticated)', async () => {
      // Act
      const response = await request(app).get('/auth/me');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid token format', async () => {
      // Act
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with expired token', async () => {
      // Arrange
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      // Act
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer expired-token');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });
});
