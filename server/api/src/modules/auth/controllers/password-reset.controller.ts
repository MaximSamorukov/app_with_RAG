import { Request, Response, NextFunction } from 'express';
import { PasswordResetService } from './password-reset.service';
import { forgotPasswordSchema } from '../dto/forgot-password.dto';
import { resetPasswordSchema } from '../dto/reset-password.dto';
import { changePasswordSchema } from '../dto/change-password.dto';
import {
  TokenError,
  RateLimitError,
  AuthError,
  InvalidCredentialsError,
} from '../errors/auth.errors';
import { ZodError } from 'zod';

/**
 * Password Reset Controller
 * Handles HTTP requests for password reset endpoints
 */
export class PasswordResetController {
  constructor(private passwordResetService: PasswordResetService) {}

  /**
   * POST /auth/forgot-password
   * Request password reset email
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const { email } = forgotPasswordSchema.parse(req.body);

      // Request password reset
      await this.passwordResetService.requestReset(email);

      // Always return success to prevent email enumeration
      res.json({ message: 'Password reset email sent' });
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

  /**
   * POST /auth/reset-password
   * Reset password using token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const { token, password } = resetPasswordSchema.parse(req.body);

      // Reset password
      await this.passwordResetService.resetPassword(token, password);

      res.json({ message: 'Password reset successfully' });
    } catch (error: unknown) {
      if (error instanceof TokenError || error instanceof RateLimitError || error instanceof InvalidCredentialsError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
      } else if (error instanceof ZodError) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Validation failed' } });
      } else {
        next(error);
      }
    }
  }

  /**
   * PUT /auth/password
   * Change password (authenticated user)
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      // Get user ID from authenticated request
      const user = (req as any).user;
      if (!user || !user.id) {
        throw new InvalidCredentialsError();
      }

      // Change password
      await this.passwordResetService.changePassword(
        user.id,
        currentPassword,
        newPassword
      );

      res.json({ message: 'Password changed successfully' });
    } catch (error: unknown) {
      if (error instanceof TokenError || error instanceof RateLimitError || error instanceof InvalidCredentialsError || error instanceof AuthError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
      } else if (error instanceof ZodError) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Validation failed' } });
      } else {
        next(error);
      }
    }
  }
}
