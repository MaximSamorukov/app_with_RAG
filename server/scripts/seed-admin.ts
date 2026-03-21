#!/usr/bin/env tsx
/**
 * Seed script to create initial admin user
 *
 * Usage:
 *   cd server/api && npm run db:seed
 *
 * Environment variables required:
 *   - ADMIN_EMAIL: Email for admin user
 *   - ADMIN_PASSWORD: Password for admin user (will be hashed)
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config({ path: '../api/.env' });

import { AppDataSource } from '../api/src/database/data-source';
import { User, UserRole } from '../api/src/database/entities/User.entity';
import * as bcrypt from 'bcryptjs';

/**
 * Main seed function
 */
async function seedAdmin() {
  console.log('🌱 Starting admin user seeding...');
  console.log('');

  try {
    // Step 1: Initialize database connection
    console.log('📡 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connection established');
    console.log('');

    // Step 2: Get repository
    const userRepository = AppDataSource.getRepository(User);

    // Step 3: Get admin credentials from environment
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Validate environment variables
    if (!adminEmail || !adminPassword) {
      console.error('❌ Missing required environment variables:');
      console.error('');
      console.error('   Please set the following in your .env file:');
      console.error('   ADMIN_EMAIL=admin@example.com');
      console.error('   ADMIN_PASSWORD=YourSecurePassword123!');
      console.error('');
      process.exit(1);
    }

    console.log('📝 Admin email: ' + adminEmail);
    console.log('🔐 Admin password: [HIDDEN]');
    console.log('');

    // Step 4: Check if admin already exists (upsert logic)
    console.log('🔍 Checking for existing admin...');
    const existingAdmin = await userRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists. Skipping seed.');
      console.log('');
      console.log('   Email: ' + existingAdmin.email);
      console.log('   Role: ' + existingAdmin.role);
      console.log('   ID: ' + existingAdmin.id);
      console.log('');
      console.log('💡 To create a new admin, either:');
      console.log('   1. Change ADMIN_EMAIL in .env file');
      console.log('   2. Delete existing admin user first');
      console.log('');
      await AppDataSource.destroy();
      return;
    }

    console.log('✅ No existing admin found. Proceeding...');
    console.log('');

    // Step 5: Hash password
    console.log('🔐 Hashing password (bcrypt cost 12)...');
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    console.log('✅ Password hashed successfully');
    console.log('');

    // Step 6: Create admin user
    console.log('👤 Creating admin user...');
    const admin = userRepository.create({
      email: adminEmail,
      passwordHash: hashedPassword,
      name: 'System Administrator',
      role: UserRole.ADMIN,
      isActive: true,
      isEmailVerified: true, // Skip verification for seeded admin
      lastLoginAt: null,
    });

    await userRepository.save(admin);
    console.log('✅ Admin user created successfully!');
    console.log('');

    // Step 7: Display success message
    console.log('🎉 ==========================================');
    console.log('🎉 SEED COMPLETE!');
    console.log('🎉 ==========================================');
    console.log('');
    console.log('✅ Admin user details:');
    console.log('   ID: ' + admin.id);
    console.log('   Email: ' + admin.email);
    console.log('   Name: ' + admin.name);
    console.log('   Role: ' + admin.role);
    console.log('   Active: ' + admin.isActive);
    console.log('   Email Verified: ' + admin.isEmailVerified);
    console.log('');
    console.log('🔐 You can now login with:');
    console.log('   Email: ' + adminEmail);
    console.log('   Password: ' + adminPassword);
    console.log('');
    console.log('⚠️  IMPORTANT SECURITY NOTICE:');
    console.log('   - Change the default password after first login!');
    console.log('   - Do not commit .env file to version control!');
    console.log('   - Use strong passwords in production!');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Start the API server: cd server/api && npm run dev');
    console.log('   2. Test login: POST /api/v1/auth/login');
    console.log('   3. Access admin endpoints: /api/v1/users/*');
    console.log('');
    console.log('📝 API Endpoints available:');
    console.log('   - POST   /api/v1/auth/login');
    console.log('   - GET    /api/v1/users (admin only)');
    console.log('   - POST   /api/v1/users (admin only)');
    console.log('   - PATCH  /api/v1/users/:id (admin only)');
    console.log('   - DELETE /api/v1/users/:id (admin only)');
    console.log('');
    console.log('============================================');

  } catch (error) {
    console.error('');
    console.error('❌ ==========================================');
    console.error('❌ SEED FAILED!');
    console.error('❌ ==========================================');
    console.error('');
    console.error('Error details:');
    console.error(error);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check database connection (docker-compose up -d postgres)');
    console.error('   2. Verify .env file exists with correct values');
    console.error('   3. Ensure migrations have been run');
    console.error('   4. Check database logs: docker-compose logs postgres');
    console.error('');
    process.exit(1);
  } finally {
    // Step 8: Close database connection
    console.log('📡 Closing database connection...');
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
    console.log('');
  }
}

// Run seed script
seedAdmin();
