import { Repository } from 'typeorm';
import { User } from '../../../database/entities/User.entity';
import { EmailVerificationToken, TokenPurpose } from '../../../database/entities/EmailVerificationToken.entity';
import { RefreshToken } from '../../../database/entities/RefreshToken.entity';
import { TokenError, RateLimitError, InvalidCredentialsError } from '../errors/auth.errors';
import { AuthService } from '../auth.service';

/**
 * In-memory rate limit store for password reset
 * Note: Replace with Redis in production
 */
const passwordResetRateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Password Reset Service
 * 
 * Handles password reset operations including:
 * - Password reset request
 * - Password reset with token
 * - Password change (authenticated)
 * - Rate limiting
 * - Token invalidation
 */
export class PasswordResetService {
  constructor(
    private userRepository: Repository<User>,
    private emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    private refreshTokenRepository: Repository<RefreshToken>,
    private authService: AuthService,
  ) {}

  /**
   * Request password reset
   * 
   * @param email - User email address
   * @throws RateLimitError if rate limit exceeded
   */
  async requestReset(email: string): Promise<void> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return; // Don't reveal if email is invalid (security)
    }

    // Rate limiting: 5 requests per hour per email
    const rateLimitKey = `password-reset:${email}`;
    this.checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000);

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists (security)
      return;
    }

    // Generate reset token
    await this.generateResetToken(user.id);
  }

  /**
   * Reset password using token
   * 
   * @param token - Plain text reset token
   * @param newPassword - New password
   * @throws TokenError if token is invalid, expired, or already used
   * @throws TokenError if password is weak
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate token format
    if (!token || token.length < 10) {
      throw TokenError.invalidToken();
    }

    // Validate password strength
    if (!this.isPasswordStrong(newPassword)) {
      throw TokenError.weakPassword();
    }

    // Hash token to find in database
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find token with user relation
    const storedToken = await this.emailVerificationTokenRepository.findOne({
      where: { tokenHash, type: TokenPurpose.PASSWORD_RESET },
      relations: ['user'],
    });

    if (!storedToken) {
      throw TokenError.tokenNotFound();
    }

    // Check if token is already used
    if (storedToken.usedAt) {
      throw TokenError.tokenAlreadyUsed();
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      throw TokenError.tokenExpired();
    }

    const user = storedToken.user;
    if (!user) {
      throw TokenError.tokenNotFound();
    }

    // Hash new password
    const passwordHash = await this.authService.hashPassword(newPassword);

    // Update user password
    user.passwordHash = passwordHash;
    await this.userRepository.save(user);

    // Mark token as used
    storedToken.usedAt = new Date();
    await this.emailVerificationTokenRepository.save(storedToken);

    // Invalidate all refresh tokens for this user
    await this.invalidateAllRefreshTokens(user.id);

    // Invalidate all other reset tokens
    await this.invalidateAllResetTokens(user.id);
  }

  /**
   * Change password (authenticated user)
   * 
   * @param userId - User ID
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @throws InvalidCredentialsError if current password is incorrect
   * @throws TokenError if new password is weak
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Find user with password hash
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'passwordHash'],
    });

    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Verify current password
    const isPasswordValid = await this.authService.comparePassword(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // Validate new password strength
    if (!this.isPasswordStrong(newPassword)) {
      throw TokenError.weakPassword();
    }

    // Hash new password
    const passwordHash = await this.authService.hashPassword(newPassword);

    // Update user password
    user.passwordHash = passwordHash;
    await this.userRepository.save(user);

    // Invalidate all refresh tokens for this user
    await this.invalidateAllRefreshTokens(userId);

    // Invalidate all reset tokens
    await this.invalidateAllResetTokens(userId);
  }

  /**
   * Generate password reset token for user
   * 
   * @param userId - User ID to generate token for
   * @returns The plain text token (for sending via email)
   */
  private async generateResetToken(userId: string): Promise<string> {
    const crypto = await import('crypto');
    
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Hash token for storage
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Calculate expiration (1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Invalidate old reset tokens
    await this.invalidateAllResetTokens(userId);
    
    // Store token
    await this.emailVerificationTokenRepository.save({
      userId,
      tokenHash,
      type: TokenPurpose.PASSWORD_RESET,
      expiresAt,
      usedAt: null,
    });

    // Log token for development (in production, send via email)
    console.log(`[DEV] Password reset token for ${userId}: ${token}`);

    return token;
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
   * Check rate limit for a given key
   * 
   * @param key - Rate limit key (e.g., email or IP)
   * @param maxRequests - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @throws RateLimitError if limit exceeded
   */
  private checkRateLimit(key: string, maxRequests: number, windowMs: number): void {
    const now = Date.now();
    const entry = passwordResetRateLimitStore.get(key);

    if (!entry) {
      // First request
      passwordResetRateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return;
    }

    // Check if window has expired
    if (now > entry.resetTime) {
      passwordResetRateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return;
    }

    // Increment count
    entry.count++;

    if (entry.count > maxRequests) {
      throw new RateLimitError('Too many password reset requests. Please try again later.');
    }

    passwordResetRateLimitStore.set(key, entry);
  }

  /**
   * Invalidate all refresh tokens for a user
   * 
   * @param userId - User ID
   */
  private async invalidateAllRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId },
      { revokedAt: new Date(), revokedReason: 'Password changed' }
    );
  }

  /**
   * Invalidate all password reset tokens for a user
   * 
   * @param userId - User ID
   */
  private async invalidateAllResetTokens(userId: string): Promise<void> {
    await this.emailVerificationTokenRepository.update(
      { userId, type: TokenPurpose.PASSWORD_RESET },
      { expiresAt: new Date(0) } // Set to past date to invalidate
    );
  }
}
