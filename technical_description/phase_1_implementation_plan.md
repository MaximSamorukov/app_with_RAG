# Phase 1: Authentication & RBAC — Implementation Plan

**Document Version:** 5.0 (Updated)  
**Date:** March 21, 2026  
**Status:** In Progress — 85% Complete  
**Based On:** `technical_description/03_implementation_roadmap.md`

---

## 🎯 Phase 1 Goal

> **Цель:** Пользователи могут войти в систему; маршруты защищены по ролям.

**Definition of Done:**
- ✅ Admin может войти через `/login`
- ✅ Admin может создать пользователя через `/admin/users`
- ✅ User может войти, но не может зайти в `/admin/*`
- ✅ Все API endpoints защищены middleware
- ✅ Тесты проходят (unit + integration)

---

## 📊 Current Status

### ✅ COMPLETED (Done)

| Component | Status | Files | Tests |
|-----------|--------|-------|-------|
| **AuthService** | ✅ Complete | `auth.service.ts` | ✅ 21 test |
| **Auth Middleware** | ✅ Complete | `authenticate.middleware.ts` | ✅ 17 tests |
| **Registration Service** | ✅ Complete | `registration.service.ts` | ✅ 7 tests |
| **Password Reset Service** | ✅ Complete | `password-reset.service.ts` | ✅ 17 tests |
| **Auth Controllers** | ✅ Complete | `*.controller.ts` | ✅ Passing |
| **Auth DTOs** | ✅ Complete | `dto/*.ts` | ✅ Validated |
| **Integration Tests** | ✅ Complete | `*.integration.spec.ts` | ✅ 20+ tests |
| **User Management API** | ✅ Complete | `users/*` (7 files) | ✅ 33 tests |
| **RBAC Applied** | ✅ Complete | `users.router.ts` | ✅ All routes protected |
| **Seed Admin Script** | ✅ Complete | `server/scripts/seed-admin.ts` | ✅ Tested |

**Total Tests:** 128+ passing  
**Code Coverage:** 85%+ statements, 72%+ branches, 100% functions  
**Server Status:** ✅ Running on http://localhost:3000  
**Database:** ✅ Migrations run, admin user created

---

### ⬜ PENDING (To Do)

| # | Task | Type | Estimate | Priority |
|---|------|------|----------|----------|
| **1** | [Auth UI + User Management UI](#4-auth-ui--user-management-ui-frontend) | Frontend | 6-8 hours | 🔴 High |

**Total Remaining:** ~6-8 hours

---

## 📋 Detailed Action Plan

---

## 4. Auth UI + User Management UI (Frontend)

**Status:** ⬜ **PENDING**  
**Priority:** 🔴 **HIGH**  
**Estimated Time:** 6-8 hours  
**Agent:** Frontend Agent

---

### Part 4.1: Auth UI (Login Page)

**Estimated Time:** 2-3 hours

---

#### Files to Create

```
src/
├── pages/
│   └── auth/
│       ├── LoginPage.tsx           # Login page component
│       └── LoginPage.styles.ts     # Styled components (optional)
├── stores/
│   └── authStore.ts                # Zustand auth store
├── components/
│   ├── ProtectedRoute.tsx          # Auth guard component
│   └── AdminRoute.tsx              # Admin guard component
└── features/
    └── auth/
        ├── api/
        │   └── auth.api.ts         # Auth API calls
        └── types/
            └── auth.types.ts       # TypeScript types
```

---

#### Step 4.1.1: Create Auth API

**`src/features/auth/api/auth.api.ts`:**

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  isActive: boolean;
  isEmailVerified: boolean;
}

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await axios.post(`${API_URL}/auth/login`, data);
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    return response.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await axios.post(`${API_URL}/auth/logout`, { refreshToken });
  },

  async getMe(accessToken: string): Promise<User> {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },
};
```

---

#### Step 4.1.2: Create Auth Store (Zustand)

**`src/stores/authStore.ts`:**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User } from '@/features/auth/api/auth.api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (accessToken, refreshToken, user) =>
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

---

#### Step 4.1.3: Create Login Page

**`src/pages/auth/LoginPage.tsx`:**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(data);
      setAuth(response.accessToken, response.refreshToken, response.user);

      // Redirect based on role
      if (response.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/chat');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>RAG Assistant</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

#### Step 4.1.4: Create Protected Routes

**`src/components/ProtectedRoute.tsx`:**

```typescript
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

**`src/components/AdminRoute.tsx`:**

```typescript
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
}
```

---

#### Step 4.1.5: Update App Router

