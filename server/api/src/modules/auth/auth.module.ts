import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../../database/entities/User.entity';
import { RefreshToken } from '../../database/entities/RefreshToken.entity';

/**
 * Authentication Module
 * Provides authentication services and controllers
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
