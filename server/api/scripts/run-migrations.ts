#!/usr/bin/env tsx
/**
 * Manual migration runner script
 * Use this when typeorm CLI has issues with ES modules
 */

import { AppDataSource } from '../src/database/data-source';

async function runMigrations() {
  console.log('📡 Connecting to database...');
  await AppDataSource.initialize();
  console.log('✅ Database connected');
  
  console.log('🔄 Running migrations...');
  await AppDataSource.runMigrations();
  console.log('✅ Migrations complete');
  
  await AppDataSource.destroy();
  console.log('📡 Database connection closed');
}

runMigrations().catch(console.error);
