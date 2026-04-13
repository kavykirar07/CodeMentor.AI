import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { isMongoConnected } from '../db';
import { memFindUserByEmail, memFindUserById, memCreateUser, memVerifyPassword } from '../memoryStore';

const router = Router();

const jwtSecret = () => process.env.JWT_SECRET || 'fallback_secret';
const signToken = (userId: string) => jwt.sign({ userId }, jwtSecret(), { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required.' });
      return;
    }

    if (isMongoConnected()) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ email: email.toLowerCase(), passwordHash, name });
      const token = signToken(String(user._id));
      res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name } });
    } else {
      // In-memory fallback
      const existing = await memFindUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }
      const user = await memCreateUser(email, password, name);
      const token = signToken(user.id);
      res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    if (isMongoConnected()) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) { res.status(401).json({ error: 'Invalid credentials.' }); return; }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) { res.status(401).json({ error: 'Invalid credentials.' }); return; }
      const token = signToken(String(user._id));
      res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
    } else {
      const user = await memFindUserByEmail(email);
      if (!user) { res.status(401).json({ error: 'Invalid credentials.' }); return; }
      const isMatch = await memVerifyPassword(user, password);
      if (!isMatch) { res.status(401).json({ error: 'Invalid credentials.' }); return; }
      const token = signToken(user.id);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (isMongoConnected()) {
      const user = await User.findById(req.userId).select('-passwordHash');
      if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
      res.json({ user: { id: user._id, email: user.email, name: user.name } });
    } else {
      const user = await memFindUserById(req.userId!);
      if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    }
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
