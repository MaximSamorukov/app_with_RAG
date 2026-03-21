import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../../database/entities/User.entity';
import { RefreshToken } from '../../database/entities/RefreshToken.entity';
import { EmailVerificationToken } from '../../database/entities/EmailVerificationToken.entity';
import { RegistrationService } from './services/registration.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { RegistrationController } from './controllers/registration.controller';
import { PasswordResetController } from './controllers/password-reset.controller';

/**
 * Authentication Module
 * Provides authentication, registration, and password reset services
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, EmailVerificationToken]),
  ],
  providers: [
    AuthService,
    RegistrationService,
    EmailVerificationService,
    PasswordResetService,
  ],
  controllers: [AuthController, RegistrationController, PasswordResetController],
  exports: [
    AuthService,
    RegistrationService,
    EmailVerificationService,
    PasswordResetService,
  ],
})
export class AuthModule {}
