import mongoose from 'mongoose';

const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let listenersAttached = false;
let lastConnectError = null;
let lastAttemptAt = 0;
let connectPromise = null;
let onConnectedHook = null;
let loggedFallbackNotice = false;

export function setOnConnectedHook(fn) {
  onConnectedHook = typeof fn === 'function' ? fn : null;
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function normalizeMongoUri(rawUri) {
  if (!rawUri) return '';
  return String(rawUri).trim().replace(/^["']|["']$/g, '').trim();
}

function sanitizeDbError(message) {
  if (!message) return 'Unable to connect to MongoDB Atlas.';
  const redacted = String(message)
    .replace(/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi, 'mongodb+srv://***:***@')
    .trim();

  if (/tlsv1 alert internal error|SSL alert number 80/i.test(redacted)) {
    return `${redacted} — Hint: In MongoDB Atlas -> Network Access -> IP Access List, add 0.0.0.0/0 so Cloud Run can reach your cluster.`;
  }
  return redacted;
}

export function getDbHealthStatus() {
  const readyState = mongoose.connection.readyState;
  const uri = normalizeMongoUri(process.env.MONGODB_URI);
  return {
    status: readyState === 1 ? READY_STATE_LABELS[1] : 'fallback',
    readyState,
    dbName: mongoose.connection.name || 'hostelDB',
    configured: Boolean(uri && !uri.includes('your_mongodb')),
    fallbackActive: readyState !== 1,
    lastError: readyState === 1 ? null : lastConnectError,
  };
}

export async function connectDB() {
  const uri = normalizeMongoUri(process.env.MONGODB_URI);

  if (!uri || uri.includes('your_mongodb_connection_string')) {
    lastConnectError = 'MONGODB_URI is not configured yet.';
    if (!loggedFallbackNotice) {
      loggedFallbackNotice = true;
      console.warn('[DB] MONGODB_URI not configured; running with local persistent fallback store.');
    }
    return false;
  }

  if (!listenersAttached) {
    listenersAttached = true;
    mongoose.connection.on('connected', () => {
      lastConnectError = null;
      loggedFallbackNotice = false;
      console.log(`[DB] Connected to MongoDB Atlas database: ${mongoose.connection.name || 'hostelDB'}`);
    });
    mongoose.connection.on('error', (err) => {
      lastConnectError = sanitizeDbError(err?.message);
      if (!loggedFallbackNotice) {
        loggedFallbackNotice = true;
        console.warn('[DB] MongoDB Atlas unreachable; using local persistent fallback store:', lastConnectError);
      }
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB connection disconnected.');
    });
  }

  if (mongoose.connection.readyState === 1) {
    lastConnectError = null;
    return true;
  }

  if (connectPromise) {
    return connectPromise;
  }

  lastAttemptAt = Date.now();
  connectPromise = (async () => {
    try {
      await mongoose.connect(uri, {
        dbName: 'hostelDB',
        serverSelectionTimeoutMS: 5000,
        family: 4,
      });
      lastConnectError = null;
      if (onConnectedHook) {
        await onConnectedHook();
      }
      return true;
    } catch (error) {
      lastConnectError = sanitizeDbError(error?.message);
      if (!loggedFallbackNotice) {
        loggedFallbackNotice = true;
        console.warn('[DB] MongoDB Atlas unreachable; using local persistent fallback store:', lastConnectError);
      }
      return false;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

export async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) {
    return true;
  }
  if (connectPromise) {
    return connectPromise;
  }
  if (Date.now() - lastAttemptAt < 30000) {
    return false;
  }
  return connectDB();
}
