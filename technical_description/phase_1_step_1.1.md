# Phase 1: Authentication & RBAC — Implementation Plan

**Document Version:** 1.0  
**Date:** March 21, 2026  
**Status:** Ready for Implementation  
**Phase Duration:** ~3-4 days

---

## 🎯 Phase 1 Overview

**Goal:** Implement complete authentication system with JWT tokens, role-based access control (RBAC), and user management.

**Priority:** High (blocks all other features)

**Dependencies:** Phase 0 (Infrastructure) ✅ Complete

---

## 📋 Phase 1 Steps

| Step | Name | Duration | Status |
|------|------|----------|--------|
| 1.1 | JWT Authentication Module | ~7 hours | ⬜ Pending |
| 1.2 | User Registration & Password Reset | ~4 hours | ⬜ Pending |
| 1.3 | RBAC Middleware | ~3 hours | ⬜ Pending |
| 1.4 | User Management API (Admin) | ~5 hours | ⬜ Pending |
| 1.5 | Testing & Security Audit | ~4 hours | ⬜ Pending |

---

# Step 1.1: JWT Authentication Module

## Task Description

**Name:** Implement JWT Authentication Service

**Objective:** Create a complete JWT-based authentication system with access tokens, refresh tokens, and secure token management.

---

## ✅ Acceptance Criteria (Definition of Done)

The task is considered **complete** when ALL of the following are true:

### 1. Service Implementation ✅

- [ ] `AuthService` created in `server/api/src/modules/auth/auth.service.ts`
- [ ] Service implements the following methods:
  - [ ] `login(email: string, password: string)` → Returns `{ accessToken, refreshToken, user }`
  - [ ] `refresh(refreshToken: string)` → Returns `{ accessToken, refreshToken }`
  - [ ] `logout(refreshToken: string)` → Revokes refresh token
  - [ ] `validateAccessToken(token: string)` → Returns decoded payload or null
  - [ ] `validateRefreshToken(token: string)` → Returns decoded payload or null
  - [ ] `hashPassword(password: string)` → Returns hashed password
  - [ ] `comparePassword(password: string, hash: string)` → Returns boolean

### 2. Token Configuration ✅

**Access Token:**
- Type: JWT
- Expiration: 15 minutes (from `.env`)
- Payload: `{ sub: userId, email, role, iat, exp }`
- Secret: `JWT_ACCESS_SECRET` from `.env`
- Algorithm: HS256

**Refresh Token:**
- Type: Random 64-byte string (crypto.randomBytes)
- Expiration: 7 days (from `.env`)
- Stored as SHA-256 hash in database
- Secret: `JWT_REFRESH_SECRET` from `.env`

### 3. Database Integration ✅

- [ ] `RefreshToken` entity used correctly
- [ ] Refresh tokens stored in database with:
  - [ ] `token_hash` (SHA-256 hash)
  - [ ] `expires_at`
  - [ ] `user_id` (foreign key)
  - [ ] `fingerprint` (optional, for device tracking)
- [ ] Expired tokens automatically cleaned up or checked on validation
- [ ] Revoked tokens marked with `revoked_at` timestamp

### 4. Security Requirements ✅

- [ ] Passwords hashed with bcrypt (cost factor: 12)
- [ ] Refresh tokens hashed with SHA-256 before storage
- [ ] Token validation checks expiration
- [ ] Token validation checks signature
- [ ] Revoked tokens cannot be reused
- [ ] Rate limiting on login endpoint (5 attempts/minute)
- [ ] Secure password policy (min 8 chars, 1 digit)

### 5. API Endpoints ✅

Created and documented:

- [ ] `POST /api/v1/auth/login` — User login
- [ ] `POST /api/v1/auth/refresh` — Refresh access token
- [ ] `POST /api/v1/auth/logout` — Logout user
- [ ] `GET /api/v1/auth/me` — Get current user info

**Endpoint Specifications:**

