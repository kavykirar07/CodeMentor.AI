import { Request, Response, NextFunction } from 'express';

// Common prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior/i,
  /you\s+are\s+now/i,
  /pretend\s+to\s+be/i,
  /act\s+as\s+(if\s+you\s+are\s+)?a/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /\[SYSTEM\]/i,
  /<<SYS>>/i,
  /jailbreak/i,
  /DAN\s+mode/i,
];

const MAX_CODE_LENGTH = 50000; // 50KB max code length

export const sanitizeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Code is required and must be a string.' });
    return;
  }

  if (code.length > MAX_CODE_LENGTH) {
    res.status(400).json({ error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters.` });
    return;
  }

  // Check for prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(code)) {
      res.status(400).json({ error: 'Suspicious input detected. Please submit valid code only.' });
      return;
    }
  }

  next();
};
