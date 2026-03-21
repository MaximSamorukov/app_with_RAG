import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Injectable, Inject } from '@nestjs/common';
import { User, UserRole } from '../../database/entities/User.entity';
import { RefreshToken } from '../../database/entities/RefreshToken.entity';
import {
  InvalidCredentialsError,
  UserNotFoundError,
  InvalidTokenError,
  TokenExpiredError,
  TokenRevokedError,
} from './errors/auth.errors';
import { JwtPayload, AuthResponse, RefreshResponse } from './types/jwt-payload.type';

/**
 * Authentication Service
 * 
 * Handles all authentication-related operations including:
 * - User login with email/password
 * - Token refresh
 * - Logout and token revocation
 * - Password hashing and comparison
 * - Token validation
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_REPOSITORY')
    private userRepository: Repository<User>,
    @Inject('REFRESH_TOKEN_REPOSITORY')
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Authenticate user with email and password
   * 
   * @param email - User's email address
   * @param password - User's password
   * @returns AuthResponse with access token, refresh token, and user info
   * @throws InvalidCredentialsError if password is incorrect
   * @throws UserNotFoundError if user doesn't exist
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user by email (include passwordHash in selection)
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'name', 'role', 'passwordHash', 'isActive'],
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    if (!user.isActive) {
      throw new InvalidCredentialsError();
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   * 
   * @param refreshToken - The refresh token
   * @returns RefreshResponse with new access and refresh tokens
   * @throws InvalidTokenError if token is invalid
   * @throws TokenExpiredError if token has expired
   * @throws TokenRevokedError if token was revoked
   */
  async refresh(refreshToken: string): Promise<RefreshResponse> {
    // Hash the refresh token to find it in database
    const tokenHash = this.hashRefreshToken(refreshToken);

    // Find the refresh token in database
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new InvalidTokenError('Refresh token not found');
    }

    // Check if token is revoked
    if (storedToken.revokedAt) {
      throw new TokenRevokedError();
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      throw new TokenExpiredError();
    }

    const user = storedToken.user;
    if (!user || !user.isActive) {
      throw new InvalidTokenError('User not found or inactive');
    }

    // Revoke the old refresh token
    await this.revokeToken(refreshToken);

    // Generate new tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Logout user by revoking refresh token
   * 
   * @param refreshToken - The refresh token to revoke
   * @throws InvalidTokenError if token is invalid
   */
  async logout(refreshToken: string): Promise<void> {
    await this.revokeToken(refreshToken, 'User logged out');
  }

  /**
   * Validate access token
   * 
   * @param token - JWT access token
   * @returns Decoded JWT payload or null if invalid
   */
  validateAccessToken(token: string): JwtPayload | null {
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
      return payload;
    } catch (error: unknown) {
      // Check error name instead of instanceof for mocked jwt
      if (error && typeof error === 'object' && 'name' in error) {
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Validate refresh token (signature only, not DB check)
   * 
   * @param token - Refresh token string
   * @returns Decoded payload or null if invalid
   */
  validateRefreshToken(token: string): JwtPayload | null {
    try {
      // Refresh tokens are not JWT, they're random strings
      // This method is for validating the format
      if (!token || token.length < 32) {
        return null;
      }
      return null; // Refresh tokens are validated in refresh() method
    } catch {
      return null;
    }
  }

  /**
   * Hash password using bcrypt
   * 
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   * 
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns true if password matches hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access and refresh tokens
   * 
   * @param userId - User ID
   * @param email - User email
   * @param role - User role
   * @returns TokenPair with access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Generate access token (JWT)
    const accessToken = jwt.sign(
      {
        sub: userId,
        email,
        role,
      },
      process.env.JWT_ACCESS_SECRET! as string,
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
        algorithm: 'HS256',
      } as jwt.SignOptions
    );

    // Generate refresh token (random 64-byte string)
    const refreshToken = crypto.randomBytes(64).toString('hex');

    // Hash refresh token for storage
    const tokenHash = this.hashRefreshToken(refreshToken);

    // Calculate expiration date
    const expiresAt = new Date();
    const expirationString = process.env.JWT_REFRESH_EXPIRATION || '7d';
    
    // Parse expiration (simple parsing for common formats)
    const match = expirationString.match(/^(\d+)([dhms])$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];
      switch (unit) {
        case 'd':
          expiresAt.setDate(expiresAt.getDate() + value);
          break;
        case 'h':
          expiresAt.setHours(expiresAt.getHours() + value);
          break;
        case 'm':
          expiresAt.setMinutes(expiresAt.getMinutes() + value);
          break;
        case 's':
          expiresAt.setSeconds(expiresAt.getSeconds() + value);
          break;
      }
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days
    }

    // Generate fingerprint (could be based on user agent, IP, etc.)
    const fingerprint = this.generateFingerprint();

    // Store refresh token in database
    await this.refreshTokenRepository.save({
      tokenHash,
      expiresAt,
      fingerprint,
      userId,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Hash refresh token using SHA-256
   * 
   * @param token - Refresh token
   * @returns SHA-256 hash of token
   */
  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Revoke refresh token
   * 
   * @param refreshToken - Refresh token to revoke
   * @param reason - Optional reason for revocation
   */
  private async revokeToken(refreshToken: string, reason?: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (storedToken) {
      storedToken.revokedAt = new Date();
      storedToken.revokedReason = reason || null;
      await this.refreshTokenRepository.save(storedToken);
    }
  }

  /**
   * Generate fingerprint for device tracking
   * 
   * @returns Random fingerprint string
   */
  private generateFingerprint(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
