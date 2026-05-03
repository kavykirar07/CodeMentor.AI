import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import config from '../config';
import logger from '../logger';
import {
  getConversationHistory,
  appendConversationMessage,
  ConvMessage,
} from './cacheService';
import { ASTInsight } from './astService';

// ── Gemini client (lazy init) ─────────────────────────────────────────────────
let _genai: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genai) _genai = new GoogleGenerativeAI(config.GOOGLE_AI_API_KEY);
  return _genai;
}

// ── System prompts ─────────────────────────────────────────────────────────────
const ANALYSIS_SYSTEM = `You are CodeMentor AI, a Socratic programming tutor. TEACH — never give direct code fixes.

Respond ONLY with this exact JSON:
{
  "conceptualGap": "Core concept the student misunderstands. Explain it, why it matters, how it caused the error. NO corrected code.",
  "analogy": "A vivid real-world analogy for the concept.",
  "leadingQuestion": "A question guiding the student to discover the fix.",
  "summary": "One sentence describing the main issue.",
  "errorCategories": ["Category1"]
}

Allowed categories: "Syntax Error","Logic Error","Type Error","Null/Undefined Reference","Off-by-One","Async/Await","Memory Management","Data Structure Misuse","Algorithm Error","Scope Issue","Exception Handling","API Misuse","Security Vulnerability","Performance Issue","Design Pattern Violation"

HARD RULES:
1. NEVER provide corrected code in conceptualGap or analogy.
2. Your leadingQuestion must be open-ended, not yes/no.
3. If code looks correct, say so and suggest one improvement.`;

function buildHintSystemPrompt(level: number, struggleMode: boolean): string {
  const struggleSuffix = struggleMode
    ? `\n\nSTRUGGLE MODE ACTIVE: This student has hit this error multiple times. Be extra empathetic and patient. Start with "I can see this concept is tricky — let's slow down." Provide more context than usual.`
    : '';

  const CODE_RULE_L1_L2 = `\n\nCRITICAL: Output NO more than 3 lines of actual code. Prefer pseudocode over real syntax.`;

  const prompts: Record<number, string> = {
    1: `You are CodeMentor AI — a patient Socratic tutor with memory of this session.
Build on previous hints. Do NOT repeat yourself.
Level 1 (Concept): Name the programming concept, explain the rule/principle. NO code.${CODE_RULE_L1_L2}${struggleSuffix}`,

    2: `You are CodeMentor AI — a patient Socratic tutor with memory of this session.
Build on previous hints. Do NOT repeat yourself.
Level 2 (Pseudocode): Show logical steps in plain English pseudocode only. Use indentation for structure.${CODE_RULE_L1_L2}${struggleSuffix}`,

    3: `You are CodeMentor AI — a patient Socratic tutor with memory of this session.
Build on all previous hints. Refer back to concepts established earlier.
Level 3 (Solution): Show ONLY the specific lines that need to change. Explain WHY the fix works in terms of the concept.${struggleSuffix}`,
  };
  return prompts[level] ?? prompts[1];
}

// ── Context builder ────────────────────────────────────────────────────────────
function buildCodeContext(
  code: string,
  language: string,
  compilerError?: string,
  lineNumbers?: number[],
  astInsights?: ASTInsight[],
): string {
  let ctx = `Language: ${language}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``;

  if (compilerError) {
    ctx += `\n\nCompiler / Runtime Error:\n\`\`\`\n${compilerError}\n\`\`\``;
  }
  if (lineNumbers?.length) {
    ctx += `\n\nFlagged Lines: ${lineNumbers.join(', ')}`;
  }
  if (astInsights?.length) {
    const critical = astInsights.filter((i) => i.severity === 'critical');
    if (critical.length) {
      ctx += `\n\nStatic Analysis found ${critical.length} critical issue(s):\n` +
        critical.map((i) => `- [${i.type}] line ${i.line ?? '?'}: ${i.description}`).join('\n');
    }
  }
  return ctx;
}

