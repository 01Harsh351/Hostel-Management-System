import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackendApp } from './app.js';
import { connectDB } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env if present, otherwise fallback to root .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  await connectDB();
  const app = createBackendApp({ mountErrorHandlers: true });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] UniStay Backend listening on http://localhost:${PORT}`);
    console.log(`[Server] Health endpoint: http://localhost:${PORT}/api/health`);
  });
}

startServer();
