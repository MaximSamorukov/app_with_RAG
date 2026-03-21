import { Router } from 'express';
import { AuthService } from '../auth/auth.service';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import {
  createAuthenticateMiddleware,
  createRBACMiddleware,
} from '../auth/middleware/authenticate.middleware';

/**
 * Create users router with RBAC protection
 * All routes require authentication + admin role
 */
export function createUsersRouter(
  authService: AuthService,
  usersService: UsersService
): Router {
  const router = Router();

  // Initialize middleware
  const authenticate = createAuthenticateMiddleware(authService);
  const requireAdmin = createRBACMiddleware(['admin']);

  // Initialize controller
  const controller = new UsersController(usersService);

  // ==================== Protected Routes (Admin Only) ====================

  /**
   * GET /api/v1/users
   * List all users with pagination and filtering
   */
  router.get(
    '/',
    authenticate,
    requireAdmin,
    (req, res, next) => controller.list(req, res, next)
  );

  /**
   * GET /api/v1/users/:id
   * Get user details by ID
   */
  router.get(
    '/:id',
    authenticate,
    requireAdmin,
    (req, res, next) => controller.getOne(req, res, next)
  );

  /**
   * POST /api/v1/users
   * Create new user (admin can set role, isEmailVerified, isActive)
   */
  router.post(
    '/',
    authenticate,
    requireAdmin,
    (req, res, next) => controller.create(req, res, next)
  );

  /**
   * PATCH /api/v1/users/:id
   * Update user details
   */
  router.patch(
    '/:id',
    authenticate,
    requireAdmin,
    (req, res, next) => controller.update(req, res, next)
  );

  /**
   * DELETE /api/v1/users/:id
   * Delete user
   */
  router.delete(
    '/:id',
    authenticate,
    requireAdmin,
    (req, res, next) => controller.delete(req, res, next)
  );

  // ==================== Additional Admin Routes ====================

  /**
   * POST /api/v1/users/:id/verify-email
   * Manually verify user email (bypass email token flow)
   */
  router.post(
    '/:id/verify-email',
    authenticate,
    requireAdmin,
    (req, res, next) => controller.verifyEmail(req, res, next)
  );

  /**
   * PATCH /api/v1/users/:id/toggle-status
   * Activate or deactivate user
   */
  router.patch(
    '/:id/toggle-status',
    authenticate,
    requireAdmin,
    (req, res, next) => controller.toggleStatus(req, res, next)
  );

  /**
   * PATCH /api/v1/users/:id/role
   * Change user role (user ↔ admin)
   */
  router.patch(
    '/:id/role',
    authenticate,
    requireAdmin,
    (req, res, next) => controller.changeRole(req, res, next)
  );

  return router;
}
