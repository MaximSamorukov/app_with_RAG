#!/usr/bin/env tsx

/**
 * ===========================================
 * RAG Assistant - S3 Connection Test Script
 * ===========================================
 * 
 * This script tests the S3 connection configured in .env:
 * - Validates required environment variables
 * - Tests connection to S3 endpoint
 * - Creates bucket if it doesn't exist
 * - Tests upload and download operations
 * - Cleans up test files
 * 
 * Usage: npx tsx scripts/test-s3-connection.ts
 * ===========================================
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function logInfo(message: string): void {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

function logSuccess(message: string): void {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function logWarning(message: string): void {
  console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function logError(message: string): void {
  console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function logStep(message: string): void {
  console.log(`${colors.cyan}[STEP]${colors.reset} ${message}`);
}

interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

interface TestResult {
  step: string;
  success: boolean;
  error?: string;
  duration?: number;
}

/**
 * Load and validate environment variables
 */
function loadEnvConfig(): S3Config {
  const envPath = join(PROJECT_ROOT, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env file not found at ${envPath}`);
  }
  
  dotenv.config({ path: envPath });
  
  const config: S3Config = {
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  };
  
  return config;
}

/**
 * Validate S3 configuration
 */
function validateConfig(config: S3Config): void {
  const errors: string[] = [];
  
  if (!config.endpoint) {
    errors.push('S3_ENDPOINT is not set');
  }
  
  if (!config.bucket) {
    errors.push('S3_BUCKET is not set');
  }
  
  if (!config.accessKeyId) {
    errors.push('S3_ACCESS_KEY_ID is not set');
  }
  
  if (!config.secretAccessKey) {
    errors.push('S3_SECRET_ACCESS_KEY is not set');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }
}

/**
 * Create S3 client
 */
function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  });
}

/**
 * Test bucket existence and create if needed
 */
async function testBucket(s3Client: S3Client, bucketName: string): Promise<boolean> {
  try {
    logStep(`Checking if bucket '${bucketName}' exists...`);
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    logSuccess(`Bucket '${bucketName}' exists`);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      logWarning(`Bucket '${bucketName}' does not exist`);
      logStep(`Creating bucket '${bucketName}'...`);
      
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        logSuccess(`Bucket '${bucketName}' created successfully`);
        return false; // Bucket was created
      } catch (createError: any) {
        throw new Error(`Failed to create bucket: ${createError.message}`);
      }
    } else if (error.name === 'Forbidden' || error.$metadata?.httpStatusCode === 403) {
      throw new Error('Access denied. Check your credentials and bucket permissions.');
    } else {
      throw error;
    }
  }
}

/**
 * Test upload operation
 */
async function testUpload(
  s3Client: S3Client,
  bucketName: string,
  key: string,
  content: string
): Promise<number> {
  logStep(`Testing upload: ${key}`);
  const startTime = Date.now();
  
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: 'text/plain',
    }));
    
    const duration = Date.now() - startTime;
    logSuccess(`Upload successful (${content.length} bytes in ${duration}ms)`);
    return duration;
  } catch (error: any) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Test download operation
 */
async function testDownload(
  s3Client: S3Client,
  bucketName: string,
  key: string,
  expectedContent: string
): Promise<number> {
  logStep(`Testing download: ${key}`);
  const startTime = Date.now();
  
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
    
    const body = await response.Body?.transformToString();
    const duration = Date.now() - startTime;
    
    if (body !== expectedContent) {
      throw new Error('Downloaded content does not match uploaded content');
    }
    
    logSuccess(`Download successful (${body.length} bytes in ${duration}ms, content verified)`);
    return duration;
  } catch (error: any) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Clean up test file
 */
async function cleanupTestFile(
  s3Client: S3Client,
  bucketName: string,
  key: string
): Promise<void> {
  logStep(`Cleaning up test file: ${key}`);
  
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
    logSuccess(`Test file deleted successfully`);
  } catch (error: any) {
    logWarning(`Failed to delete test file: ${error.message}`);
  }
}

/**
 * Main test function
 */
async function runTests(): Promise<void> {
  const results: TestResult[] = [];
  let overallSuccess = true;
  
  console.log('');
  console.log('============================================');
  console.log('  RAG Assistant - S3 Connection Test');
  console.log('============================================');
  console.log('');
  
  // Step 1: Load configuration
  logInfo('Loading configuration from .env...');
  let config: S3Config;
  
  try {
    config = loadEnvConfig();
    logSuccess('Configuration loaded successfully');
    results.push({ step: 'Load configuration', success: true });
  } catch (error: any) {
    logError(error.message);
    results.push({ step: 'Load configuration', success: false, error: error.message });
    overallSuccess = false;
    printSummary(results);
    process.exit(1);
  }
  
  // Step 2: Validate configuration
  logInfo('Validating configuration...');
  
  try {
    validateConfig(config);
    logSuccess('Configuration is valid');
    results.push({ step: 'Validate configuration', success: true });
    
    // Print configuration (masking secrets)
    console.log('');
    logInfo('Configuration summary:');
    console.log(`  Endpoint: ${config.endpoint}`);
    console.log(`  Region: ${config.region}`);
    console.log(`  Bucket: ${config.bucket}`);
    console.log(`  Access Key ID: ${config.accessKeyId.substring(0, 8)}...`);
    console.log(`  Secret Access Key: ${'*'.repeat(8)}`);
    console.log(`  Force Path Style: ${config.forcePathStyle}`);
    console.log('');
  } catch (error: any) {
    logError(error.message);
    results.push({ step: 'Validate configuration', success: false, error: error.message });
    overallSuccess = false;
    printSummary(results);
    process.exit(1);
  }
  
  // Step 3: Create S3 client
  logInfo('Creating S3 client...');
  const s3Client = createS3Client(config);
  logSuccess('S3 client created');
  results.push({ step: 'Create S3 client', success: true });
  
  // Step 4: Test bucket
  try {
    const bucketExisted = await testBucket(s3Client, config.bucket);
    results.push({ 
      step: 'Bucket test', 
      success: true,
      duration: bucketExisted ? 0 : 1
    });
  } catch (error: any) {
    logError(error.message);
    results.push({ step: 'Bucket test', success: false, error: error.message });
    overallSuccess = false;
    printSummary(results);
    process.exit(1);
  }
  
  // Step 5: Test upload
  const testKey = `test-${crypto.randomBytes(8).toString('hex')}.txt`;
  const testContent = `RAG Assistant S3 Test\nGenerated at: ${new Date().toISOString()}\nThis is a test file that will be automatically deleted.`;
  
  let uploadDuration = 0;
  try {
    uploadDuration = await testUpload(s3Client, config.bucket, testKey, testContent);
    results.push({ step: 'Upload test', success: true, duration: uploadDuration });
  } catch (error: any) {
    logError(error.message);
    results.push({ step: 'Upload test', success: false, error: error.message });
    overallSuccess = false;
  }
  
  // Step 6: Test download (only if upload succeeded)
  if (uploadDuration > 0) {
    let downloadDuration = 0;
    try {
      downloadDuration = await testDownload(s3Client, config.bucket, testKey, testContent);
      results.push({ step: 'Download test', success: true, duration: downloadDuration });
    } catch (error: any) {
      logError(error.message);
      results.push({ step: 'Download test', success: false, error: error.message });
      overallSuccess = false;
    }
    
    // Step 7: Cleanup
    try {
      await cleanupTestFile(s3Client, config.bucket, testKey);
      results.push({ step: 'Cleanup test', success: true });
    } catch (error: any) {
      logWarning(error.message);
      results.push({ step: 'Cleanup test', success: false, error: error.message });
      // Don't fail overall for cleanup issues
    }
  }
  
  // Print summary
  printSummary(results);
  
  if (!overallSuccess) {
    process.exit(1);
  }
}

/**
 * Print test summary
 */
function printSummary(results: TestResult[]): void {
  console.log('');
  console.log('============================================');
  console.log('  Test Summary');
  console.log('============================================');
  console.log('');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const icon = result.success ? '✓' : '✗';
    const color = result.success ? colors.green : colors.red;
    console.log(`  ${color}${icon}${colors.reset} ${result.step}`);
    
    if (result.duration !== undefined) {
      console.log(`      Duration: ${result.duration}ms`);
    }
    
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });
  
  console.log('');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('');
  
  if (failed === 0) {
    logSuccess('All S3 tests passed! Your configuration is working correctly.');
    console.log('');
    console.log('You can now use the RAG Assistant with cloud S3 storage.');
    console.log('');
  } else {
    logError('Some tests failed. Please check the errors above and fix your configuration.');
    console.log('');
    console.log('Troubleshooting tips:');
    console.log('  1. Verify S3_ENDPOINT is correct (including https://)');
    console.log('  2. Check S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY');
    console.log('  3. Ensure your account has permissions to access the bucket');
    console.log('  4. Check if S3_FORCE_PATH_STYLE is set correctly for your provider');
    console.log('  5. Verify network connectivity to the S3 endpoint');
    console.log('');
  }
}

// Run the tests
runTests().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
