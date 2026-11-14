import cors from 'cors';
import express from 'express';
import { getDbHealthStatus } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import hostelRoutes from './routes/hostelRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import roomRoutes from './routes/roomRoutes.js';

export function buildCorsOptions() {
  const configuredOrigin = process.env.CLIENT_URL || 'http://127.0.0.1:5500';
  const allowedOrigins = new Set(
    [
      configuredOrigin,
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      `http://localhost:${process.env.PORT || 3000}`,
      process.env.APP_URL,
    ].filter(Boolean)
  );

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      try {
        const parsed = new URL(origin);
        if (
          parsed.hostname === 'localhost' ||
          parsed.hostname === '127.0.0.1' ||
          parsed.hostname.endsWith('.run.app')
        ) {
          return callback(null, true);
        }
      } catch {
        // Invalid origin URL falls through to block
      }
      return callback(new Error(`CORS policy blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-seed-key'],
  };
}

export function createApiRouter() {
  const api = express.Router();

  api.get('/health', (req, res) => {
    const db = getDbHealthStatus();
    res.status(200).json({
      ok: true,
      server: 'running',
      database: db.status,
      databaseReadyState: db.readyState,
      databaseName: db.dbName,
      databaseConfigured: db.configured,
      ...(db.lastError ? { lastError: db.lastError } : {}),
      timestamp: new Date().toISOString(),
    });
  });

  api.use('/auth', authRoutes);
  api.use('/hostels', hostelRoutes);
  api.use('/rooms', roomRoutes);
  api.use('/requests', requestRoutes);
  api.use('/room-requests', requestRoutes);
  api.use('/complaints', complaintRoutes);
  api.use('/dashboard', dashboardRoutes);

  return api;
}

export function createBackendApp({ mountErrorHandlers = true } = {}) {
  const app = express();

  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  const apiRouter = createApiRouter();
  app.use('/api', apiRouter);
  app.use('/api/v1', apiRouter);

  if (mountErrorHandlers) {
    app.use('/api/*', notFoundHandler);
    app.use(errorHandler);
  }

  return app;
}

export { errorHandler, notFoundHandler };
