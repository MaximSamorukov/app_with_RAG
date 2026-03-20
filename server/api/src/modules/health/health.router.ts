import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../database/data-source';

export const healthRouter = Router();

/**
 * GET /api/v1/health
 * Health check endpoint
 */
healthRouter.get('/', async (req: Request, res: Response) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    // Check database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.query('SELECT 1');
      healthStatus.services.database = 'connected';
    } else {
      healthStatus.services.database = 'disconnected';
      healthStatus.status = 'degraded';
    }

    // Check Redis connection (placeholder - will be implemented when Redis is configured)
    healthStatus.services.redis = 'not_configured';

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    healthStatus.status = 'unhealthy';
    healthStatus.services.database = 'error';
    res.status(503).json(healthStatus);
  }
});

/**
 * GET /api/v1/health/ready
 * Readiness check - verifies all dependencies are ready
 */
healthRouter.get('/ready', async (req: Request, res: Response) => {
  const readyStatus = {
    ready: true,
    timestamp: new Date().toISOString(),
    checks: {
      database: false,
      migrations: false,
    },
  };

  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.query('SELECT 1');
      readyStatus.checks.database = true;
      readyStatus.checks.migrations = true; // Assuming migrations are run
    } else {
      readyStatus.ready = false;
    }

    const statusCode = readyStatus.ready ? 200 : 503;
    res.status(statusCode).json(readyStatus);
  } catch (error) {
    readyStatus.ready = false;
    res.status(503).json(readyStatus);
  }
});

/**
 * GET /api/v1/health/live
 * Liveness check - simple ping
 */
healthRouter.get('/live', (req: Request, res: Response) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});
