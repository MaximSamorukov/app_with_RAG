# Phase 1 Step 1.2: User Registration & Password Reset

**Document Version:** 1.0  
**Date:** March 21, 2026  
**Status:** Ready for Implementation  
**Estimated Duration:** ~4 hours

---

## 📋 Overview

**Goal:** Implement user registration with email verification and password reset functionality.

**Dependencies:** Step 1.1 (JWT Authentication Module) ✅ Complete

**Blocks:** Step 1.3 (RBAC Middleware), Step 1.4 (User Management API)

---

## 🎯 Business Requirements

### User Stories

1. **As a new user**, I want to register with email and password, so I can access the system.

2. **As a registered user**, I want to verify my email address, so I can activate my account.

3. **As a user who forgot password**, I want to request a password reset link, so I can regain access.

4. **As a user with reset token**, I want to set a new password, so I can continue using the system.

---

## ✅ Acceptance Criteria

### 1. User Registration ✅

**Endpoint:** `POST /api/v1/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "message": "Registration successful. Please verify your email.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "isEmailVerified": false
  }
}
```

**Validation Rules:**
- [ ] Email: Valid email format, unique in database
- [ ] Password: Min 8 characters, at least 1 digit, 1 uppercase letter
- [ ] Name: Min 2 characters, max 100 characters

**Error Cases:**

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_EMAIL` | Invalid email format |
| 400 | `WEAK_PASSWORD` | Password doesn't meet requirements |
| 400 | `INVALID_NAME` | Name is too short or too long |
| 409 | `EMAIL_ALREADY_EXISTS` | Email already registered |

---

### 2. Email Verification ✅

**Endpoint:** `POST /api/v1/auth/verify-email`

**Request:**
```json
{
  "token": "email-verification-token"
}
```

**Response (200 OK):**
```json
{
  "message": "Email verified successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "isEmailVerified": true
  }
}
```

**Implementation:**
- [ ] Generate unique verification token (crypto.randomBytes)
- [ ] Token expiration: 24 hours
- [ ] Store token hash in database
- [ ] Mark email as verified on successful validation
- [ ] Token can only be used once

**Error Cases:**

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_TOKEN` | Token format invalid |
| 404 | `TOKEN_NOT_FOUND` | Token doesn't exist |
| 410 | `TOKEN_EXPIRED` | Token has expired |
| 409 | `ALREADY_VERIFIED` | Email already verified |

---

### 3. Resend Verification Email ✅

**Endpoint:** `POST /api/v1/auth/resend-verification`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Verification email sent"
}
```

**Implementation:**
- [ ] Rate limit: 3 requests per hour per email
- [ ] Generate new token
- [ ] Invalidate old tokens
- [ ] Send email (mock for now, webhook for production)

**Error Cases:**

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 404 | `USER_NOT_FOUND` | Email not registered |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |

---

### 4. Forgot Password ✅

**Endpoint:** `POST /api/v1/auth/forgot-password`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset email sent"
}
```

**Implementation:**
- [ ] Generate unique reset token (crypto.randomBytes)
- [ ] Token expiration: 1 hour
- [ ] Store token hash in database
- [ ] Rate limit: 5 requests per hour per email
- [ ] Don't reveal if email exists (security)

