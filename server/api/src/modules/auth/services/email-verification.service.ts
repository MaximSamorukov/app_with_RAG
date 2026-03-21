import { Repository } from 'typeorm';
import { User } from '../../../database/entities/User.entity';
import { EmailVerificationToken, TokenPurpose } from '../../../database/entities/EmailVerificationToken.entity';
import { TokenError, RateLimitError, UserNotFoundError } from '../errors/auth.errors';

/**
 * Rate limit entry structure
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limit store
 * Note: Replace with Redis in production
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Email Verification Service
 * 
 * Handles email verification including:
 * - Token generation
 * - Token verification
 * - Resending verification emails
 * - Rate limiting
 */
export class EmailVerificationService {
  constructor(
    private userRepository: Repository<User>,
    private emailVerificationTokenRepository: Repository<EmailVerificationToken>,
  ) {}

  /**
   * Generate email verification token for user
   * 
   * @param userId - User ID to generate token for
   * @returns The plain text token (for sending via email)
   */
  async generateVerificationToken(userId: string): Promise<string> {
    const crypto = await import('crypto');
    
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Hash token for storage
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Calculate expiration (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Invalidate old tokens for this user
    await this.invalidateOldTokens(userId, TokenPurpose.EMAIL_VERIFICATION);
    
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

  /**
   * Verify email using token
   * 
   * @param token - Plain text verification token
   * @returns Verified user
   * @throws TokenError if token is invalid, expired, or already used
   */
  async verifyToken(token: string): Promise<User> {
    // Validate token format
    if (!token || token.length < 10) {
      throw TokenError.invalidToken();
    }

    // Hash token to find in database
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find token with user relation
    const storedToken = await this.emailVerificationTokenRepository.findOne({
      where: { tokenHash },
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

    // Check if email is already verified
    const user = storedToken.user;
    if (!user) {
      throw TokenError.tokenNotFound();
    }

    if (user.isEmailVerified) {
      throw TokenError.tokenAlreadyUsed();
    }

    // Mark user as verified
    user.isEmailVerified = true;
    await this.userRepository.save(user);

    // Mark token as used
    storedToken.usedAt = new Date();
    await this.emailVerificationTokenRepository.save(storedToken);

    return user;
  }

  /**
   * Resend verification email
   * 
   * @param email - User email address
   * @throws UserNotFoundError if email not found
   * @throws RateLimitError if rate limit exceeded
   */
  async resendVerification(email: string): Promise<void> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists (security)
      // But still return success to prevent enumeration
      return;
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return;
    }

    // Rate limiting: 3 requests per hour per email
    const rateLimitKey = `resend-verification:${email}`;
    this.checkRateLimit(rateLimitKey, 3, 60 * 60 * 1000);

    // Generate new token
    await this.generateVerificationToken(user.id);
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
    const entry = rateLimitStore.get(key);

    if (!entry) {
      // First request
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return;
    }

    // Check if window has expired
    if (now > entry.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return;
    }

    // Increment count
    entry.count++;

    if (entry.count > maxRequests) {
      throw new RateLimitError('Too many requests. Please try again later.');
    }

    rateLimitStore.set(key, entry);
  }

  /**
   * Invalidate all old tokens of a specific type for a user
   * 
   * @param userId - User ID
   * @param type - Token type to invalidate
   */
  private async invalidateOldTokens(userId: string, type: TokenPurpose): Promise<void> {
    await this.emailVerificationTokenRepository.update(
      { userId, type },
      { expiresAt: new Date(0) } // Set to past date to invalidate
    );
  }
}
