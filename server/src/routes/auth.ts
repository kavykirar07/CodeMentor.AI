import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { requireDB } from '../db';
import logger from '../logger';
import config from '../config';

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function signToken(userId: string) {
  return jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: '7d' });
}

// Apply auth-specific rate limit + DB check to all auth routes
router.use(authLimiter, requireDB);

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password, and name are required.' }); return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' }); return;
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) { res.status(409).json({ error: 'An account with this email already exists.' }); return; }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email: email.toLowerCase(), passwordHash, name });
    const token = signToken(String(user._id));

    res.cookie('codementor_token', token, COOKIE_OPTS);
    logger.info({ userId: user._id, email: user.email }, 'User registered');
    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, plan: user.plan } });
  } catch (err) {
    logger.error({ err }, 'Register error');
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: 'Email and password are required.' }); return; }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) { res.status(401).json({ error: 'Invalid credentials.' }); return; }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) { res.status(401).json({ error: 'Invalid credentials.' }); return; }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(String(user._id));
    res.cookie('codementor_token', token, COOKIE_OPTS);
    logger.info({ userId: user._id }, 'User logged in');
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, plan: user.plan } });
  } catch (err) {
    logger.error({ err }, 'Login error');
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
    res.json({
      user: {
        id: user._id, email: user.email, name: user.name,
        plan: user.plan, isVerified: user.isVerified,
        usage: {
          analysesUsed: user.analysesUsedThisMonth,
          hintsUsed: user.hintsUsedThisMonth,
          resetDate: user.usageResetDate,
        },
      },
    });
  } catch (err) {
    logger.error({ err }, '/me error');
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res: Response) => {
  res.clearCookie('codementor_token', { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Logged out successfully.' });
});

export default router;