**Error Cases:**

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_EMAIL` | Invalid email format |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |

---

### 5. Reset Password ✅

**Endpoint:** `POST /api/v1/auth/reset-password`

**Request:**
```json
{
  "token": "password-reset-token",
  "password": "NewPassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```

**Implementation:**
- [ ] Validate reset token
- [ ] Check token expiration
- [ ] Validate new password strength
- [ ] Hash new password
- [ ] Invalidate all refresh tokens
- [ ] Invalidate all reset tokens

**Error Cases:**

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_TOKEN` | Token format invalid |
| 400 | `WEAK_PASSWORD` | Password doesn't meet requirements |
| 404 | `TOKEN_NOT_FOUND` | Token doesn't exist |
| 410 | `TOKEN_EXPIRED` | Token has expired |

---

### 6. Change Password (Authenticated) ✅

**Endpoint:** `PUT /api/v1/auth/password`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

**Implementation:**
- [ ] Require authentication
- [ ] Validate current password
- [ ] Validate new password strength
- [ ] Hash new password
- [ ] Invalidate all refresh tokens (security)

**Error Cases:**

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `WEAK_PASSWORD` | New password too weak |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 400 | `INVALID_PASSWORD` | Current password incorrect |

---

## 📁 Files to Create

### Service Layer

```
server/api/src/modules/auth/
├── services/
│   ├── registration.service.ts      # User registration logic
│   ├── email-verification.service.ts # Email verification logic
│   └── password-reset.service.ts     # Password reset logic
```

### Controllers

```
server/api/src/modules/auth/
├── controllers/
│   ├── registration.controller.ts   # Registration handlers
│   └── password-reset.controller.ts  # Password reset handlers
```

### DTOs

```
server/api/src/modules/auth/dto/
├── register.dto.ts                  # Registration validation
├── verify-email.dto.ts              # Email verification validation
├── forgot-password.dto.ts           # Forgot password validation
├── reset-password.dto.ts            # Reset password validation
└── change-password.dto.ts           # Change password validation
```

### Database Entities

```
server/api/src/database/entities/
└── EmailVerificationToken.entity.ts  # Email verification tokens
```

### Routes

```
server/api/src/modules/auth/auth.router.ts  # Update with new routes
```

---

## 🔧 Implementation Steps

### Step 1: Database Entity (30 min)

Create `EmailVerificationToken` entity:

```typescript
@Entity('email_verification_tokens')
export class EmailVerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ name: 'type', type: 'varchar', length: 20 })
  type: 'email_verification' | 'password_reset';

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
```

### Step 2: Registration Service (1 hour)

Implement `RegistrationService`:

```typescript
@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailVerificationService: EmailVerificationService,
  ) {}

  async register(dto: RegisterDto): Promise<RegistrationResponse> {
    // 1. Check if email exists
    // 2. Validate password strength
    // 3. Create user
    // 4. Generate verification token
    // 5. Send verification email (mock)
    // 6. Return user (without password)
  }
}
```

### Step 3: Email Verification Service (45 min)

Implement `EmailVerificationService`:

```typescript
@Injectable()
export class EmailVerificationService {
  async generateVerificationToken(userId: string): Promise<string> {
    // 1. Generate random token
    // 2. Hash token
    // 3. Store in database
    // 4. Return plain token
  }

  async verifyToken(token: string): Promise<User> {
    // 1. Find token
    // 2. Check expiration
    // 3. Check not used
    // 4. Mark user as verified
    // 5. Mark token as used
  }
}
```

### Step 4: Password Reset Service (45 min)

Implement `PasswordResetService`:

```typescript
@Injectable()
export class PasswordResetService {
  async requestReset(email: string): Promise<void> {
    // 1. Find user by email
    // 2. Generate reset token
    // 3. Store token hash
    // 4. Send reset email (mock)
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // 1. Validate token
    // 2. Validate password strength
    // 3. Hash new password
    // 4. Update user password
    // 5. Invalidate all tokens
  }
}
```

### Step 5: Controllers (45 min)

Implement controllers:

```typescript
@Controller('auth')
export class RegistrationController {
  constructor(
    private registrationService: RegistrationService,
    private emailVerificationService: EmailVerificationService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.registrationService.register(dto);
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.emailVerificationService.verifyToken(dto.token);
  }

  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.emailVerificationService.resendVerification(dto.email);
  }
}
```

### Step 6: Update Routes (15 min)

Add new routes to `auth.router.ts`:

```typescript
// Registration routes
router.post('/register', registrationController.register);
router.post('/verify-email', registrationController.verifyEmail);
router.post('/resend-verification', registrationController.resendVerification);

// Password reset routes
router.post('/forgot-password', passwordResetController.forgotPassword);
router.post('/reset-password', passwordResetController.resetPassword);
router.put('/password', authenticate, passwordResetController.changePassword);
```

### Step 7: Tests (1.5 hours)

Create test files:

```typescript
// registration.service.spec.ts
describe('RegistrationService', () => {
  it('should register user with valid data', async () => {
    // Test implementation
  });

  it('should reject weak password', async () => {
    // Test implementation
  });

  it('should reject duplicate email', async () => {
    // Test implementation
  });
});

// password-reset.integration.spec.ts
describe('Password Reset Endpoints', () => {
  it('should send reset email', async () => {
    // Test implementation
  });

  it('should reset password with valid token', async () => {
    // Test implementation
  });

  it('should reject expired token', async () => {
    // Test implementation
  });
});
```

---

## 🧪 Test Cases

### Registration Tests

```typescript
// Unit Tests
describe('RegistrationService', () => {
  ✅ Register with valid data → Success
  ✅ Register with weak password → 400
  ✅ Register with duplicate email → 409
  ✅ Register with invalid email → 400
  ✅ Register with short name → 400
});

