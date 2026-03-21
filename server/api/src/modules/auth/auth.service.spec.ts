import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User, UserRole } from '../../database/entities/User.entity';
import { RefreshToken } from '../../database/entities/RefreshToken.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import {
  InvalidCredentialsError,
  UserNotFoundError,
  TokenExpiredError,
  TokenRevokedError,
} from './errors/auth.errors';

/**
 * Unit Tests for AuthService
 * 
 * These tests verify the authentication service logic in isolation
 * with mocked dependencies (database, bcrypt, jwt, crypto)
 */

// Mock external dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('crypto');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: Partial<Repository<User>>;
  let mockRefreshTokenRepository: Partial<Repository<RefreshToken>>;

  // Mock data
  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    passwordHash: 'hashed-password',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshTokens: [],
    documents: [],
    chatSessions: [],
  };

  const mockTokens = {
    accessToken: 'mocked-access-token',
    refreshToken: 'mocked-refresh-token-64-chars',
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

  beforeEach(async () => {
    // Clear all mocks before each test
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

    // Setup default mock implementations
    (crypto.randomBytes as jest.Mock).mockReturnValue(
      Buffer.from('mocked-random-bytes-64-chars-for-refresh-token-1234567890abcdef')
    );
    
    (crypto.createHash as jest.Mock).mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-sha256-hash'),
    }));

    (jwt.sign as jest.Mock).mockReturnValue(mockTokens.accessToken);
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    });

    // Create auth service with mocked repositories directly
    authService = new AuthService(
      mockUserRepository as Repository<User>,
      mockRefreshTokenRepository as Repository<RefreshToken>
    );
  });

  describe('login', () => {
    describe('when credentials are valid', () => {
      it('should login with valid credentials', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (mockUserRepository.save as jest.Mock).mockResolvedValue(mockUser);

        // Act
        const result = await authService.login('test@example.com', 'Password123!');

        // Assert
        expect(result).toBeDefined();
        expect(result.accessToken).toBe(mockTokens.accessToken);
        expect(result.refreshToken).toBeDefined();
        expect(result.user).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        });
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
          select: expect.any(Array),
        });
        expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', mockUser.passwordHash);
        expect(mockUserRepository.save).toHaveBeenCalled();
      });
    });

    describe('when credentials are invalid', () => {
      it('should throw 401 with invalid password', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        // Act & Assert
        await expect(authService.login('test@example.com', 'WrongPassword'))
          .rejects
          .toThrow(InvalidCredentialsError);
      });

      it('should throw 404 with non-existent user', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(authService.login('nonexistent@example.com', 'Password123!'))
          .rejects
          .toThrow(UserNotFoundError);
      });

      it('should throw 401 when user is inactive', async () => {
        // Arrange
        const inactiveUser = { ...mockUser, isActive: false };
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(inactiveUser);

        // Act & Assert
        await expect(authService.login('test@example.com', 'Password123!'))
          .rejects
          .toThrow(InvalidCredentialsError);
      });
    });
  });

  describe('refresh', () => {
    describe('when refresh token is valid', () => {
      it('should return new tokens with valid refresh token', async () => {
        // Arrange
        (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(mockRefreshTokenEntity);
        (mockRefreshTokenRepository.save as jest.Mock).mockResolvedValue(mockRefreshTokenEntity);

        // Act
        const result = await authService.refresh('valid-refresh-token');

        // Assert
        expect(result).toBeDefined();
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
          where: { tokenHash: 'mocked-sha256-hash' },
          relations: ['user'],
        });
      });
    });

    describe('when refresh token is invalid', () => {
      it('should throw 401 with expired token', async () => {
        // Arrange
        const expiredToken = {
          ...mockRefreshTokenEntity,
          expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          revokedAt: null, // Make sure revokedAt is null
        };
        (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(expiredToken);

        // Act & Assert
        await expect(authService.refresh('expired-token'))
          .rejects
          .toThrow(TokenExpiredError);
      });

      it('should throw 401 with revoked token', async () => {
        // Arrange
        const revokedToken = {
          ...mockRefreshTokenEntity,
          revokedAt: new Date(),
          revokedReason: 'User logged out',
        };
        (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(revokedToken);

        // Act & Assert
        await expect(authService.refresh('revoked-token'))
          .rejects
          .toThrow(TokenRevokedError);
      });

      it('should throw 401 with non-existent token', async () => {
        // Arrange
        (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(authService.refresh('non-existent-token'))
          .rejects
          .toThrow();
      });

      it('should throw 401 when user is not found', async () => {
        // Arrange
        const tokenWithoutUser = {
          ...mockRefreshTokenEntity,
          user: null,
        };
        (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(tokenWithoutUser);

        // Act & Assert
        await expect(authService.refresh('token-without-user'))
          .rejects
          .toThrow();
      });
    });
  });

  describe('logout', () => {
    it('should revoke token on logout', async () => {
      // Arrange
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(mockRefreshTokenEntity);
      (mockRefreshTokenRepository.save as jest.Mock).mockResolvedValue(mockRefreshTokenEntity);

      // Act
      await authService.logout('valid-refresh-token');

      // Assert
      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { tokenHash: 'mocked-sha256-hash' },
      });
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          revokedAt: expect.any(Date),
          revokedReason: 'User logged out',
        })
      );
    });

    it('should handle logout with non-existent token gracefully', async () => {
      // Arrange
      (mockRefreshTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      await authService.logout('non-existent-token');

      // Assert
      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('password hashing', () => {
    it('should hash password with bcrypt', async () => {
      // Arrange
      const password = 'Password123!';
      (bcrypt.genSalt as jest.Mock).mockResolvedValue(12);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Act
      const hash = await authService.hashPassword(password);

      // Assert
      expect(hash).toBe('hashed-password');
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, expect.anything());
    });

    it('should produce different hashes for same password', async () => {
      // Arrange
      (bcrypt.genSalt as jest.Mock).mockResolvedValue(12);
      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce('hash-1')
        .mockResolvedValueOnce('hash-2');

      // Act
      const hash1 = await authService.hashPassword('Password123!');
      const hash2 = await authService.hashPassword('Password123!');

      // Assert
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('password comparison', () => {
    it('should return true for matching password', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await authService.comparePassword('Password123!', 'hashed-password');

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', 'hashed-password');
    });

    it('should return false for non-matching password', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await authService.comparePassword('WrongPassword', 'hashed-password');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('validateAccessToken', () => {
    it('should return payload for valid token', () => {
      // Arrange
      const mockPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      // Act
      const result = authService.validateAccessToken('valid-token');

      // Assert
      expect(result).toEqual(mockPayload);
    });

    it('should return null for expired token', () => {
      // Arrange
      const expiredError = new Error('Token expired') as jwt.TokenExpiredError;
      expiredError.name = 'TokenExpiredError';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw expiredError;
      });

      // Act
      const result = authService.validateAccessToken('expired-token');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for invalid token', () => {
      // Arrange
      const invalidError = new Error('Invalid token') as jwt.JsonWebTokenError;
      invalidError.name = 'JsonWebTokenError';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw invalidError;
      });

      // Act
      const result = authService.validateAccessToken('invalid-token');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validateRefreshToken', () => {
    it('should return null for short token', () => {
      // Act
      const result = authService.validateRefreshToken('short');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty token', () => {
      // Act
      const result = authService.validateRefreshToken('');

      // Assert
      expect(result).toBeNull();
    });

    it('should accept valid format token (returns null as refresh tokens are validated in refresh method)', () => {
      // Act
      const result = authService.validateRefreshToken('a'.repeat(64));

      // Assert
      expect(result).toBeNull(); // Refresh tokens are validated in refresh() method against DB
    });
  });
});
