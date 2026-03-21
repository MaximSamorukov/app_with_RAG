import { Request, Response, NextFunction } from 'express';
import { RegistrationService } from './registration.service';
import { EmailVerificationService } from './email-verification.service';
import { registerSchema } from '../dto/register.dto';
import { verifyEmailSchema } from '../dto/verify-email.dto';
import { resendVerificationSchema } from '../dto/resend-verification.dto';
import {
  RegistrationError,
  TokenError,
  RateLimitError,
  AuthError,
} from '../errors/auth.errors';
import { ZodError } from 'zod';

/**
 * Registration Controller
 * Handles HTTP requests for registration and email verification endpoints
 */
export class RegistrationController {
  constructor(
    private registrationService: RegistrationService,
    private emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * POST /auth/register
   * Register a new user
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const dto = registerSchema.parse(req.body);

      // Register user
      const result = await this.registrationService.register(dto);

      res.status(201).json(result);
    } catch (error: unknown) {
      if (error instanceof RegistrationError || error instanceof TokenError || error instanceof RateLimitError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
      } else if (error instanceof ZodError) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Validation failed' } });
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /auth/verify-email
   * Verify email address using token
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const { token } = verifyEmailSchema.parse(req.body);

      // Verify token
      const user = await this.emailVerificationService.verifyToken(token);

      res.json({
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error: unknown) {
      if (error instanceof TokenError || error instanceof RateLimitError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
      } else if (error instanceof ZodError) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Validation failed' } });
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /auth/resend-verification
   * Resend verification email
   */
  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const { email } = resendVerificationSchema.parse(req.body);

      // Resend verification email
      await this.emailVerificationService.resendVerification(email);

      // Always return success to prevent email enumeration
      res.json({ message: 'Verification email sent' });
    } catch (error: unknown) {
      if (error instanceof RateLimitError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
      } else if (error instanceof ZodError) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Validation failed' } });
      } else {
        next(error);
      }
    }
  }
}