// ── Public: analyzeCode ────────────────────────────────────────────────────────
export async function analyzeCode(
  code: string,
  language: string,
  compilerError?: string,
  lineNumbers?: number[],
  astInsights?: ASTInsight[],
): Promise<object> {
  const genai = getGenAI();
  const userContent = buildCodeContext(code, language, compilerError, lineNumbers, astInsights);

  try {
    const model = genai.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: ANALYSIS_SYSTEM,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    // Delay to mitigate Gemini 429 rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        });
        break;
      } catch (err: any) {
        attempts++;
        if (err.status === 503 && attempts < maxAttempts) {
          logger.warn({ attempt: attempts }, 'Gemini 503 error. Retrying code analysis...');
          await new Promise((r) => setTimeout(r, 2000 * attempts));
        } else {
          throw err;
        }
      }
    }

    if (!result) throw new Error('Failed to analyze code after retries');

    const response = result.response;
    const content = response.text();
    if (!content) throw new Error('Empty response from AI');
    
    // Safety check fallback
    if (response.promptFeedback?.blockReason) {
      logger.warn({ reason: response.promptFeedback.blockReason }, 'Gemini analysis blocked by safety filters');
      return {
        conceptualGap: "The Mentor is currently analyzing your code structure, please rephrase or try again.",
        analogy: "Sometimes taking a step back helps us see the bigger picture.",
        leadingQuestion: "Can you think of another way to approach this logic?",
        summary: "Analysis paused due to content filters.",
        errorCategories: ["General"]
      };
    }

    logger.debug('analyzeCode successful (Gemini)');
    return JSON.parse(content) as object;
  } catch (err: any) {
    logger.error({ err }, 'analyzeCode failed (Gemini)');
    
    // Check if it's a safety block thrown as an error
    if (err.message && err.message.includes('SAFETY')) {
      return {
        conceptualGap: "The Mentor is currently analyzing your code structure, please rephrase or try again.",
        analogy: "Sometimes taking a step back helps us see the bigger picture.",
        leadingQuestion: "Can you think of another way to approach this logic?",
        summary: "Analysis paused due to content filters.",
        errorCategories: ["General"]
      };
    }
    
    throw err;
  }
}

// ── Public: generateHintStream (SSE, contextual memory) ───────────────────────
export async function generateHintStream(
  code: string,
  language: string,
  level: number,
  userId: string,
  submissionId: string,
  struggleMode: boolean,
  onChunk: (delta: string) => void,
  compilerError?: string,
  lineNumbers?: number[],
): Promise<string> {
  const genai = getGenAI();
  const history: ConvMessage[] = await getConversationHistory(userId, submissionId);

  // Only keep the last 3 exchanges (6 messages) per prompt requirement
  const recentHistory = history.slice(-6);

  const userMessage = buildCodeContext(code, language, compilerError, lineNumbers) +
    `\n\nPlease give me a Level ${level} hint.`;

  try {
    const model = genai.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: buildHintSystemPrompt(level, struggleMode),
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const contents = [
      ...recentHistory.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    // Delay to mitigate Gemini 429 rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        result = await model.generateContentStream({
          contents,
          generationConfig: {
            temperature: 0.7,
          },
        });
        break; // Success, exit retry loop
      } catch (err: any) {
        attempts++;
        if (err.status === 503 && attempts < maxAttempts) {
          logger.warn({ attempt: attempts }, 'Gemini 503 error. Retrying hint generation...');
          await new Promise((r) => setTimeout(r, 2000 * attempts)); // Exponential backoff
        } else {
          throw err;
        }
      }
    }

    if (!result) throw new Error('Failed to generate hint after retries');

    let fullContent = '';

    for await (const chunk of result.stream) {
      const delta = chunk.text();
      if (delta) {
        fullContent += delta;
        onChunk(delta);
      }
    }

    logger.debug({ userId, submissionId, level, struggleMode, chars: fullContent.length }, 'hint streamed (Gemini)');

    await appendConversationMessage(userId, submissionId, { role: 'user', content: userMessage });
    await appendConversationMessage(userId, submissionId, { role: 'assistant', content: fullContent });
    
    return fullContent;
  } catch (err: any) {
    logger.error({ err }, 'generateHintStream failed (Gemini)');
    
    if (err.message && err.message.includes('SAFETY')) {
      const safeMsg = "The Mentor is currently analyzing your code structure, please rephrase or try again.";
      onChunk(safeMsg);
      return safeMsg;
    }
    
    throw err;
  }
}
