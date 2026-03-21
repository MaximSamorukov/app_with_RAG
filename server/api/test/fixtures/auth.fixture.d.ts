import { UserRole } from '../../src/database/entities/User.entity';
/**
 * Test fixtures for authentication module
 */
export declare const mockUser: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    passwordHash: string;
    isActive: boolean;
    lastLoginAt: null;
    createdAt: Date;
    updatedAt: Date;
};
export declare const mockAdminUser: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    passwordHash: string;
    isActive: boolean;
    lastLoginAt: null;
    createdAt: Date;
    updatedAt: Date;
};
export declare const mockTokens: {
    accessToken: string;
    refreshToken: string;
};
export declare const mockRefreshTokenEntity: {
    id: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: null;
    revokedReason: null;
    fingerprint: string;
    createdAt: Date;
    userId: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        passwordHash: string;
        isActive: boolean;
        lastLoginAt: null;
        createdAt: Date;
        updatedAt: Date;
    };
};
export declare const mockRevokedRefreshToken: {
    revokedAt: Date;
    revokedReason: string;
    id: string;
    tokenHash: string;
    expiresAt: Date;
    fingerprint: string;
    createdAt: Date;
    userId: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        passwordHash: string;
        isActive: boolean;
        lastLoginAt: null;
        createdAt: Date;
        updatedAt: Date;
    };
};
export declare const mockExpiredRefreshToken: {
    expiresAt: Date;
    id: string;
    tokenHash: string;
    revokedAt: null;
    revokedReason: null;
    fingerprint: string;
    createdAt: Date;
    userId: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        passwordHash: string;
        isActive: boolean;
        lastLoginAt: null;
        createdAt: Date;
        updatedAt: Date;
    };
};
export declare const loginRequest: {
    email: string;
    password: string;
};
export declare const invalidLoginRequest: {
    email: string;
    password: string;
};
export declare const nonExistentUserLogin: {
    email: string;
    password: string;
};
export declare const jwtPayload: {
    sub: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
};
export declare const userResponse: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
};
export declare const authResponse: {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
    };
};
export declare const tokenResponse: {
    accessToken: string;
    refreshToken: string;
};
/**
 * Error response helpers
 */
export declare const errorResponses: {
    invalidCredentials: {
        status: number;
        error: {
            code: string;
            message: string;
        };
    };
    userNotFound: {
        status: number;
        error: {
            code: string;
            message: string;
        };
    };
    invalidToken: {
        status: number;
        error: {
            code: string;
            message: string;
        };
    };
    tokenExpired: {
        status: number;
        error: {
            code: string;
            message: string;
        };
    };
    tokenRevoked: {
        status: number;
        error: {
            code: string;
            message: string;
        };
    };
    unauthorized: {
        status: number;
        error: {
            code: string;
            message: string;
        };
    };
};
//# sourceMappingURL=auth.fixture.d.ts.map