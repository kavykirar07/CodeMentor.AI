import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ── Judge0 config ─────────────────────────────────────────────────────────────
// Set JUDGE0_URL + JUDGE0_API_KEY in .env for real execution.
// Falls back to a deterministic mock sandbox otherwise.
const JUDGE0_URL = process.env.JUDGE0_URL || '';
const JUDGE0_KEY = process.env.JUDGE0_API_KEY || '';

/** Judge0 language IDs */
const LANG_IDS: Record<string, number> = {
  javascript: 63, // Node.js 12
  python: 71,     // Python 3.8
  cpp: 54,        // C++ 17 (GCC)
  java: 62,       // Java 11
};

/** Submit to Judge0 and poll until result */
async function runOnJudge0(
  code: string,
  language: string,
  stdin: string,
): Promise<{ stdout: string; stderr: string; exitCode: number; time: string }> {
  const langId = LANG_IDS[language];

  // 1. Create submission
  const createRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': JUDGE0_KEY,
    },
    body: JSON.stringify({
      language_id: langId,
      source_code: code,
      stdin,
    }),
  });

  if (!createRes.ok) throw new Error('Judge0 submission failed');
  const { token } = await createRes.json() as { token: string };

  // 2. Poll with exponential back-off (max 10s)
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((r) => setTimeout(r, 800 + attempt * 200));
    const pollRes = await fetch(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
      { headers: { 'X-Auth-Token': JUDGE0_KEY } },
    );
    if (!pollRes.ok) continue;
    const result = await pollRes.json() as any;

    // status.id 1=queued 2=processing 3=accepted 4+=error
    if (result.status?.id <= 2) continue;

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || result.compile_output || '',
      exitCode: result.status?.id === 3 ? 0 : 1,
      time: result.time ? `${result.time}s` : '—',
    };
  }

  throw new Error('Judge0 timed out');
}

/** Deterministic mock execution (no external service) */
function mockExecute(
  code: string,
  language: string,
  stdin: string,
): { stdout: string; stderr: string; exitCode: number; time: string } {
  const time = `${(Math.random() * 0.3 + 0.05).toFixed(3)}s`;

  // Very simple heuristic: look for common error patterns
  const lc = code.toLowerCase();
  const hasSyntaxError =
    (language === 'javascript' && /\bfunction\b.*{[^}]*$/.test(code) && !code.includes('}')) ||
    (language === 'python' && /def .*:\s*$/.test(code));

  if (hasSyntaxError) {
    return {
      stdout: '',
      stderr: `SyntaxError: Unexpected end of input (mock sandbox)`,
      exitCode: 1,
      time,
    };
  }

  // Simulate expected output for the built-in demo snippets (off-by-one bug → 9)
  const looksLikeFindMax = lc.includes('findmax') || lc.includes('find_max');
  if (looksLikeFindMax) {
    return {
      stdout: '9\n',
      stderr: '',
      exitCode: 0,
      time,
    };
  }

  // Generic "ran OK" response
  return {
    stdout: `[Mock Sandbox] Code executed successfully.\n${stdin ? `stdin: ${stdin}\n` : ''}`,
    stderr: '',
    exitCode: 0,
    time,
  };
}

// POST /api/execute
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code, language, stdin = '' } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'code is required.' });
      return;
    }

    const supportedLangs = Object.keys(LANG_IDS);
    if (!language || !supportedLangs.includes(language)) {
      res.status(400).json({ error: `language must be one of: ${supportedLangs.join(', ')}` });
      return;
    }

    if (code.length > 10_000) {
      res.status(400).json({ error: 'Code exceeds 10 000 character limit.' });
      return;
    }

    let result: { stdout: string; stderr: string; exitCode: number; time: string };

    if (JUDGE0_URL && JUDGE0_KEY) {
      result = await runOnJudge0(code, language, stdin);
    } else {
      result = mockExecute(code, language, stdin);
    }

    res.json({ ...result, sandbox: JUDGE0_URL ? 'judge0' : 'mock' });
  } catch (err: any) {
    console.error('Execute error:', err);
    res.status(500).json({ error: err.message || 'Execution failed.' });
  }
});

export default router;
