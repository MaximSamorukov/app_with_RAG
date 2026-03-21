import { EmailVerificationService } from './email-verification.service';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../../database/entities/User.entity';
import { EmailVerificationToken, TokenPurpose } from '../../../database/entities/EmailVerificationToken.entity';
import { TokenError, RateLimitError } from '../errors/auth.errors';

/**
 * Unit Tests for EmailVerificationService
 */
describe('EmailVerificationService', () => {
  let emailVerificationService: EmailVerificationService;
  let mockUserRepository: Partial<Repository<User>>;
  let mockEmailVerificationTokenRepository: Partial<Repository<EmailVerificationToken>>;

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

    // Create service instance
    emailVerificationService = new EmailVerificationService(
      mockUserRepository as Repository<User>,
      mockEmailVerificationTokenRepository as Repository<EmailVerificationToken>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    const validToken = 'a'.repeat(64); // 64 character hex token
    const tokenHash = 'hashed-token';

    const mockToken: Partial<EmailVerificationToken> = {
      id: 'token-id',
      userId: 'user-id',
      tokenHash,
      type: TokenPurpose.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      usedAt: null,
      user: {
        id: 'user-id',
        email: 'test@example.com',
        isEmailVerified: false,
      } as User,
    };

    beforeEach(() => {
      // Mock crypto
      jest.spyOn(require('crypto'), 'createHash').mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(tokenHash),
      } as any));
    });

    it('should verify email with valid token (success)', async () => {
      // Arrange
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(mockToken);
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockToken.user);
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue(mockToken);

      // Act
      const result = await emailVerificationService.verifyToken(validToken);

      // Assert
      expect(result).toBeDefined();
      expect(result.isEmailVerified).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isEmailVerified: true })
      );
      expect(mockEmailVerificationTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ usedAt: expect.any(Date) })
      );
    });

    it('should throw error with expired token', async () => {
      // Arrange
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      };
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(expiredToken);

      // Act & Assert
      await expect(emailVerificationService.verifyToken(validToken))
        .rejects
        .toThrow(TokenError);
      
      await expect(emailVerificationService.verifyToken(validToken))
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
      await expect(emailVerificationService.verifyToken(validToken))
        .rejects
        .toThrow(TokenError);
      
      await expect(emailVerificationService.verifyToken(validToken))
        .rejects
        .toHaveProperty('code', 'TOKEN_ALREADY_USED');
    });

    it('should throw error with non-existent token', async () => {
      // Arrange
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(emailVerificationService.verifyToken(validToken))
        .rejects
        .toThrow(TokenError);
      
      await expect(emailVerificationService.verifyToken(validToken))
        .rejects
        .toHaveProperty('code', 'TOKEN_NOT_FOUND');
    });

    it('should throw error with invalid token format', async () => {
      // Arrange
      const shortToken = 'short';

      // Act & Assert
      await expect(emailVerificationService.verifyToken(shortToken))
        .rejects
        .toThrow(TokenError);
      
      await expect(emailVerificationService.verifyToken(shortToken))
        .rejects
        .toHaveProperty('code', 'INVALID_TOKEN');
    });

    it('should throw error if email already verified', async () => {
      // Arrange
      const alreadyVerifiedToken = {
        ...mockToken,
        user: {
          ...mockToken.user,
          isEmailVerified: true,
        },
      };
      (mockEmailVerificationTokenRepository.findOne as jest.Mock).mockResolvedValue(alreadyVerifiedToken);

      // Act & Assert
      await expect(emailVerificationService.verifyToken(validToken))
        .rejects
        .toThrow(TokenError);
    });
  });

  describe('resendVerification', () => {
    const testEmail = 'test@example.com';
    const mockUser: Partial<User> = {
      id: 'user-id',
      email: testEmail,
      isEmailVerified: false,
    };

    beforeEach(() => {
      // Clear rate limit store
      jest.clearAllMocks();
    });

    it('should generate new token for unverified user (success)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (mockEmailVerificationTokenRepository.update as jest.Mock).mockResolvedValue({});
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue({});

      // Act
      await emailVerificationService.resendVerification(testEmail);

      // Assert
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: testEmail } });
      expect(mockEmailVerificationTokenRepository.save).toHaveBeenCalled();
    });

    it('should not reveal if email exists (security)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act - should not throw
      await emailVerificationService.resendVerification('nonexistent@example.com');

      // Assert
      expect(mockUserRepository.findOne).toHaveBeenCalled();
    });

    it('should not resend if email already verified', async () => {
      // Arrange
      const verifiedUser = {
        ...mockUser,
        isEmailVerified: true,
      };
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(verifiedUser);

      // Act
      await emailVerificationService.resendVerification(testEmail);

      // Assert
      expect(mockEmailVerificationTokenRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when rate limit exceeded', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Make 3 requests to hit the limit
      await emailVerificationService.resendVerification(testEmail);
      await emailVerificationService.resendVerification(testEmail);
      await emailVerificationService.resendVerification(testEmail);

      // Act & Assert - 4th request should fail
      await expect(emailVerificationService.resendVerification(testEmail))
        .rejects
        .toThrow(RateLimitError);
    });
  });

  describe('generateVerificationToken', () => {
    const userId = 'test-user-id';

    it('should generate and store token', async () => {
      // Arrange
      (mockEmailVerificationTokenRepository.update as jest.Mock).mockResolvedValue({});
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue({});

      // Act
      const token = await emailVerificationService.generateVerificationToken(userId);

      // Assert
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes hex = 64 chars
      expect(mockEmailVerificationTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: TokenPurpose.EMAIL_VERIFICATION,
        })
      );
    });

    it('should invalidate old tokens before generating new one', async () => {
      // Arrange
      (mockEmailVerificationTokenRepository.update as jest.Mock).mockResolvedValue({});
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue({});

      // Act
      await emailVerificationService.generateVerificationToken(userId);

      // Assert
      expect(mockEmailVerificationTokenRepository.update).toHaveBeenCalledWith(
        { userId, type: TokenPurpose.EMAIL_VERIFICATION },
        { expiresAt: expect.any(Date) }
      );
    });
  });
});
