import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireDB } from '../db';
import Submission from '../models/Submission';
import logger from '../logger';

const router = Router();
router.use(requireDB);

function computeAnalytics(submissions: any[]) {
  const total = submissions.length;

  const categoryMap: Record<string, number> = {};
  submissions.forEach((sub) => {
    (sub.errorCategories ?? []).forEach((cat: string) => {
      categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
    });
  });

  const errorBreakdown = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const weakestConcepts = errorBreakdown.slice(0, 5);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailyMap: Record<string, number> = {};
  submissions
    .filter((s) => new Date(s.createdAt) >= thirtyDaysAgo)
    .forEach((sub) => {
      const day = new Date(sub.createdAt).toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] ?? 0) + 1;
    });
  const submissionsOverTime = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const langMap: Record<string, number> = {};
  submissions.forEach((sub) => {
    langMap[sub.language] = (langMap[sub.language] ?? 0) + 1;
  });
  const languageBreakdown = Object.entries(langMap)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);

  const totalHints    = submissions.reduce((s: number, sub: any) => s + (sub.hints?.length ?? 0), 0);
  const level3Unlocks = submissions.reduce((s: number, sub: any) =>
    s + ((sub.hints ?? []).some((h: any) => h.level === 3) ? 1 : 0), 0);

  return { totalSubmissions: total, errorBreakdown, weakestConcepts, submissionsOverTime, languageBreakdown, hintStats: { totalHints, level3Unlocks } };
}

router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const submissions = await Submission.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    res.json(computeAnalytics(submissions));
  } catch (err) {
    logger.error({ err }, 'Analytics summary error');
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip  = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      Submission.find({ userId: req.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .select('language analysis.summary errorCategories hints createdAt struggleScore'),
      Submission.countDocuments({ userId: req.userId }),
    ]);

    res.json({ submissions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error({ err }, 'Analytics history error');
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
