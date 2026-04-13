import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateHint } from '../services/aiService';
import Submission from '../models/Submission';
import { isMongoConnected } from '../db';
import { memFindSubmission } from '../memoryStore';

const router = Router();

// POST /api/hints/request
router.post('/request', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { submissionId, level } = req.body;

    if (!submissionId) {
      res.status(400).json({ error: 'submissionId is required.' });
      return;
    }

    const hintLevel = Number(level);
    if (![1, 2, 3].includes(hintLevel)) {
      res.status(400).json({ error: 'Hint level must be 1, 2, or 3.' });
      return;
    }

    if (isMongoConnected()) {
      const submission = await Submission.findOne({ _id: submissionId, userId: req.userId });
      if (!submission) { res.status(404).json({ error: 'Submission not found.' }); return; }

      if (hintLevel > 1) {
        const prev = submission.hints.find(h => h.level === hintLevel - 1);
        if (!prev) { res.status(403).json({ error: `Unlock Level ${hintLevel - 1} first.` }); return; }
      }

      const existing = submission.hints.find(h => h.level === hintLevel);
      if (existing) { res.json({ hint: existing.content, level: hintLevel, cached: true }); return; }

      const hintContent = await generateHint(submission.code, submission.language, hintLevel);
      submission.hints.push({ level: hintLevel, content: hintContent, unlockedAt: new Date() });
      await submission.save();
      res.json({ hint: hintContent, level: hintLevel, cached: false });
    } else {
      // In-memory fallback
      const submission = memFindSubmission(submissionId, req.userId!);
      if (!submission) { res.status(404).json({ error: 'Submission not found.' }); return; }

      if (hintLevel > 1) {
        const prev = submission.hints.find(h => h.level === hintLevel - 1);
        if (!prev) { res.status(403).json({ error: `Unlock Level ${hintLevel - 1} first.` }); return; }
      }

      const existing = submission.hints.find(h => h.level === hintLevel);
      if (existing) { res.json({ hint: existing.content, level: hintLevel, cached: true }); return; }

      const hintContent = await generateHint(submission.code, submission.language, hintLevel);
      submission.hints.push({ level: hintLevel, content: hintContent, unlockedAt: new Date() });
      res.json({ hint: hintContent, level: hintLevel, cached: false });
    }
  } catch (err) {
    console.error('Hint error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
