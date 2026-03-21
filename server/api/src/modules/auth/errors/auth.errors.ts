/**
 * Custom error classes for authentication module
 */

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Email or password is incorrect', 401);
  }
}

export class UserNotFoundError extends AuthError {
  constructor() {
    super('USER_NOT_FOUND', 'User not found', 404);
  }
}

export class InvalidTokenError extends AuthError {
  constructor(message: string = 'Invalid token') {
    super('INVALID_TOKEN', message, 401);
  }
}

export class TokenExpiredError extends AuthError {
  constructor() {
    super('TOKEN_EXPIRED', 'Token has expired', 401);
  }
}

export class TokenRevokedError extends AuthError {
  constructor() {
    super('TOKEN_REVOKED', 'Token has been revoked', 401);
  }
}

export class UnauthorizedError extends AuthError {
  constructor() {
    super('UNAUTHORIZED', 'Unauthorized', 401);
  }
}

export class RateLimitExceededError extends AuthError {
  constructor() {
    super('RATE_LIMIT_EXCEEDED', 'Too many login attempts', 429);
  }
}
