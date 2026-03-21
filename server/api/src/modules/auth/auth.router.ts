import { Router } from 'express';
import { AuthService } from './auth.service';
import { RegistrationService } from './services/registration.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { AuthController } from './auth.controller';
import { RegistrationController } from './controllers/registration.controller';
import { PasswordResetController } from './controllers/password-reset.controller';
import { createAuthenticateMiddleware } from './middleware/authenticate.middleware';

/**
 * Create authentication router
 */
export function createAuthRouter(
  authService: AuthService,
  registrationService: RegistrationService,
  emailVerificationService: EmailVerificationService,
  passwordResetService: PasswordResetService
): Router {
  const router = Router();
  
  // Initialize controllers
  const authController = new AuthController(authService);
  const registrationController = new RegistrationController(
    registrationService,
    emailVerificationService
  );
  const passwordResetController = new PasswordResetController(passwordResetService);
  
  // Initialize middleware
  const authenticate = createAuthenticateMiddleware(authService);

  // ==================== Registration Routes ====================
  
  // POST /auth/register - Register new user
  router.post('/register', (req, res, next) => registrationController.register(req, res, next));
  
  // POST /auth/verify-email - Verify email address
  router.post('/verify-email', (req, res, next) => registrationController.verifyEmail(req, res, next));
  
  // POST /auth/resend-verification - Resend verification email
  router.post('/resend-verification', (req, res, next) => registrationController.resendVerification(req, res, next));

  // ==================== Password Reset Routes ====================
  
  // POST /auth/forgot-password - Request password reset
  router.post('/forgot-password', (req, res, next) => passwordResetController.forgotPassword(req, res, next));
  
  // POST /auth/reset-password - Reset password with token
  router.post('/reset-password', (req, res, next) => passwordResetController.resetPassword(req, res, next));
  
  // PUT /auth/password - Change password (authenticated)
  router.put('/password', authenticate, (req, res, next) => passwordResetController.changePassword(req, res, next));

  // ==================== Legacy/Auth Routes ====================
  
  // POST /auth/login - Login user
  router.post('/login', (req, res, next) => authController.login(req, res, next));
  
  // POST /auth/refresh - Refresh access token
  router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
  
  // POST /auth/logout - Logout user
  router.post('/logout', (req, res, next) => authController.logout(req, res, next));

  // ==================== Protected Routes ====================
  
  // GET /auth/me - Get current user
  router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

  return router;
}
