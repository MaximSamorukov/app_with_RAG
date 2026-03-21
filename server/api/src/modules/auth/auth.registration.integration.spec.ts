import request from 'supertest';
import express from 'express';
import { AuthService } from './auth.service';
import { RegistrationService } from './services/registration.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { createAuthRouter } from './auth.router';
import { User, UserRole } from '../../database/entities/User.entity';
import { RefreshToken } from '../../database/entities/RefreshToken.entity';
import { EmailVerificationToken } from '../../database/entities/EmailVerificationToken.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

/**
 * Integration Tests for Registration and Password Reset Endpoints
 *
 * These tests verify the full HTTP request/response flow
 * for registration and password reset endpoints with mocked services
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

describe('Registration and Password Reset Endpoints (Integration)', () => {
  let app: express.Express;
  let authService: AuthService;
  let registrationService: RegistrationService;
  let emailVerificationService: EmailVerificationService;
  let passwordResetService: PasswordResetService;
  
  let mockUserRepository: Partial<Repository<User>>;
  let mockRefreshTokenRepository: Partial<Repository<RefreshToken>>;
  let mockEmailVerificationTokenRepository: Partial<Repository<EmailVerificationToken>>;

  // Mock data
  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.2f2f2f2f2f2f',
    isEmailVerified: false,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mocked-access-token',
    refreshToken: 'mocked-refresh-token-64-chars-long-enough-for-security-testing',
    verificationToken: 'a'.repeat(64),
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
      update: jest.fn(),
    };

    mockRefreshTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };

    mockEmailVerificationTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };

    // Setup mock implementations
    (crypto.randomBytes as jest.Mock).mockReturnValue(
      Buffer.from(mockTokens.verificationToken)
    );

    (crypto.createHash as jest.Mock).mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-sha256-hash'),
    }));

    (jwt.sign as jest.Mock).mockReturnValue(mockTokens.accessToken);

    (jwt.verify as jest.Mock).mockImplementation((token: string) => {
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

    // Create services with mocked repositories
    authService = new AuthService(
      mockUserRepository as Repository<User>,
      mockRefreshTokenRepository as Repository<RefreshToken>
    );

    registrationService = new RegistrationService(
      mockUserRepository as Repository<User>,
      mockEmailVerificationTokenRepository as Repository<EmailVerificationToken>,
      authService,
    );

    emailVerificationService = new EmailVerificationService(
      mockUserRepository as Repository<User>,
      mockEmailVerificationTokenRepository as Repository<EmailVerificationToken>,
    );

    passwordResetService = new PasswordResetService(
      mockUserRepository as Repository<User>,
      mockEmailVerificationTokenRepository as Repository<EmailVerificationToken>,
      mockRefreshTokenRepository as Repository<RefreshToken>,
      authService,
    );

    // Create Express app with auth routes
    app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter(
      authService,
      registrationService,
      emailVerificationService,
      passwordResetService
    ));
  });

  // ==================== Registration Tests ====================

  describe('POST /auth/register', () => {
    it('should register user with valid data (success)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockUser);
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue({});

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          name: 'New User',
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('newuser@example.com');
    });

    it('should return 409 with duplicate email', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        });

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should return 400 with weak password', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'weak',
          name: 'New User',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with invalid email format', async () => {
      // Act
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'New User',
        });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  // ==================== Email Verification Tests ====================

  describe('POST /auth/verify-email', () => {
    const mockToken: Partial<EmailVerificationToken> = {
      id: 'token-id',
      userId: mockUser.id,
      tokenHash: 'hashed-token',
      type: 'email_verification' as any,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      usedAt: null,
      user: { ...mockUser, isEmailVerified: false } as User,
    };

    it('should verify email with valid token (success)', async () => {
      // Arrange
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(mockToken);
      (mockUserRepository.save as jest.Mock).mockResolvedValue({ ...mockUser, isEmailVerified: true });
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue(mockToken);

      // Act
      const response = await request(app)
        .post('/auth/verify-email')
        .send({
          token: mockTokens.verificationToken,
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Email verified successfully');
      expect(response.body.user.isEmailVerified).toBe(true);
    });

    it('should return 410 with expired token', async () => {
      // Arrange
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60),
      };
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(expiredToken);

      // Act
      const response = await request(app)
        .post('/auth/verify-email')
        .send({
          token: mockTokens.verificationToken,
        });

      // Assert
      expect(response.status).toBe(410);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should return 409 with already used token', async () => {
      // Arrange
      const usedToken = {
        ...mockToken,
        usedAt: new Date(),
      };
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(usedToken);

      // Act
      const response = await request(app)
        .post('/auth/verify-email')
        .send({
          token: mockTokens.verificationToken,
        });

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('TOKEN_ALREADY_USED');
    });

    it('should return 404 with non-existent token', async () => {
      // Arrange
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/auth/verify-email')
        .send({
          token: 'non-existent-token',
        });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TOKEN_NOT_FOUND');
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email (success)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({ ...mockUser, isEmailVerified: false });
      (mockEmailVerificationTokenRepository.update as jest.Mock).mockResolvedValue({});
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue({});

      // Act
      const response = await request(app)
        .post('/auth/resend-verification')
        .send({
          email: 'test@example.com',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Verification email sent');
    });

    it('should not reveal if email exists (security)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/auth/resend-verification')
        .send({
          email: 'nonexistent@example.com',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Verification email sent');
    });
  });

  // ==================== Password Reset Tests ====================

  describe('POST /auth/forgot-password', () => {
    it('should send password reset email (success)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (mockEmailVerificationTokenRepository.update as jest.Mock).mockResolvedValue({});
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue({});

      // Act
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'test@example.com',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
    });

    it('should not reveal if email exists (security)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
    });
  });

  describe('POST /auth/reset-password', () => {
    const mockToken: Partial<EmailVerificationToken> = {
      id: 'token-id',
      userId: mockUser.id,
      tokenHash: 'hashed-token',
      type: 'password_reset' as any,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: null,
      user: mockUser as User,
    };

    it('should reset password with valid token (success)', async () => {
      // Arrange
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(mockToken);
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockUser);
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue(mockToken);
      (mockRefreshTokenRepository.update as jest.Mock).mockResolvedValue({});
      (mockEmailVerificationTokenRepository.update as jest.Mock).mockResolvedValue({});

      // Act
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: mockTokens.verificationToken,
          password: 'NewPassword123!',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset successfully');
    });

    it('should return 410 with expired token', async () => {
      // Arrange
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60),
      };
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(expiredToken);

      // Act
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: mockTokens.verificationToken,
          password: 'NewPassword123!',
        });

      // Assert
      expect(response.status).toBe(410);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should return 400 with weak password', async () => {
      // Arrange
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(mockToken);

      // Act
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: mockTokens.verificationToken,
          password: 'weak',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /auth/password', () => {
    it('should change password when authenticated (success)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (mockAuthService.comparePassword as jest.Mock).mockResolvedValue(true);
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockUser);
      (mockRefreshTokenRepository.update as jest.Mock).mockResolvedValue({});
      (mockEmailVerificationTokenRepository.update as jest.Mock).mockResolvedValue({});

      // Act
      const response = await request(app)
        .put('/auth/password')
        .set('Authorization', `Bearer ${mockTokens.accessToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!',
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .put('/auth/password')
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!',
        });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 400 with incorrect current password', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (mockAuthService.comparePassword as jest.Mock).mockResolvedValue(false);

      // Act
      const response = await request(app)
        .put('/auth/password')
        .set('Authorization', `Bearer ${mockTokens.accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 400 with weak new password', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (mockAuthService.comparePassword as jest.Mock).mockResolvedValue(true);

      // Act
      const response = await request(app)
        .put('/auth/password')
        .set('Authorization', `Bearer ${mockTokens.accessToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'weak',
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
