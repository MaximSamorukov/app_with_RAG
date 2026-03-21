import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth.service';
import { UnauthorizedError, TokenExpiredError } from '../errors/auth.errors';

/**
 * Authentication Middleware
 * Validates JWT access token and attaches user info to request
 */
export function createAuthenticateMiddleware(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError();
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Validate token
      const payload = authService.validateAccessToken(token);

      if (!payload) {
        throw new TokenExpiredError();
      }

      // Attach user info to request
      (req as any).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      next();
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof TokenExpiredError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
      } else {
        next(error);
      }
    }
  };
}

/**
 * RBAC Middleware Factory
 * Creates middleware that checks for specific roles
 */
export function createRBACMiddleware(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
      return;
    }

    next();
  };
}