**`src/App.tsx`:**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';
import { ChatPage } from '@/pages/chat/ChatPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { UsersPage } from '@/pages/admin/UsersPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes (any authenticated user) */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        {/* Admin-only routes */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <DashboardPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

### Part 4.2: User Management UI (Frontend)

**Estimated Time:** 4-5 hours

---

#### Files to Create

```
src/
├── pages/
│   └── admin/
│       └── UsersPage.tsx           # User management page
├── features/
│   └── users/
│       ├── api/
│       │   └── users.api.ts        # Users API calls
│       ├── components/
│       │   ├── UserTable.tsx       # Users data table
│       │   ├── UserDialog.tsx      # Create/edit user dialog
│       │   └── DeleteUserDialog.tsx # Delete confirmation
│       └── types/
│           └── user.types.ts       # TypeScript types
```

---

#### Step 4.2.1: Create Users API

**`src/features/users/api/users.api.ts`:**

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role?: 'user' | 'admin';
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  name?: string;
  role?: 'user' | 'admin';
  isActive?: boolean;
}

export interface ListUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export const usersApi = {
  async list(
    accessToken: string,
    params?: { page?: number; limit?: number; role?: string; search?: string }
  ): Promise<ListUsersResponse> {
    const response = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });
    return response.data;
  },

  async getOne(accessToken: string, userId: string): Promise<User> {
    const response = await axios.get(`${API_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },

  async create(accessToken: string, data: CreateUserRequest): Promise<User> {
    const response = await axios.post(`${API_URL}/users`, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },

  async update(accessToken: string, userId: string, data: UpdateUserRequest): Promise<User> {
    const response = await axios.patch(`${API_URL}/users/${userId}`, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },

  async delete(accessToken: string, userId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
```

---

#### Step 4.2.2: Create Users Page

**`src/pages/admin/UsersPage.tsx`:**

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, User } from '@/features/users/api/users.api';
import { useAuthStore } from '@/stores/authStore';
import { UserTable } from '@/features/users/components/UserTable';
import { UserDialog } from '@/features/users/components/UserDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';

export function UsersPage() {
  const { accessToken } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersApi.list(accessToken!, { page, limit: 10, search }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => usersApi.delete(accessToken!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleDelete = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteMutation.mutate(userId);
    }
  };

  const handleCreateUser = (data: any) => {
    // Will be handled by UserDialog
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">User Management</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Create User
          </Button>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : error ? (
          <div>Error loading users</div>
        ) : (
          <UserTable
            users={data?.users || []}
            onDelete={handleDelete}
            total={data?.total || 0}
            page={page}
            onPageChange={setPage}
          />
        )}

        <UserDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSuccess={handleCreateUser}
        />
      </div>
    </div>
  );
}
```

---

### ✅ Acceptance Criteria

#### Auth UI

- [ ] Login page with email + password form
- [ ] Form validation (email format, password min length)
- [ ] Error handling (invalid credentials)
- [ ] Redirect after login (admin → /admin/dashboard, user → /chat)
- [ ] Auth store (Zustand) with persist
- [ ] Protected routes working
- [ ] Admin routes protected
- [ ] Silent refresh on 401

#### User Management UI

- [ ] Users table with pagination
- [ ] Search functionality
- [ ] Create user dialog with validation
- [ ] Edit user dialog
- [ ] Delete confirmation
- [ ] Role change (user ↔ admin)
- [ ] Active/inactive toggle
- [ ] Loading states
- [ ] Error handling

---

## 📊 Summary

### ✅ Completed (85%)

- ✅ AuthService (login, refresh, logout, changePassword)
- ✅ Auth Middleware (authenticate, createRBACMiddleware)
- ✅ Registration & Password Reset services
- ✅ Auth Controllers & Routes
- ✅ Comprehensive tests (95+ tests)
- ✅ User Management API (8 endpoints, 33 tests)
- ✅ RBAC Applied to all routes
- ✅ Seed Admin Script (with helper scripts)
- ✅ Database migrations (with documentation)
- ✅ Admin user created and tested

### ⬜ Remaining (15%)

1. ⬜ **Auth UI + User Management UI** (6-8 hours)

**Total Remaining:** ~6-8 hours

---

## 🎯 Next Actions

### Immediate (Next Session)

**Step 4: Frontend Implementation**

1. **Part 4.1: Auth UI** (2-3 hours)
   - Create Login page
   - Create auth store (Zustand)
   - Create protected routes
   - Test login flow

2. **Part 4.2: User Management UI** (4-5 hours)
   - Create users page
   - Create user table component
   - Create user dialog (create/edit)
   - Test CRUD operations

### After Phase 1 Complete

- Proceed to Phase 2: Document Upload & Indexation
- Create vector index (after loading test data)
- Security audit
- Documentation update

---

**Last Updated:** March 21, 2026  
**Version:** 5.0  
**Status:** 85% Complete — Ready for Frontend Implementation

