// Config is validated in config.ts — imported below via named import after env bootstrap
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import http from 'http';

import logger from './logger';
import { connectDB, closeDB, isMongoConnected } from './db';
import config from './config';
import { globalLimiter } from './middleware/rateLimiter';

import authRoutes     from './routes/auth';
import codeRoutes     from './routes/code';
import hintRoutes     from './routes/hints';
import analyticsRoutes from './routes/analytics';
import executeRoutes  from './routes/execute';

// ── App setup ──────────────────────────────────────────────────────────────────
const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(globalLimiter);

// ── Routes ─────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ service: 'CodeMentor AI API', status: 'running' }));

app.use('/api/auth',      authRoutes);
app.use('/api/code',      codeRoutes);
app.use('/api/hints',     hintRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/execute',   executeRoutes);

// Health probe — surfaces real DB / service state
app.get('/api/health', (_req: Request, res: Response) => {
  const db     = isMongoConnected() ? 'ok' : 'degraded';
  const status = db === 'ok' ? 200 : 503;
  res.status(status).json({
    status: db === 'ok' ? 'ok' : 'degraded',
    db,
    timestamp: new Date().toISOString(),
  });
});

// ── Server & graceful shutdown ─────────────────────────────────────────────────
// Keep a registry of active SSE response objects so we can close them cleanly.
const activeConnections = new Set<Response>();

app.use((_req, res, next) => {
  activeConnections.add(res);
  res.on('close', () => activeConnections.delete(res));
  next();
});

const httpServer = http.createServer(app);

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Graceful shutdown initiated');

  // 1. Stop accepting new TCP connections
  httpServer.close(() => logger.info('HTTP server closed'));

  // 2. Drain active SSE / long-poll connections
  for (const res of activeConnections) {
    try { res.end(); } catch { /* noop */ }
  }
  activeConnections.clear();

  // 3. Close database
  try { await closeDB(); } catch { /* noop */ }

  logger.info('Shutdown complete — goodbye 👋');
  process.exit(0);
}

// Force exit if graceful shutdown hangs beyond 15 s
function forceExit() {
  setTimeout(() => {
    logger.error('Forced exit after 15 s timeout');
    process.exit(1);
  }, 15_000).unref();
}

process.on('SIGTERM', () => { forceExit(); gracefulShutdown('SIGTERM'); });
process.on('SIGINT',  () => { forceExit(); gracefulShutdown('SIGINT'); });
process.on('uncaughtException',  (err) => logger.error({ err }, 'Uncaught exception'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled rejection'));

// ── Boot ───────────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  await connectDB();
  const PORT = parseInt(config.PORT, 10);
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT, env: config.NODE_ENV }, '🚀 CodeMentor AI server running');
  });
}

start();
export default app;