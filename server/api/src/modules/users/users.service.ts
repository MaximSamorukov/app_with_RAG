import { Repository } from 'typeorm';
import { User, UserRole } from '../../database/entities/User.entity';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { UpdateUserDto } from '../auth/dto/update-user.dto';
import { UserResponseDto, ListUsersResponseDto } from './dto/user-response.dto';
import {
  UserNotFoundError,
  UserAlreadyExistsError,
  InvalidUserDataError,
  CannotDeleteLastAdminError,
} from './errors/user.errors';
import * as bcrypt from 'bcrypt';

/**
 * Users Service
 * Handles all user-related business logic for ADMIN operations
 *
 * Note: User registration is handled by RegistrationService in auth module
 */
export class UsersService {
  constructor(private userRepository: Repository<User>) {}

  /**
   * List all users with pagination and filtering
   * Used by admin to manage users
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      role?: 'user' | 'admin';
      isActive?: boolean;
      search?: string;
      isEmailVerified?: boolean;
    }
  ): Promise<ListUsersResponseDto> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Apply filters
    if (filters?.role) {
      queryBuilder.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters?.isEmailVerified !== undefined) {
      queryBuilder.andWhere('user.isEmailVerified = :isEmailVerified', {
        isEmailVerified: filters.isEmailVerified,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Pagination
    queryBuilder.skip((page - 1) * limit).take(limit);
    queryBuilder.orderBy('user.createdAt', 'DESC');

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users: users.map(this.mapToResponseDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user by ID
   */
  async findById(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'name',
        'role',
        'isActive',
        'isEmailVerified',
        'createdAt',
        'updatedAt',
        'lastLoginAt',
      ],
    });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Get user by email (for internal use)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  /**
   * Create new user (Admin only)
   *
   * Difference from registration:
   * - Admin can set role (user/admin)
   * - Admin can set isEmailVerified (for manual user creation)
   * - Admin can set isActive status
   * - No email verification token generated (admin can verify manually)
   */
  async create(dto: AdminCreateUserDto): Promise<UserResponseDto> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new UserAlreadyExistsError(dto.email);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.userRepository.save({
      email: dto.email,
      passwordHash: hashedPassword,
      name: dto.name,
      role: dto.role || UserRole.USER,
      isActive: dto.isActive ?? true,
      isEmailVerified: dto.isEmailVerified ?? false,
    });

    return this.mapToResponseDto(user);
  }

  /**
   * Update user (Admin only)
   *
   * Admin can update:
   * - name, email, role
   * - isActive (enable/disable user)
   * - isEmailVerified (manually verify email)
   * - password (if provided)
   */
  async update(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Check email uniqueness if changing email
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new UserAlreadyExistsError(dto.email);
      }
    }

    // Hash new password if changing
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    // Update fields
    if (dto.email) user.email = dto.email;
    if (dto.name) user.name = dto.name;
    if (dto.role) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.isEmailVerified !== undefined) user.isEmailVerified = dto.isEmailVerified;

    await this.userRepository.save(user);

    return this.mapToResponseDto(user);
  }

  /**
   * Delete user (Admin only)
   *
   * Prevents deletion of:
   * - Last admin user (at least one admin must exist)
   * - Currently logged in user (handled by controller)
   */
  async delete(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Prevent deleting last admin
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.userRepository.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new CannotDeleteLastAdminError();
      }
    }

    await this.userRepository.remove(user);
  }

  /**
   * Update user's last login timestamp
   * Called by AuthService after successful login
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * Manually verify user's email (Admin only)
   * Alternative to email verification token flow
   */
  async verifyEmail(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    user.isEmailVerified = true;
    await this.userRepository.save(user);

    return this.mapToResponseDto(user);
  }

  /**
   * Activate or deactivate user (Admin only)
   */
  async toggleActiveStatus(userId: string, isActive: boolean): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    user.isActive = isActive;
    await this.userRepository.save(user);

    return this.mapToResponseDto(user);
  }

  /**
   * Change user role (Admin only)
   */
  async changeRole(
    userId: string,
    newRole: 'user' | 'admin'
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Prevent removing the last admin
    if (user.role === UserRole.ADMIN && newRole === 'user') {
      const adminCount = await this.userRepository.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new CannotDeleteLastAdminError();
      }
    }

    user.role = newRole as UserRole;
    await this.userRepository.save(user);

    return this.mapToResponseDto(user);
  }

  /**
   * Map User entity to response DTO
   */
  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
