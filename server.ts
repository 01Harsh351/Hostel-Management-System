import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackendApp, errorHandler, notFoundHandler } from './backend/app.js';
import { connectDB, setOnConnectedHook } from './backend/config/db.js';
import { ensureInitialAdminFromEnv } from './backend/utils/seedAdmin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  setOnConnectedHook(async () => {
    try {
      const seedRes = await ensureInitialAdminFromEnv();
      if (seedRes.created && 'admin' in seedRes && seedRes.admin) {
        console.log(`[SEED] Initial admin provisioned: ${seedRes.admin.email}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[SEED] Skipped initial admin provisioning:', msg);
    }
  });

  // Start DB connection without blocking HTTP port binding; API routes await ensureDbConnected()
  void connectDB();

  const app = createBackendApp({ mountErrorHandlers: false });

  // API 404 before Vite SPA/MPA fallback
  app.use('/api/*', notFoundHandler);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'mpa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
    }
  }

  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] UniStay Full-Stack server running on http://localhost:${PORT}`);
  });
}

bootstrap();