// Integration Tests
describe('POST /auth/register', () => {
  ✅ Valid registration → 201
  ✅ Duplicate email → 409
  ✅ Weak password → 400
  ✅ Invalid email format → 400
});
```

### Email Verification Tests

```typescript
// Unit Tests
describe('EmailVerificationService', () => {
  ✅ Verify with valid token → Success
  ✅ Verify with expired token → 410
  ✅ Verify with used token → 410
  ✅ Verify non-existent token → 404
});

// Integration Tests
describe('POST /auth/verify-email', () => {
  ✅ Valid token → 200
  ✅ Expired token → 410
  ✅ Already verified → 409
});
```

### Password Reset Tests

```typescript
// Unit Tests
describe('PasswordResetService', () => {
  ✅ Request reset → Token generated
  ✅ Reset with valid token → Success
  ✅ Reset with expired token → 410
  ✅ Reset with weak password → 400
});

// Integration Tests
describe('POST /auth/forgot-password', () => {
  ✅ Valid email → 200
  ✅ Rate limit exceeded → 429
});

describe('POST /auth/reset-password', () => {
  ✅ Valid token + password → 200
  ✅ Expired token → 410
  ✅ Weak password → 400
});
```

---

## 📊 Progress Tracking

| Subtask | Status | Estimated | Actual |
|---------|--------|-----------|--------|
| Database Entity | ⬜ Pending | 30 min | - |
| Registration Service | ⬜ Pending | 1 hour | - |
| Email Verification Service | ⬜ Pending | 45 min | - |
| Password Reset Service | ⬜ Pending | 45 min | - |
| Controllers | ⬜ Pending | 45 min | - |
| Routes | ⬜ Pending | 15 min | - |
| Tests | ⬜ Pending | 1.5 hours | - |
| **TOTAL** | | **~4 hours** | **-** |

---

## 🔐 Security Considerations

### Password Requirements

```typescript
// Password validation regex
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W]{8,}$/;

// Requirements:
// - Minimum 8 characters
// - At least 1 uppercase letter
// - At least 1 digit
// - Any special characters allowed
```

### Token Security

- [ ] Tokens generated with `crypto.randomBytes(32)`
- [ ] Tokens hashed with SHA-256 before storage
- [ ] Tokens have expiration times
- [ ] Tokens can only be used once
- [ ] Rate limiting on all token endpoints

### Email Verification Flow

```
1. User registers → isEmailVerified = false
2. System sends verification email
3. User clicks link with token
4. System validates token
5. User marked as verified
6. Token marked as used
```

### Password Reset Flow

```
1. User requests reset
2. System sends reset email (don't reveal if email exists)
3. User clicks link with token
4. User enters new password
5. System validates token + password
6. Password updated, all tokens invalidated
```

---

## 📝 Environment Variables

```env
# Email Verification
EMAIL_VERIFICATION_TOKEN_EXPIRY=24h

# Password Reset
PASSWORD_RESET_TOKEN_EXPIRY=1h
PASSWORD_RESET_RATE_LIMIT=5
PASSWORD_RESET_RATE_LIMIT_WINDOW=60m

# Email Service (for production)
EMAIL_SERVICE_PROVIDER=sendgrid
EMAIL_FROM=noreply@example.com
EMAIL_API_KEY=your-api-key
```

---

## ✅ Sign-off Checklist

Before marking Step 1.2 as complete:

- [ ] All acceptance criteria met
- [ ] All tests passing (unit + integration)
- [ ] Code coverage > 80%
- [ ] Password validation working
- [ ] Email verification flow tested
- [ ] Password reset flow tested
- [ ] Rate limiting implemented
- [ ] Security review completed
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No ESLint warnings

---

## 🚀 Next Steps

After completing Step 1.2:

1. **Step 1.3:** RBAC Middleware — Role-based access control
2. **Step 1.4:** User Management API (Admin) — Admin user CRUD
3. **Step 1.5:** Testing & Security Audit — Comprehensive testing

---

## 📋 API Summary

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/verify-email` | No | Verify email address |
| POST | `/auth/resend-verification` | No | Resend verification email |
| POST | `/auth/forgot-password` | No | Request password reset |
| POST | `/auth/reset-password` | No | Reset password with token |
| PUT | `/auth/password` | Yes | Change password (authenticated) |

---

**Last Updated:** March 21, 2026  
**Author:** RAG Assistant Team  
**Status:** Ready for Implementation