```typescript
// POST /api/v1/auth/login
// Request: { email: string, password: string }
// Response: 200 { accessToken: string, refreshToken: string, user: { id, email, name, role } }
// Errors: 401 INVALID_CREDENTIALS, 404 USER_NOT_FOUND

// POST /api/v1/auth/refresh
// Request: { refreshToken: string }
// Response: 200 { accessToken: string, refreshToken: string }
// Errors: 401 INVALID_TOKEN, TOKEN_EXPIRED

// POST /api/v1/auth/logout
// Request: { refreshToken: string }
// Response: 200 { message: "Logged out successfully" }
// Errors: 401 INVALID_TOKEN

// GET /api/v1/auth/me
// Headers: Authorization: Bearer <token>
// Response: 200 { user: { id, email, name, role } }
// Errors: 401 UNAUTHORIZED
```

### 6. Error Handling ✅

Standardized error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

**Error Codes:**

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 401 | `INVALID_CREDENTIALS` | Email or password incorrect |
| 401 | `TOKEN_EXPIRED` | Token has expired |
| 401 | `INVALID_TOKEN` | Token format invalid |
| 401 | `TOKEN_REVOKED` | Token was revoked |
| 401 | `UNAUTHORIZED` | No token provided |
| 404 | `USER_NOT_FOUND` | User doesn't exist |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many login attempts |

### 7. Tests ✅

**Unit Tests (AuthService):**
- [ ] Login with valid credentials → Success
- [ ] Login with invalid credentials → 401
- [ ] Login with non-existent user → 404
- [ ] Token refresh → New tokens returned
- [ ] Token refresh with expired token → 401
- [ ] Token refresh with revoked token → 401
- [ ] Password hashing → Different hashes
- [ ] Password comparison → Correct match
- [ ] Logout → Token revoked

**Integration Tests (Endpoints):**
- [ ] POST /auth/login (success)
- [ ] POST /auth/login (failure)
- [ ] POST /auth/refresh (valid token)
- [ ] POST /auth/refresh (expired token)
- [ ] POST /auth/logout
- [ ] GET /auth/me (authenticated)
- [ ] GET /auth/me (unauthenticated)

### 8. Documentation ✅

- [ ] API documentation in `technical_description/phase_1.md`
- [ ] OpenAPI/Swagger spec updated
- [ ] Environment variables documented
- [ ] Usage examples provided
- [ ] Security considerations documented

---

## 📁 Files to Create/Modify

### Create:

```
server/api/src/modules/auth/
├── auth.module.ts                 # Module definition
├── auth.service.ts                # Core authentication logic
├── auth.controller.ts             # Request handlers
├── auth.router.ts                 # Express router
├── dto/
│   ├── login.dto.ts               # Login request validation
│   ├── refresh-token.dto.ts       # Refresh token validation
│   ├── auth-response.dto.ts       # Response type definitions
│   └── user-response.dto.ts       # User response type
├── middleware/
│   ├── authenticate.middleware.ts # JWT validation
│   └── rbac.middleware.ts         # Role-based access control
├── types/
│   └── jwt-payload.type.ts        # JWT payload interface
└── errors/
    └── auth.errors.ts             # Custom error classes
```

### Modify:

```
server/api/src/main.ts                    # Add auth routes
server/api/src/database/entities/User.entity.ts     # Verify structure
server/api/src/database/entities/RefreshToken.entity.ts  # Verify structure
```

---

## 🔧 Implementation Steps

### Step 1: Setup (30 min)

```bash
# Create directory structure
mkdir -p server/api/src/modules/auth/{dto,middleware,types,errors}

# Install dependencies
cd server/api
npm install jsonwebtoken bcryptjs zod
npm install -D @types/jsonwebtoken @types/bcryptjs
```

### Step 2: Create DTOs (30 min)

Create Zod schemas for validation:

```typescript
// login.dto.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginDto = z.infer<typeof loginSchema>;
```

### Step 3: Implement AuthService (2 hours)

