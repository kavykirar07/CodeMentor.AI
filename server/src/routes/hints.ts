import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { hintLimiter } from '../middleware/rateLimiter';
import { checkHintQuota } from '../middleware/usageQuota';
import { requireDB } from '../db';
import { generateHintStream } from '../services/aiService';
import { getUserSubmissionCount, isUserStruggling } from '../services/cacheService';
import Submission from '../models/Submission';
import logger from '../logger';

const router = Router();

// Minimum analyses before a Level 1 hint is allowed (anti-cheat)
const MIN_ATTEMPTS_FOR_HINT = 2;

// POST /api/hints/request  (SSE streaming)
router.post(
  '/request',
  authMiddleware,
  requireDB,
  hintLimiter,
  checkHintQuota,
  async (req: AuthRequest, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders(); // Critical to ensure headers are sent immediately

    const sse = (payload: object) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    try {
      const { submissionId, level } = req.body as { submissionId: string; level: number };
      const hintLevel = Number(level);
      const userId = req.userId!;

      if (!submissionId) { sse({ type: 'error', message: 'submissionId is required.' }); res.end(); return; }
      if (![1, 2, 3].includes(hintLevel)) { sse({ type: 'error', message: 'Hint level must be 1, 2, or 3.' }); res.end(); return; }

      // ── Anti-cheat: enforce minimum attempt count before L1 hint ──
      if (hintLevel === 1) {
        const totalSubmissions = await getUserSubmissionCount(userId);
        if (totalSubmissions < MIN_ATTEMPTS_FOR_HINT) {
          sse({
            type: 'blocked',
            message: `🛡️ Anti-cheat: Try solving the problem yourself first. Hints unlock after ${MIN_ATTEMPTS_FOR_HINT} analysis attempts. You've made ${totalSubmissions}.`,
            attemptsNeeded: MIN_ATTEMPTS_FOR_HINT - totalSubmissions,
          });
          res.end(); return;
        }
      }

      // ── Load submission ──
      const submission = await Submission.findOne({ _id: submissionId, userId });
      if (!submission) { sse({ type: 'error', message: 'Submission not found.' }); res.end(); return; }

      // ── Check prerequisite level ──
      if (hintLevel > 1) {
        const prev = submission.hints.find((h) => h.level === hintLevel - 1);
        if (!prev) {
          sse({ type: 'error', message: `Unlock Level ${hintLevel - 1} first.` }); res.end(); return;
        }
      }

      // ── Struggle detection ──
      const struggleMode = await isUserStruggling(userId, submission.errorCategories);

      sse({ type: 'start', level: hintLevel, struggleMode });

      const fullContent = await generateHintStream(
        submission.code,
        submission.language,
        hintLevel,
        userId,
        submissionId,
        struggleMode,
        (delta) => sse({ type: 'delta', content: delta }),
        submission.compilerError,
        submission.lineNumbers,
      );

      // ── Persist hint if not already stored ──
      const alreadyStored = submission.hints.find((h) => h.level === hintLevel);
      if (!alreadyStored) {
        submission.hints.push({ level: hintLevel, content: fullContent, unlockedAt: new Date() });
        await submission.save().catch((err: Error) => logger.error({ err }, 'Hint save error'));
      }

      logger.info({ userId, submissionId, hintLevel, struggleMode }, 'Hint streamed');
      sse({ type: 'done' });
      res.end();
    } catch (err: any) {
      logger.error({ err }, 'Hint route error');
      const is503 = err.status === 503 || (err.message && err.message.includes('503'));
      const msg = is503 ? 'AI Service is experiencing high demand. Please try again later.' : 'Hint generation failed.';
      try { sse({ type: 'error', message: msg }); res.end(); }
      catch { res.status(500).json({ error: 'Internal server error.' }); }
    }
  },
);

export default router;
