import { PasswordResetService } from './password-reset.service';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../../database/entities/User.entity';
import { EmailVerificationToken, TokenPurpose } from '../../../database/entities/EmailVerificationToken.entity';
import { RefreshToken } from '../../../database/entities/RefreshToken.entity';
import { AuthService } from '../auth.service';
import { TokenError, RateLimitError, InvalidCredentialsError } from '../errors/auth.errors';

/**
 * Unit Tests for PasswordResetService
 */
describe('PasswordResetService', () => {
  let passwordResetService: PasswordResetService;
  let mockUserRepository: Partial<Repository<User>>;
  let mockEmailVerificationTokenRepository: Partial<Repository<EmailVerificationToken>>;
  let mockRefreshTokenRepository: Partial<Repository<RefreshToken>>;
  let mockAuthService: Partial<AuthService>;

  beforeEach(() => {
    // Mock repositories
    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockEmailVerificationTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockRefreshTokenRepository = {
      update: jest.fn(),
    };

    mockAuthService = {
      hashPassword: jest.fn(),
      comparePassword: jest.fn(),
    };

    // Create service instance
    passwordResetService = new PasswordResetService(
      mockUserRepository as Repository<User>,
      mockEmailVerificationTokenRepository as Repository<EmailVerificationToken>,
      mockRefreshTokenRepository as Repository<RefreshToken>,
      mockAuthService as AuthService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset rate limit stores
    const passwordResetRateLimitStore = require('./password-reset.service');
    // Access and clear the internal map - we'll need to export it for testing
    jest.resetModules();
  });

  describe('requestReset', () => {
    const testEmail = 'test@example.com';
    const mockUser: Partial<User> = {
      id: 'user-id',
      email: testEmail,
    };

    it('should generate reset token for valid email (success)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (mockEmailVerificationTokenRepository.update as jest.Mock).mockResolvedValue({});
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue({});

      // Act
      await passwordResetService.requestReset(testEmail);

      // Assert
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: testEmail } });
      expect(mockEmailVerificationTokenRepository.save).toHaveBeenCalled();
    });

    it('should not reveal if email exists (security)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act - should not throw
      await passwordResetService.requestReset('nonexistent@example.com');

      // Assert
      expect(mockUserRepository.findOne).toHaveBeenCalled();
    });

    it('should not generate token for invalid email format', async () => {
      // Arrange
      const invalidEmail = 'invalid-email';

      // Act
      await passwordResetService.requestReset(invalidEmail);

      // Assert
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw error when rate limit exceeded', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      const rateLimitEmail = 'ratelimit@example.com';

      // Make 5 requests to hit the limit
      for (let i = 0; i < 5; i++) {
        await passwordResetService.requestReset(rateLimitEmail);
      }

      // Act & Assert - 6th request should fail
      await expect(passwordResetService.requestReset(rateLimitEmail))
        .rejects
        .toThrow(RateLimitError);
    });
  });

  describe('resetPassword', () => {
    const validToken = 'a'.repeat(64);
    const tokenHash = 'hashed-token';
    const newPassword = 'NewPassword123!';

    const mockToken: Partial<EmailVerificationToken> = {
      id: 'token-id',
      userId: 'user-id',
      tokenHash,
      type: TokenPurpose.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      usedAt: null,
      user: {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'old-hash',
      } as User,
    };

    beforeEach(() => {
      // Mock crypto
      jest.spyOn(require('crypto'), 'createHash').mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(tokenHash),
      } as any));

      (mockAuthService.hashPassword as jest.Mock).mockResolvedValue('new-hash');
    });

    it('should reset password with valid token (success)', async () => {
      // Arrange
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(mockToken);
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockToken.user);
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue(mockToken);
      (mockRefreshTokenRepository.update as jest.Mock).mockResolvedValue({});
      (mockEmailVerificationTokenRepository.update as jest.Mock).mockResolvedValue({});

      // Act
      await passwordResetService.resetPassword(validToken, newPassword);

      // Assert
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'new-hash' })
      );
      expect(mockEmailVerificationTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ usedAt: expect.any(Date) })
      );
      expect(mockRefreshTokenRepository.update).toHaveBeenCalled();
    });

    it('should throw error with expired token', async () => {
      // Arrange
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      };
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(expiredToken);

      // Act & Assert
      await expect(passwordResetService.resetPassword(validToken, newPassword))
        .rejects
        .toThrow(TokenError);
      
      await expect(passwordResetService.resetPassword(validToken, newPassword))
        .rejects
        .toHaveProperty('code', 'TOKEN_EXPIRED');
    });

    it('should throw error with used token', async () => {
      // Arrange
      const usedToken = {
        ...mockToken,
        usedAt: new Date(),
      };
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(usedToken);

      // Act & Assert
      await expect(passwordResetService.resetPassword(validToken, newPassword))
        .rejects
        .toThrow(TokenError);
      
      await expect(passwordResetService.resetPassword(validToken, newPassword))
        .rejects
        .toHaveProperty('code', 'TOKEN_ALREADY_USED');
    });

    it('should throw error with non-existent token', async () => {
      // Arrange
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(passwordResetService.resetPassword(validToken, newPassword))
        .rejects
        .toThrow(TokenError);
      
      await expect(passwordResetService.resetPassword(validToken, newPassword))
        .rejects
        .toHaveProperty('code', 'TOKEN_NOT_FOUND');
    });

    it('should throw error with weak password', async () => {
      // Arrange
      const weakPassword = 'weak';
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(mockToken);

      // Act & Assert
      await expect(passwordResetService.resetPassword(validToken, weakPassword))
        .rejects
        .toThrow(TokenError);
      
      await expect(passwordResetService.resetPassword(validToken, weakPassword))
        .rejects
        .toHaveProperty('code', 'WEAK_PASSWORD');
    });

    it('should throw error with invalid token format', async () => {
      // Arrange
      const shortToken = 'short';

      // Act & Assert
      await expect(passwordResetService.resetPassword(shortToken, newPassword))
        .rejects
        .toThrow(TokenError);
    });

    it('should invalidate all refresh tokens after reset', async () => {
      // Arrange
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(mockToken);
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockToken.user);
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue(mockToken);
      (mockRefreshTokenRepository.update as jest.Mock).mockResolvedValue({});
      (mockEmailVerificationTokenRepository.update as jest.Mock).mockResolvedValue({});

      // Act
      await passwordResetService.resetPassword(validToken, newPassword);

      // Assert
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: mockToken.userId },
        { revokedAt: expect.any(Date), revokedReason: 'Password changed' }
      );
    });
  });

  describe('changePassword', () => {
    const userId = 'user-id';
    const currentPassword = 'CurrentPassword123!';
    const newPassword = 'NewPassword123!';

    const mockUser: Partial<User> = {
      id: userId,
      passwordHash: 'current-hash',
    };

    beforeEach(() => {
      (mockAuthService.comparePassword as jest.Mock).mockResolvedValue(true);
      (mockAuthService.hashPassword as jest.Mock).mockResolvedValue('new-hash');
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockUser);
      (mockRefreshTokenRepository.update as jest.Mock).mockResolvedValue({});
      (mockEmailVerificationTokenRepository.update as jest.Mock).mockResolvedValue({});
    });

    it('should change password with valid credentials (success)', async () => {
      // Act
      await passwordResetService.changePassword(userId, currentPassword, newPassword);

      // Assert
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'new-hash' })
      );
      expect(mockRefreshTokenRepository.update).toHaveBeenCalled();
    });

    it('should throw error with incorrect current password', async () => {
      // Arrange
      (mockAuthService.comparePassword as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(passwordResetService.changePassword(userId, 'wrong-password', newPassword))
        .rejects
        .toThrow(InvalidCredentialsError);
    });

    it('should throw error with non-existent user', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(passwordResetService.changePassword(userId, currentPassword, newPassword))
        .rejects
        .toThrow(InvalidCredentialsError);
    });

    it('should throw error with weak new password', async () => {
      // Arrange
      const weakPassword = 'weak';

      // Act & Assert
      await expect(passwordResetService.changePassword(userId, currentPassword, weakPassword))
        .rejects
        .toThrow(TokenError);
    });

    it('should invalidate all refresh tokens after change', async () => {
      // Act
      await passwordResetService.changePassword(userId, currentPassword, newPassword);

      // Assert
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId },
        { revokedAt: expect.any(Date), revokedReason: 'Password changed' }
      );
    });

    it('should invalidate all reset tokens after change', async () => {
      // Act
      await passwordResetService.changePassword(userId, currentPassword, newPassword);

      // Assert
      expect(mockEmailVerificationTokenRepository.update).toHaveBeenCalledWith(
        { userId, type: TokenPurpose.PASSWORD_RESET },
        { expiresAt: expect.any(Date) }
      );
    });
  });
});
