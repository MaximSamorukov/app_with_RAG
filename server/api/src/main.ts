import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { AppDataSource } from './database/data-source';
import { httpLogger } from './common/middleware/logger';
import { errorMiddleware } from './common/middleware/error.middleware';
import { healthRouter } from './modules/health/health.router';
import { createAuthRouter } from './modules/auth/auth.router';
import { AuthService } from './modules/auth/auth.service';
import { RegistrationService } from './modules/auth/services/registration.service';
import { EmailVerificationService } from './modules/auth/services/email-verification.service';
import { PasswordResetService } from './modules/auth/services/password-reset.service';
import { createUsersRouter } from './modules/users/users.router';
import { UsersService } from './modules/users/users.service';
import { User } from './database/entities/User.entity';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: process.env.CORS_CREDENTIALS === 'true',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);

// Routes (static routes before bootstrap)
app.use('/api/v1/health', healthRouter);

// Error handling middleware (will be re-registered in bootstrap, but kept here for safety)
app.use(errorMiddleware);

// Database connection and server start
async function bootstrap() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Initialize services
    const authService = new AuthService(AppDataSource);
    const registrationService = new RegistrationService(AppDataSource);
    const emailVerificationService = new EmailVerificationService(AppDataSource);
    const passwordResetService = new PasswordResetService(AppDataSource);
    const usersService = new UsersService(AppDataSource.getRepository(User));

    // ==================== Routes ====================

    // Public health routes
    app.use('/api/v1/health', healthRouter);

    // Public auth routes (registration, login, password reset)
    app.use('/api/v1/auth', createAuthRouter(
      authService,
      registrationService,
      emailVerificationService,
      passwordResetService
    ));

    // Protected user management routes (admin only)
    app.use('/api/v1/users', createUsersRouter(authService, usersService));

    // Root endpoint
    app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'RAG Assistant API',
        version: '1.0.0',
        status: 'running',
      });
    });

    // 404 handler
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
      });
    });

    // Error handling middleware
    app.use(errorMiddleware);

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 Auth routes: /api/v1/auth/* (public + authenticated)`);
      console.log(`👥 User management: /api/v1/users/* (admin only)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

export default app;
