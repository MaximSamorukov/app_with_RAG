import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { loginSchema } from './dto/login.dto';
import { refreshTokenSchema } from './dto/refresh-token.dto';
import {
  InvalidTokenError,
  UnauthorizedError,
  AuthError,
} from './errors/auth.errors';
import { ZodError } from 'zod';

/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /auth/login
   * Authenticate user with email and password
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const { email, password } = loginSchema.parse(req.body);

      // Authenticate user
      const result = await this.authService.login(email, password);

      res.json(result);
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
      } else if (error instanceof ZodError) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Validation failed' } });
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const { refreshToken } = refreshTokenSchema.parse(req.body);

      // Refresh tokens
      const result = await this.authService.refresh(refreshToken);

      res.json(result);
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
      } else if (error instanceof ZodError) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Validation failed' } });
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /auth/logout
   * Logout user by revoking refresh token
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new InvalidTokenError('Refresh token is required');
      }

      await this.authService.logout(refreshToken);

      res.json({ message: 'Logged out successfully' });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
      } else if (error instanceof ZodError) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Validation failed' } });
      } else {
        next(error);
      }
    }
  }

  /**
   * GET /auth/me
   * Get current authenticated user info
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      // User is attached to request by authenticate middleware
      const user = (req as any).user;

      if (!user) {
        throw new UnauthorizedError();
      }

      res.json({ user });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
      } else {
        next(error);
      }
    }
  }
}
