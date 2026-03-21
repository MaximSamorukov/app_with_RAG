import { RegistrationService } from './registration.service';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../../database/entities/User.entity';
import { EmailVerificationToken } from '../../../database/entities/EmailVerificationToken.entity';
import { AuthService } from '../auth.service';
import { RegistrationError } from '../errors/auth.errors';

/**
 * Unit Tests for RegistrationService
 */
describe('RegistrationService', () => {
  let registrationService: RegistrationService;
  let mockUserRepository: Partial<Repository<User>>;
  let mockEmailVerificationTokenRepository: Partial<Repository<EmailVerificationToken>>;
  let mockAuthService: Partial<AuthService>;

  beforeEach(() => {
    // Mock repositories
    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockEmailVerificationTokenRepository = {
      save: jest.fn(),
    };

    mockAuthService = {
      hashPassword: jest.fn(),
    };

    // Create service instance
    registrationService = new RegistrationService(
      mockUserRepository as Repository<User>,
      mockEmailVerificationTokenRepository as Repository<EmailVerificationToken>,
      mockAuthService as AuthService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validDto = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
    };

    const mockUser: Partial<User> = {
      id: 'user-id',
      email: validDto.email,
      name: validDto.name,
      role: UserRole.USER,
      isEmailVerified: false,
    };

    it('should register user with valid data (success)', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockAuthService.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockUser);
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue({});

      // Act
      const result = await registrationService.register(validDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.message).toBe('Registration successful. Please verify your email.');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: UserRole.USER,
        isEmailVerified: false,
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: validDto.email } });
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw error with duplicate email', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      // Act & Assert
      await expect(registrationService.register(validDto))
        .rejects
        .toThrow(RegistrationError);
      
      await expect(registrationService.register(validDto))
        .rejects
        .toHaveProperty('code', 'EMAIL_ALREADY_EXISTS');
    });

    it('should throw error with weak password', async () => {
      // Arrange
      const weakPasswordDto = {
        ...validDto,
        password: 'weak', // Doesn't meet requirements
      };
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(registrationService.register(weakPasswordDto))
        .rejects
        .toThrow(RegistrationError);
      
      await expect(registrationService.register(weakPasswordDto))
        .rejects
        .toHaveProperty('code', 'WEAK_PASSWORD');
    });

    it('should throw error with invalid email format', async () => {
      // Arrange
      const invalidEmailDto = {
        ...validDto,
        email: 'invalid-email', // Invalid format
      };
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert - Zod validation happens at controller level
      // Service should still handle it gracefully
      await expect(registrationService.register(invalidEmailDto))
        .rejects
        .toThrow();
    });

    it('should throw error with short name', async () => {
      // Arrange
      const shortNameDto = {
        ...validDto,
        name: 'A', // Too short
      };
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert - Zod validation happens at controller level
      await expect(registrationService.register(shortNameDto))
        .rejects
        .toThrow();
    });

    it('should hash password before saving user', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockAuthService.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockUser);

      // Act
      await registrationService.register(validDto);

      // Assert
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith(validDto.password);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'hashed-password',
        })
      );
    });

    it('should generate email verification token after registration', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockAuthService.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (mockUserRepository.save as jest.Mock).mockResolvedValue(mockUser);
      (mockEmailVerificationTokenRepository.save as jest.Mock).mockResolvedValue({});

      // Act
      await registrationService.register(validDto);

      // Assert
      expect(mockEmailVerificationTokenRepository.save).toHaveBeenCalled();
    });
  });
});
