import { Router } from 'express';
import { AuthController } from './auth.controller';
import { createAuthenticateMiddleware } from './middleware/authenticate.middleware';
import { AuthService } from './auth.service';

/**
 * Create authentication router
 */
export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const controller = new AuthController(authService);
  const authenticate = createAuthenticateMiddleware(authService);

  // Public routes
  router.post('/login', (req, res, next) => controller.login(req, res, next));
  router.post('/refresh', (req, res, next) => controller.refresh(req, res, next));
  router.post('/logout', (req, res, next) => controller.logout(req, res, next));

  // Protected routes
  router.get('/me', authenticate, (req, res, next) => controller.getMe(req, res, next));

  return router;
}
