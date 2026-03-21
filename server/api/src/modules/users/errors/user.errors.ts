/**
 * Base error class for user-related errors
 */
export class UserError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'UserError';
    this.code = code;
    this.status = status;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a user is not found
 */
export class UserNotFoundError extends UserError {
  constructor(userId: string) {
    super(
      'USER_NOT_FOUND',
      `User with ID "${userId}" not found`,
      404
    );
  }
}

/**
 * Thrown when trying to create a user with an existing email
 */
export class UserAlreadyExistsError extends UserError {
  constructor(email: string) {
    super(
      'USER_ALREADY_EXISTS',
      `User with email "${email}" already exists`,
      409
    );
  }
}

/**
 * Thrown when user data validation fails
 */
export class InvalidUserDataError extends UserError {
  constructor(message: string) {
    super(
      'INVALID_USER_DATA',
      message,
      400
    );
  }
}

/**
 * Thrown when trying to delete the last admin user
 */
export class CannotDeleteLastAdminError extends UserError {
  constructor() {
    super(
      'CANNOT_DELETE_LAST_ADMIN',
      'Cannot delete the last admin user. At least one admin must exist.',
      400
    );
  }
}

/**
 * Thrown when unauthorized to perform user operation
 */
export class UserUnauthorizedError extends UserError {
  constructor() {
    super(
      'USER_UNAUTHORIZED',
      'Not authorized to perform this operation',
      403
    );
  }
}
