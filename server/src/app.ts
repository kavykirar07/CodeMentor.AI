import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db';

import authRoutes from './routes/auth';
import codeRoutes from './routes/code';
import hintRoutes from './routes/hints';
import analyticsRoutes from './routes/analytics';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───
app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ─── Routes ───

// ✅ ADD THIS HERE
app.get('/', (req, res) => {
  res.send('CodeMentor AI Backend Running 🚀');
});

// Your API routes
app.use('/api/auth', authRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/hints', hintRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start ───
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 CodeMentor AI server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;