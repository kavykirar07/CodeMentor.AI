import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sanitizeMiddleware } from '../middleware/sanitize';
import { analyzeCode } from '../services/aiService';
import { getCachedAnalysis, setCachedAnalysis } from '../services/cacheService';
import Submission from '../models/Submission';
import { isMongoConnected } from '../db';
import { memCreateSubmission } from '../memoryStore';

const router = Router();

// POST /api/code/analyze
router.post('/analyze', authMiddleware, sanitizeMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code, language } = req.body;

    if (!language || !['javascript', 'python', 'cpp', 'java'].includes(language)) {
      res.status(400).json({ error: 'Valid language is required (javascript, python, cpp, java).' });
      return;
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Analyzing your code...' })}\n\n`);

    // Check cache
    const cached = await getCachedAnalysis(code, language);
    let analysis: any;

    if (cached) {
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Found cached analysis!' })}\n\n`);
      analysis = JSON.parse(cached);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Running AI analysis...' })}\n\n`);
      analysis = await analyzeCode(code, language);
      await setCachedAnalysis(code, language, JSON.stringify(analysis));
    }

    // Save submission
    let submissionId: string;

    if (isMongoConnected()) {
      const submission = new Submission({
        userId: req.userId,
        code,
        language,
        analysis: {
          conceptualGap: analysis.conceptualGap || '',
          analogy: analysis.analogy || '',
          leadingQuestion: analysis.leadingQuestion || '',
          summary: analysis.summary || '',
        },
        errorCategories: analysis.errorCategories || [],
      });
      await submission.save().catch((err: any) => console.error('Save error:', err));
      submissionId = String(submission._id);
    } else {
      const sub = memCreateSubmission({
        userId: req.userId!,
        code,
        language,
        analysis: {
          conceptualGap: analysis.conceptualGap || '',
          analogy: analysis.analogy || '',
          leadingQuestion: analysis.leadingQuestion || '',
          summary: analysis.summary || '',
        },
        errorCategories: analysis.errorCategories || [],
      });
      submissionId = sub.id;
    }

    res.write(`data: ${JSON.stringify({ type: 'analysis', data: analysis, submissionId })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Analyze error:', err);
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Analysis failed. Please try again.' })}\n\n`);
      res.end();
    } catch {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

export default router;
