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

/**
 * Registration-specific error codes
 */
export enum RegistrationErrorCode {
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_NAME = 'INVALID_NAME',
}

/**
 * Registration error class
 */
export class RegistrationError extends AuthError {
  constructor(
    code: RegistrationErrorCode,
    message: string,
    status: number = 400
  ) {
    super(code, message, status);
    this.name = 'RegistrationError';
  }

  static emailAlreadyExists(): RegistrationError {
    return new RegistrationError(
      RegistrationErrorCode.EMAIL_ALREADY_EXISTS,
      'Email address is already registered',
      409
    );
  }

  static weakPassword(): RegistrationError {
    return new RegistrationError(
      RegistrationErrorCode.WEAK_PASSWORD,
      'Password does not meet requirements. Must be at least 8 characters with 1 uppercase letter and 1 digit',
      400
    );
  }

  static invalidEmail(): RegistrationError {
    return new RegistrationError(
      RegistrationErrorCode.INVALID_EMAIL,
      'Invalid email address',
      400
    );
  }

  static invalidName(): RegistrationError {
    return new RegistrationError(
      RegistrationErrorCode.INVALID_NAME,
      'Name must be between 2 and 100 characters',
      400
    );
  }
}

/**
 * Token-specific error codes
 */
export enum TokenErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_ALREADY_USED = 'TOKEN_ALREADY_USED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
}

/**
 * Token error class for email verification and password reset tokens
 */
export class TokenError extends AuthError {
  constructor(
    code: TokenErrorCode,
    message: string,
    status: number = 400
  ) {
    super(code, message, status);
    this.name = 'TokenError';
  }

  static invalidToken(): TokenError {
    return new TokenError(
      TokenErrorCode.INVALID_TOKEN,
      'Invalid token format',
      400
    );
  }

  static tokenNotFound(): TokenError {
    return new TokenError(
      TokenErrorCode.TOKEN_NOT_FOUND,
      'Token not found',
      404
    );
  }

  static tokenExpired(): TokenError {
    return new TokenError(
      TokenErrorCode.TOKEN_EXPIRED,
      'Token has expired',
      410
    );
  }

  static tokenAlreadyUsed(): TokenError {
    return new TokenError(
      TokenErrorCode.TOKEN_ALREADY_USED,
      'Token has already been used',
      409
    );
  }

  static weakPassword(): TokenError {
    return new TokenError(
      TokenErrorCode.WEAK_PASSWORD,
      'Password does not meet requirements. Must be at least 8 characters with 1 uppercase letter and 1 digit',
      400
    );
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AuthError {
  constructor(
    message: string = 'Rate limit exceeded',
    status: number = 429
  ) {
    super('RATE_LIMIT_EXCEEDED', message, status);
    this.name = 'RateLimitError';
  }
}
