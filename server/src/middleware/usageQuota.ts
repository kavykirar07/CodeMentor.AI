import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import User, { PLAN_LIMITS } from '../models/User';
import logger from '../logger';

/**
 * Checks and increments the monthly analysis quota for the requesting user.
 * Returns 429 if the user is over their plan limit.
 * Resets the counter if the billing month has rolled over.
 */
export async function checkAnalysisQuota(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) { res.status(401).json({ error: 'User not found.' }); return; }

    // Roll over usage counter if the reset date has passed
    if (new Date() >= user.usageResetDate) {
      user.analysesUsedThisMonth = 0;
      user.hintsUsedThisMonth    = 0;
      user.usageResetDate        = nextResetDate();
    }

    const limit = PLAN_LIMITS[user.plan].analysesPerMonth;

    if (user.analysesUsedThisMonth >= limit) {
      res.status(429).json({
        error: `Monthly analysis quota exhausted (${limit} for the ${user.plan} plan).`,
        quota: { used: user.analysesUsedThisMonth, limit, plan: user.plan },
        upgradeUrl: '/pricing',
      });
      return;
    }

    // Increment atomically — save happens here so it persists even on SSE streams
    user.analysesUsedThisMonth += 1;
    await user.save();

    logger.debug({ userId: req.userId, plan: user.plan, used: user.analysesUsedThisMonth, limit }, 'Analysis quota check OK');
    next();
  } catch (err) {
    logger.error({ err }, 'Usage quota middleware error');
    next(err);
  }
}

/**
 * Checks and increments the monthly hint quota.
 */
export async function checkHintQuota(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) { res.status(401).json({ error: 'User not found.' }); return; }

    if (new Date() >= user.usageResetDate) {
      user.analysesUsedThisMonth = 0;
      user.hintsUsedThisMonth    = 0;
      user.usageResetDate        = nextResetDate();
    }

    const limit = PLAN_LIMITS[user.plan].hintsPerMonth;

    if (user.hintsUsedThisMonth >= limit) {
      res.status(429).json({
        error: `Monthly hint quota exhausted (${limit} for the ${user.plan} plan).`,
        quota: { used: user.hintsUsedThisMonth, limit, plan: user.plan },
        upgradeUrl: '/pricing',
      });
      return;
    }

    user.hintsUsedThisMonth += 1;
    await user.save();

    next();
  } catch (err) {
    logger.error({ err }, 'Hint quota middleware error');
    next(err);
  }
}

function nextResetDate(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}
