import { UserRole } from '../../../database/entities/User.entity';

/**
 * User response DTO interface
 */
export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

/**
 * List users response DTO interface
 */
export interface ListUsersResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
