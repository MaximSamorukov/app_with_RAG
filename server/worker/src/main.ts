import * as dotenv from 'dotenv';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from './services/logger';

// Load environment variables
dotenv.config();

// Queue names
export enum QueueName {
  DOCUMENT_PARSE = 'document:parse',
  DOCUMENT_CHUNK = 'document:chunk',
  DOCUMENT_EMBED = 'document:embed',
  DOCUMENT_UPSERT = 'document:upsert',
}

// Connection configuration
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
};

// Initialize queues
const parseQueue = new Queue(QueueName.DOCUMENT_PARSE, { connection });
const chunkQueue = new Queue(QueueName.DOCUMENT_CHUNK, { connection });
const embedQueue = new Queue(QueueName.DOCUMENT_EMBED, { connection });
const upsertQueue = new Queue(QueueName.DOCUMENT_UPSERT, { connection });

// Job processors (to be implemented in subsequent phases)
async function createWorkers() {
  // Document parse worker
  const parseWorker = new Worker(
    QueueName.DOCUMENT_PARSE,
    async (job) => {
      logger.info(`Processing parse job: ${job.id}`, { documentId: job.data.documentId });
      // TODO: Implement document parsing logic
      return { status: 'pending_implementation' };
    },
    { connection }
  );

  // Document chunk worker
  const chunkWorker = new Worker(
    QueueName.DOCUMENT_CHUNK,
    async (job) => {
      logger.info(`Processing chunk job: ${job.id}`, { documentId: job.data.documentId });
      // TODO: Implement text chunking logic
      return { status: 'pending_implementation' };
    },
    { connection }
  );

  // Document embed worker
  const embedWorker = new Worker(
    QueueName.DOCUMENT_EMBED,
    async (job) => {
      logger.info(`Processing embed job: ${job.id}`, { chunkId: job.data.chunkId });
      // TODO: Implement embedding generation logic
      return { status: 'pending_implementation' };
    },
    { connection }
  );

  // Document upsert worker
  const upsertWorker = new Worker(
    QueueName.DOCUMENT_UPSERT,
    async (job) => {
      logger.info(`Processing upsert job: ${job.id}`, { chunkId: job.data.chunkId });
      // TODO: Implement vector upsert logic
      return { status: 'pending_implementation' };
    },
    { connection }
  );

  return { parseWorker, chunkWorker, embedWorker, upsertWorker };
}

// Graceful shutdown
async function shutdown(workers: any) {
  logger.info('Shutting down workers...');
  
  await Promise.all([
    workers.parseWorker.close(),
    workers.chunkWorker.close(),
    workers.embedWorker.close(),
    workers.upsertWorker.close(),
    parseQueue.close(),
    chunkQueue.close(),
    embedQueue.close(),
    upsertQueue.close(),
  ]);
  
  logger.info('All workers shut down');
  process.exit(0);
}

// Main function
async function bootstrap() {
  try {
    logger.info('🚀 Starting RAG Assistant Worker...');
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔴 Redis: ${connection.host}:${connection.port}`);

    // Create workers
    const workers = await createWorkers();

    logger.info('✅ All workers started successfully');
    logger.info('⏳ Waiting for jobs...');

    // Handle shutdown signals
    process.on('SIGINT', () => shutdown(workers));
    process.on('SIGTERM', () => shutdown(workers));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown(workers);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown(workers);
    });
  } catch (error) {
    logger.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Start the worker
bootstrap();

export { parseQueue, chunkQueue, embedQueue, upsertQueue };
