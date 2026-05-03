import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sanitizeMiddleware } from '../middleware/sanitize';
import { analysisLimiter } from '../middleware/rateLimiter';
import { checkAnalysisQuota } from '../middleware/usageQuota';
import { requireDB } from '../db';
import { analyzeCode } from '../services/aiService';
import { analyzeAST } from '../services/astService';
import { getCachedAnalysis, setCachedAnalysis, incrementStruggle, isUserStruggling, incrementUserSubmissions } from '../services/cacheService';
import Submission from '../models/Submission';
import logger from '../logger';

const router = Router();

// POST /api/code/analyze
router.post(
  '/analyze',
  authMiddleware,
  requireDB,
  analysisLimiter,
  checkAnalysisQuota,
  sanitizeMiddleware,
  async (req: AuthRequest, res: Response) => {
    // ── SSE setup ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders(); // Critical to ensure headers are sent immediately

    const sse = (payload: object) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    try {
      const { code, language, compilerError, lineNumbers } = req.body as {
        code: string;
        language: string;
        compilerError?: string;
        lineNumbers?: number[];
      };

      if (!['javascript', 'python', 'cpp', 'java'].includes(language)) {
        sse({ type: 'error', message: 'Unsupported language.' }); res.end(); return;
      }

      sse({ type: 'status', message: 'Running static analysis...' });

      // ── Step 1: AST / static analysis (fast, before hitting OpenAI) ──
      const astResult = analyzeAST(code, language);
      sse({ type: 'ast', data: astResult });

      // ── Step 2: Struggle tracking — update counters before AI call ──
      const userId = req.userId!;
      const totalSubmissions = await incrementUserSubmissions(userId);

      // ── Step 3: Check analysis cache ──
      const cacheKey = code + language + (compilerError ?? '');
      const cached = await getCachedAnalysis(cacheKey, language);
      let analysis: Record<string, unknown>;

      if (cached) {
        sse({ type: 'status', message: 'Using cached analysis...' });
        analysis = JSON.parse(cached) as Record<string, unknown>;
      } else {
        sse({ type: 'status', message: 'Running AI analysis...' });
        analysis = await analyzeCode(code, language, compilerError, lineNumbers, astResult.insights) as Record<string, unknown>;
        await setCachedAnalysis(cacheKey, language, JSON.stringify(analysis));
      }

      // ── Step 4: Update per-category struggle counters ──
      const categories = (analysis.errorCategories as string[]) ?? [];
      for (const cat of categories) {
        await incrementStruggle(userId, cat);
      }
      const struggling = await isUserStruggling(userId, categories);

      // ── Step 5: Calculate struggle score (0–100) ──
      const struggleScore = Math.min(100, (totalSubmissions - 1) * 10);

      // ── Step 6: Persist submission ──
      const submission = new Submission({
        userId,
        code,
        language,
        compilerError,
        lineNumbers,
        analysis: {
          conceptualGap:   (analysis.conceptualGap as string)   ?? '',
          analogy:         (analysis.analogy as string)         ?? '',
          leadingQuestion: (analysis.leadingQuestion as string) ?? '',
          summary:         (analysis.summary as string)         ?? '',
        },
        errorCategories: categories,
        astInsights:     astResult.insights,
        mermaidDiagram:  astResult.mermaidDiagram,
        attemptNumber:   totalSubmissions,
        struggleScore,
      });
      await submission.save().catch((err: Error) => logger.error({ err }, 'Submission save error'));

      logger.info({ userId, language, struggling, totalSubmissions }, 'Code analyzed');

      sse({
        type: 'analysis',
        data: analysis,
        submissionId: String(submission._id),
        astInsights:  astResult.insights,
        mermaidDiagram: astResult.mermaidDiagram,
        struggling,
        totalSubmissions,
      });
      sse({ type: 'done' });
      res.end();
    } catch (err) {
      logger.error({ err }, 'Analysis route error');
      try { sse({ type: 'error', message: 'Analysis failed. Please try again.' }); res.end(); }
      catch { res.status(500).json({ error: 'Internal server error.' }); }
    }
  },
);

export default router;
