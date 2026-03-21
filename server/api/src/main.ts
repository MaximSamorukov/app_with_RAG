import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { AppDataSource } from './database/data-source';
import { httpLogger } from './common/middleware/logger';
import { errorMiddleware } from './common/middleware/error.middleware';
import { healthRouter } from './modules/health/health.router';

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

// Routes
app.use('/api/v1/health', healthRouter);

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

// Database connection and server start
async function bootstrap() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

export default app;
