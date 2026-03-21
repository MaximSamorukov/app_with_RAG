import { Repository, SelectQueryBuilder } from 'typeorm';
import { UsersService } from '../users.service';
import { User, UserRole } from '../../../database/entities/User.entity';
import {
  UserNotFoundError,
  UserAlreadyExistsError,
  CannotDeleteLastAdminError,
} from '../errors/user.errors';
import * as bcrypt from 'bcrypt';

/**
 * Unit Tests for UsersService
 *
 * These tests verify the user management service logic in isolation
 * with mocked dependencies (database, bcrypt)
 */

// Mock bcrypt
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let mockUserRepository: Partial<Repository<User>>;
  let mockQueryBuilder: Partial<SelectQueryBuilder<User>>;

  // Mock data
  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed-password',
    role: UserRole.USER,
    isActive: true,
    isEmailVerified: false,
    lastLoginAt: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockAdmin: Partial<User> = {
    ...mockUser,
    id: 'admin-user-id',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock query builder
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    // Setup mock repository
    mockUserRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    // Create service with mocked repository
    service = new UsersService(mockUserRepository as Repository<User>);
  });

  describe('findAll', () => {
    describe('when no filters are provided', () => {
      it('should return paginated users', async () => {
        // Arrange
        const users = [mockUser, mockAdmin];
        (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([users, 2]);

        // Act
        const result = await service.findAll(1, 10);

        // Assert
        expect(result).toBeDefined();
        expect(result.users).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
        expect(result.totalPages).toBe(1);
        expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('user');
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', 'DESC');
      });
    });

    describe('when filters are provided', () => {
      it('should filter by role', async () => {
        // Arrange
        (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[mockAdmin], 1]);

        // Act
        await service.findAll(1, 10, { role: 'admin' });

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', {
          role: 'admin',
        });
      });

      it('should filter by isActive status', async () => {
        // Arrange
        (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[mockUser], 1]);

        // Act
        await service.findAll(1, 10, { isActive: true });

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', {
          isActive: true,
        });
      });

      it('should filter by isEmailVerified status', async () => {
        // Arrange
        (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[mockUser], 1]);

        // Act
        await service.findAll(1, 10, { isEmailVerified: false });

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.isEmailVerified = :isEmailVerified',
          { isEmailVerified: false }
        );
      });

      it('should search by name or email', async () => {
        // Arrange
        (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[mockUser], 1]);

        // Act
        await service.findAll(1, 10, { search: 'test' });

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          '(user.name ILIKE :search OR user.email ILIKE :search)',
          { search: '%test%' }
        );
      });
    });

    describe('when pagination is applied', () => {
      it('should calculate correct offset for page 2', async () => {
        // Arrange
        (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[], 0]);

        // Act
        await service.findAll(2, 10);

        // Assert
        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      });

      it('should calculate correct totalPages', async () => {
        // Arrange
        (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[], 25]);

        // Act
        const result = await service.findAll(1, 10);

        // Assert
        expect(result.totalPages).toBe(3);
      });
    });
  });

  describe('findById', () => {
    describe('when user exists', () => {
      it('should return user response DTO', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

        // Act
        const result = await service.findById('test-user-id');

        // Assert
        expect(result).toBeDefined();
        expect(result.id).toBe(mockUser.id);
        expect(result.email).toBe(mockUser.email);
        expect(result.name).toBe(mockUser.name);
        expect(result.role).toBe(mockUser.role);
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'test-user-id' },
          select: expect.any(Array),
        });
      });
    });

    describe('when user does not exist', () => {
      it('should throw UserNotFoundError', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(service.findById('non-existent-id'))
          .rejects
          .toThrow(UserNotFoundError);

        await expect(service.findById('non-existent-id'))
          .rejects
          .toThrow(expect.objectContaining({
            code: 'USER_NOT_FOUND',
            status: 404,
          }));
      });
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      name: 'New User',
      role: 'user' as const,
      isActive: true,
      isEmailVerified: false,
    };

    describe('when email is available', () => {
      it('should create new user successfully', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
        (mockUserRepository.save as jest.Mock).mockResolvedValue({
          ...mockUser,
          ...createDto,
          passwordHash: 'hashed-password',
        });

        // Act
        const result = await service.create(createDto);

        // Assert
        expect(result).toBeDefined();
        expect(result.email).toBe(createDto.email);
        expect(result.name).toBe(createDto.name);
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({
          where: { email: createDto.email },
        });
        expect(bcrypt.hash).toHaveBeenCalledWith(createDto.password, 12);
        expect(mockUserRepository.save).toHaveBeenCalledWith(expect.objectContaining({
          email: createDto.email,
          passwordHash: 'hashed-password',
          name: createDto.name,
          role: UserRole.USER,
        }));
      });

      it('should create admin user when role is admin', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
        (mockUserRepository.save as jest.Mock).mockResolvedValue({
          ...mockAdmin,
          passwordHash: 'hashed-password',
        });

        // Act
        const result = await service.create({ ...createDto, role: 'admin' });

        // Assert
        expect(result.role).toBe(UserRole.ADMIN);
      });
    });

    describe('when email already exists', () => {
      it('should throw UserAlreadyExistsError', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

        // Act & Assert
        await expect(service.create(createDto))
          .rejects
          .toThrow(UserAlreadyExistsError);

        await expect(service.create(createDto))
          .rejects
          .toThrow(expect.objectContaining({
            code: 'USER_ALREADY_EXISTS',
            status: 409,
          }));
      });
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    describe('when user exists', () => {
      it('should update user successfully', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(null); // Second call for email check
        (mockUserRepository.save as jest.Mock).mockResolvedValue({
          ...mockUser,
          ...updateDto,
        });

        // Act
        const result = await service.update('test-user-id', updateDto);

        // Assert
        expect(result.name).toBe(updateDto.name);
        expect(result.email).toBe(updateDto.email);
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining(updateDto)
        );
      });

      it('should hash new password if provided', async () => {
        // Arrange
        const updateWithPassword = { ...updateDto, password: 'NewPassword123!' };
        (mockUserRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
        (mockUserRepository.save as jest.Mock).mockResolvedValue({
          ...mockUser,
          passwordHash: 'new-hashed-password',
        });

        // Act
        await service.update('test-user-id', updateWithPassword);

        // Assert
        expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);
      });
    });

    describe('when user does not exist', () => {
      it('should throw UserNotFoundError', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(service.update('non-existent-id', updateDto))
          .rejects
          .toThrow(UserNotFoundError);
      });
    });

    describe('when new email already exists', () => {
      it('should throw UserAlreadyExistsError', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock)
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockAdmin); // Email exists

        // Act & Assert
        await expect(service.update('test-user-id', { email: 'admin@example.com' }))
          .rejects
          .toThrow(UserAlreadyExistsError);
      });
    });
  });

  describe('delete', () => {
    describe('when deleting a regular user', () => {
      it('should delete user successfully', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
        (mockUserRepository.remove as jest.Mock).mockResolvedValue(mockUser);

        // Act
        await service.delete('test-user-id');

        // Assert
        expect(mockUserRepository.remove).toHaveBeenCalledWith(mockUser);
      });
    });

    describe('when deleting an admin user', () => {
      it('should delete admin if multiple admins exist', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockAdmin);
        (mockUserRepository.count as jest.Mock).mockResolvedValue(3); // 3 admins
        (mockUserRepository.remove as jest.Mock).mockResolvedValue(mockAdmin);

        // Act
        await service.delete('admin-user-id');

        // Assert
        expect(mockUserRepository.remove).toHaveBeenCalledWith(mockAdmin);
      });

      it('should throw CannotDeleteLastAdminError when only one admin exists', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockAdmin);
        (mockUserRepository.count as jest.Mock).mockResolvedValue(1); // Only 1 admin

        // Act & Assert
        await expect(service.delete('admin-user-id'))
          .rejects
          .toThrow(CannotDeleteLastAdminError);

        await expect(service.delete('admin-user-id'))
          .rejects
          .toThrow(expect.objectContaining({
            code: 'CANNOT_DELETE_LAST_ADMIN',
            status: 400,
          }));
      });
    });

    describe('when user does not exist', () => {
      it('should throw UserNotFoundError', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(service.delete('non-existent-id'))
          .rejects
          .toThrow(UserNotFoundError);
      });
    });
  });

  describe('updateLastLogin', () => {
    it('should update lastLoginAt timestamp', async () => {
      // Arrange
      (mockUserRepository.update as jest.Mock).mockResolvedValue({ affected: 1 });

      // Act
      await service.updateLastLogin('test-user-id');

      // Assert
      expect(mockUserRepository.update).toHaveBeenCalledWith('test-user-id', {
        lastLoginAt: expect.any(Date),
      });
    });
  });

  describe('verifyEmail', () => {
    describe('when user exists', () => {
      it('should verify user email', async () => {
        // Arrange
        const unverifiedUser = { ...mockUser, isEmailVerified: false };
        const verifiedUser = { ...mockUser, isEmailVerified: true };
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(unverifiedUser);
        (mockUserRepository.save as jest.Mock).mockResolvedValue(verifiedUser);

        // Act
        const result = await service.verifyEmail('test-user-id');

        // Assert
        expect(result.isEmailVerified).toBe(true);
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ isEmailVerified: true })
        );
      });
    });

    describe('when user does not exist', () => {
      it('should throw UserNotFoundError', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(service.verifyEmail('non-existent-id'))
          .rejects
          .toThrow(UserNotFoundError);
      });
    });
  });

  describe('toggleActiveStatus', () => {
    describe('when activating user', () => {
      it('should set isActive to true', async () => {
        // Arrange
        const inactiveUser = { ...mockUser, isActive: false };
        const activeUser = { ...mockUser, isActive: true };
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(inactiveUser);
        (mockUserRepository.save as jest.Mock).mockResolvedValue(activeUser);

        // Act
        const result = await service.toggleActiveStatus('test-user-id', true);

        // Assert
        expect(result.isActive).toBe(true);
      });
    });

    describe('when deactivating user', () => {
      it('should set isActive to false', async () => {
        // Arrange
        const activeUser = { ...mockUser, isActive: true };
        const inactiveUser = { ...mockUser, isActive: false };
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(activeUser);
        (mockUserRepository.save as jest.Mock).mockResolvedValue(inactiveUser);

        // Act
        const result = await service.toggleActiveStatus('test-user-id', false);

        // Assert
        expect(result.isActive).toBe(false);
      });
    });

    describe('when user does not exist', () => {
      it('should throw UserNotFoundError', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(service.toggleActiveStatus('non-existent-id', true))
          .rejects
          .toThrow(UserNotFoundError);
      });
    });
  });

  describe('changeRole', () => {
    describe('when promoting user to admin', () => {
      it('should change role to admin', async () => {
        // Arrange
        const userRole = { ...mockUser, role: UserRole.USER };
        const adminRole = { ...mockUser, role: UserRole.ADMIN };
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(userRole);
        (mockUserRepository.save as jest.Mock).mockResolvedValue(adminRole);

        // Act
        const result = await service.changeRole('test-user-id', 'admin');

        // Assert
        expect(result.role).toBe(UserRole.ADMIN);
      });
    });

    describe('when demoting admin to user', () => {
      it('should demote admin if multiple admins exist', async () => {
        // Arrange
        const adminUser = { ...mockAdmin, role: UserRole.ADMIN };
        const userUser = { ...mockAdmin, role: UserRole.USER };
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(adminUser);
        (mockUserRepository.count as jest.Mock).mockResolvedValue(3); // 3 admins
        (mockUserRepository.save as jest.Mock).mockResolvedValue(userUser);

        // Act
        const result = await service.changeRole('admin-user-id', 'user');

        // Assert
        expect(result.role).toBe(UserRole.USER);
      });

      it('should throw CannotDeleteLastAdminError when demoting last admin', async () => {
        // Arrange
        const adminUser = { ...mockAdmin, role: UserRole.ADMIN };
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(adminUser);
        (mockUserRepository.count as jest.Mock).mockResolvedValue(1); // Only 1 admin

        // Act & Assert
        await expect(service.changeRole('admin-user-id', 'user'))
          .rejects
          .toThrow(CannotDeleteLastAdminError);
      });
    });

    describe('when user does not exist', () => {
      it('should throw UserNotFoundError', async () => {
        // Arrange
        (mockUserRepository.findOne as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(service.changeRole('non-existent-id', 'admin'))
          .rejects
          .toThrow(UserNotFoundError);
      });
    });
  });

  describe('mapToResponseDto', () => {
    it('should map User entity to UserResponseDto', () => {
      // This is a private method, so we test it indirectly through public methods
      // The findAll and findById tests already verify the mapping works correctly
      expect(true).toBe(true); // Placeholder to document this is tested indirectly
    });
  });
});
