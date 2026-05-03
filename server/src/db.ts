import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import logger from './logger';

// ── Reconnect state ────────────────────────────────────────────────────────────
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_RECONNECT_DELAY_MS = 30_000;

function scheduleReconnect(delayMs: number) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    logger.info({ delayMs }, 'Attempting MongoDB reconnect...');
    await connectDB();
  }, delayMs);
}

// ── Mongoose event wiring ──────────────────────────────────────────────────────
mongoose.connection.on('connected', () => logger.info('✅ MongoDB connected'));
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️  MongoDB disconnected — scheduling reconnect');
  scheduleReconnect(Math.min(5_000 * (reconnectAttempts + 1), MAX_RECONNECT_DELAY_MS));
});
mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB error'));

let reconnectAttempts = 0;

export async function connectDB(): Promise<void> {
  // Read from process.env directly so devBootstrap patches are respected
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/codementor';
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 45_000,
    });
    reconnectAttempts = 0;
  } catch (err) {
    reconnectAttempts++;
    const delay = Math.min(5_000 * reconnectAttempts, MAX_RECONNECT_DELAY_MS);
    logger.error({ err, reconnectAttempts, retryInMs: delay }, 'MongoDB connection failed');
    scheduleReconnect(delay);
  }
}

export async function closeDB(): Promise<void> {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

/** True only when Mongoose reports readyState === 1 (connected) */
export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// ── 503 middleware ─────────────────────────────────────────────────────────────
export function requireDB(req: Request, res: Response, next: NextFunction): void {
  if (!isMongoConnected()) {
    res.status(503).json({
      error: 'Database unavailable. The service is temporarily down — please retry in a few seconds.',
      retryAfter: 5,
    });
    return;
  }
  next();
}
