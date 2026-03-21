import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UsersService } from './users.service';
import { adminCreateUserSchema } from './dto/admin-create-user.dto';
import { updateUserSchema } from '../auth/dto/update-user.dto';
import {
  UserNotFoundError,
  UserAlreadyExistsError,
  InvalidUserDataError,
  CannotDeleteLastAdminError,
} from './errors/user.errors';

/**
 * Users Controller
 * Handles HTTP requests for admin user management
 */
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * List all users
   * GET /api/v1/users
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const role = req.query.role as 'user' | 'admin' | undefined;
      const isActive = req.query.isActive === 'true'
        ? true
        : req.query.isActive === 'false'
          ? false
          : undefined;
      const isEmailVerified = req.query.isEmailVerified === 'true'
        ? true
        : req.query.isEmailVerified === 'false'
          ? false
          : undefined;
      const search = req.query.search as string | undefined;

      const result = await this.usersService.findAll(page, limit, {
        role,
        isActive,
        isEmailVerified,
        search,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.usersService.findById(req.params.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new user (Admin only)
   * POST /api/v1/users
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = adminCreateUserSchema.parse(req.body);
      const user = await this.usersService.create(dto);
      res.status(201).json(user);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'INVALID_USER_DATA',
            message: error.errors.map((e: any) => e.message).join(', '),
            details: error.errors,
          },
        });
      } else if (error instanceof UserAlreadyExistsError) {
        res.status(error.status).json({
          error: { code: error.code, message: error.message },
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Update user (Admin only)
   * PATCH /api/v1/users/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = updateUserSchema.parse(req.body);
      const user = await this.usersService.update(req.params.id, dto);
      res.json(user);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'INVALID_USER_DATA',
            message: error.errors.map((e: any) => e.message).join(', '),
            details: error.errors,
          },
        });
      } else if (error instanceof UserNotFoundError ||
                 error instanceof UserAlreadyExistsError) {
        res.status(error.status).json({
          error: { code: error.code, message: error.message },
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Delete user (Admin only)
   * DELETE /api/v1/users/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await this.usersService.delete(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      if (error instanceof UserNotFoundError ||
          error instanceof CannotDeleteLastAdminError) {
        res.status(error.status).json({
          error: { code: error.code, message: error.message },
        });
      } else {
        next(error);
      }
    }
  }

  /**
   * Verify user email manually (Admin only)
   * POST /api/v1/users/:id/verify-email
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.usersService.verifyEmail(req.params.id);
      res.json({
        message: 'Email verified successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle user active status (Admin only)
   * PATCH /api/v1/users/:id/toggle-status
   */
  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        throw new InvalidUserDataError('isActive must be a boolean');
      }

      const user = await this.usersService.toggleActiveStatus(req.params.id, isActive);
      res.json({
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change user role (Admin only)
   * PATCH /api/v1/users/:id/role
   */
  async changeRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = req.body;

      if (!role || !['user', 'admin'].includes(role)) {
        throw new InvalidUserDataError('Role must be "user" or "admin"');
      }

      const user = await this.usersService.changeRole(req.params.id, role as 'user' | 'admin');
      res.json({
        message: `User role changed to ${role} successfully`,
        user,
      });
    } catch (error) {
      next(error);
    }
  }
}
