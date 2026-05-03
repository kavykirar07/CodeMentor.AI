import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Dual-source auth middleware.
 * Accepts the JWT from either:
 *   1. Authorization: Bearer <token>  (LocalStorage clients)
 *   2. HttpOnly cookie codementor_token  (cookie-based clients)
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  let token: string | undefined;

  // Prefer Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Fall back to HttpOnly cookie
  if (!token && req.cookies?.codementor_token) {
    token = req.cookies.codementor_token;
  }

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};
