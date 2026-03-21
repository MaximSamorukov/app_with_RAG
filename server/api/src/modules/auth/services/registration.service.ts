import { Repository } from 'typeorm';
import { User, UserRole } from '../../../database/entities/User.entity';
import { EmailVerificationToken, TokenPurpose } from '../../../database/entities/EmailVerificationToken.entity';
import { RegisterDto } from '../dto/register.dto';
import { RegistrationError } from '../errors/auth.errors';
import { AuthService } from '../auth.service';

/**
 * Registration response type
 */
export interface RegistrationResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isEmailVerified: boolean;
  };
}

/**
 * Registration Service
 * 
 * Handles user registration including:
 * - Email uniqueness validation
 * - Password strength validation
 * - User creation with hashed password
 * - Email verification token generation
 */
export class RegistrationService {
  constructor(
    private userRepository: Repository<User>,
    private emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    private authService: AuthService,
  ) {}

  /**
   * Register a new user
   * 
   * @param dto - Registration data (email, password, name)
   * @returns RegistrationResponse with user info (without password)
   * @throws RegistrationError if email exists or password is weak
   */
  async register(dto: RegisterDto): Promise<RegistrationResponse> {
    const { email, password, name } = dto;

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw RegistrationError.emailAlreadyExists();
    }

    // Validate password strength (additional check beyond Zod)
    if (!this.isPasswordStrong(password)) {
      throw RegistrationError.weakPassword();
    }

    // Hash password
    const passwordHash = await this.authService.hashPassword(password);

    // Create user
    const user = await this.userRepository.save({
      email,
      passwordHash,
      name,
      role: UserRole.USER,
      isEmailVerified: false,
      isActive: true,
    });

    // Generate email verification token
    await this.generateVerificationToken(user.id);

    // Return user without password
    return {
      message: 'Registration successful. Please verify your email.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  /**
   * Validate password strength
   * 
   * Requirements:
   * - Minimum 8 characters
   * - At least 1 uppercase letter
   * - At least 1 digit
   * 
   * @param password - Plain text password
   * @returns true if password meets requirements
   */
  private isPasswordStrong(password: string): boolean {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Generate email verification token for user
   * 
   * @param userId - User ID to generate token for
   * @returns The plain text token (for sending via email)
   */
  private async generateVerificationToken(userId: string): Promise<string> {
    const crypto = await import('crypto');
    
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Hash token for storage
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Calculate expiration (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Store token
    await this.emailVerificationTokenRepository.save({
      userId,
      tokenHash,
      type: TokenPurpose.EMAIL_VERIFICATION,
      expiresAt,
      usedAt: null,
    });

    // Log token for development (in production, send via email)
    console.log(`[DEV] Email verification token for ${userId}: ${token}`);

    return token;
  }
}