Core service with all authentication logic:

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    // 1. Find user
    // 2. Validate password
    // 3. Generate tokens
    // 4. Store refresh token hash
    // 5. Return tokens + user
  }

  async refresh(refreshToken: string): Promise<TokenResponse> {
    // 1. Validate refresh token
    // 2. Check expiration
    // 3. Check revocation
    // 4. Generate new tokens
    // 5. Return
  }

  async logout(refreshToken: string): Promise<void> {
    // 1. Find token
    // 2. Mark as revoked
  }
}
```

### Step 4: Create Auth Middleware (1 hour)

JWT validation middleware:

```typescript
// authenticate.middleware.ts
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // 1. Extract token from header
  // 2. Validate token
  // 3. Attach user to request
  // 4. Call next
}
```

### Step 5: Implement Controller & Routes (1 hour)

HTTP endpoints:

```typescript
// auth.router.ts
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
```

### Step 6: Write Tests (2 hours)

Comprehensive test coverage:

```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  it('should login with valid credentials', async () => {
    // Test implementation
  });
});
```

### Step 7: Documentation (30 min)

Update `technical_description/phase_1.md` with:
- API endpoints
- Request/response examples
- Error codes
- Security considerations

---

## 🧪 Test Cases

### Login Success
```typescript
POST /api/v1/auth/login
Body: { email: "user@example.com", password: "Password123!" }
Expected: 200 OK
Response: { 
  accessToken: "eyJhbG...", 
  refreshToken: "abc123...", 
  user: { id: "uuid", email: "user@example.com", name: "John", role: "user" } 
}
```

### Login Failure
```typescript
POST /api/v1/auth/login
Body: { email: "user@example.com", password: "wrong" }
Expected: 401 Unauthorized
Response: { error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } }
```

### Token Refresh
```typescript
POST /api/v1/auth/refresh
Body: { refreshToken: "valid_token" }
Expected: 200 OK
Response: { accessToken: "new_access_token", refreshToken: "new_refresh_token" }
```

### Protected Route
```typescript
GET /api/v1/auth/me
Headers: { Authorization: "Bearer <access_token>" }
Expected: 200 OK
Response: { user: { id, email, name, role } }
```

### Rate Limiting
```typescript
POST /api/v1/auth/login (6 times in 1 minute)
Expected: 429 Too Many Requests
Response: { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many login attempts" } }
```

---

## 📊 Progress Tracking

| Subtask | Status | Estimated Time | Actual Time |
|---------|--------|----------------|-------------|
| Directory structure | ⬜ Pending | 15 min | - |
| DTOs & Types | ⬜ Pending | 30 min | - |
| AuthService | ⬜ Pending | 2 hours | - |
| Middleware | ⬜ Pending | 1 hour | - |
| Controller/Routes | ⬜ Pending | 1 hour | - |
| Tests | ⬜ Pending | 2 hours | - |
| Documentation | ⬜ Pending | 30 min | - |
| **TOTAL** | | **~7 hours** | **-** |

---

## ✅ Sign-off Checklist

Before marking Step 1.1 as complete:

- [ ] All acceptance criteria met
- [ ] All tests passing (unit + integration)
- [ ] Code coverage > 80%
- [ ] Code reviewed by team
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Security review completed
- [ ] Demo successful (login/logout works)
- [ ] Performance tested (response time < 200ms)

---

## 🔐 Security Checklist

- [ ] Passwords never stored in plain text
- [ ] Tokens signed with secure secrets
- [ ] Token expiration enforced
- [ ] Rate limiting implemented
- [ ] HTTPS required in production
- [ ] CORS configured properly
- [ ] SQL injection prevented (TypeORM parameterized)
- [ ] XSS prevented (input validation)

---

## 📝 Notes

**Environment Variables Required:**

```env
# JWT Authentication
JWT_ACCESS_SECRET=<secure-random-string-64-chars>
JWT_REFRESH_SECRET=<secure-random-string-64-chars>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=5
```

**Dependencies:**

```json
{
  "jsonwebtoken": "^9.0.0",
  "bcryptjs": "^2.4.3",
  "zod": "^3.22.0",
  "@types/jsonwebtoken": "^9.0.0",
  "@types/bcryptjs": "^2.4.0"
}
```

---

## 🚀 Next Steps

After completing Step 1.1:

1. **Step 1.2:** User Registration & Password Reset
2. **Step 1.3:** RBAC Middleware
3. **Step 1.4:** User Management API (Admin)
4. **Step 1.5:** Testing & Security Audit

---

**Last Updated:** March 21, 2026  
**Author:** RAG Assistant Team  
**Status:** Ready for Implementation
