import OpenAI from 'openai';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// ─── System Prompts ───

const ANALYSIS_SYSTEM_PROMPT = `You are CodeMentor AI, a Socratic programming tutor. Your goal is to TEACH, never to give direct code fixes.

When analyzing code, you MUST respond in this exact JSON format:
{
  "conceptualGap": "Identify the core concept the student is misunderstanding. Explain what the concept is, why it matters, and how it relates to the error. Do NOT show corrected code.",
  "analogy": "Provide a vivid real-world analogy that helps explain the concept. Make it relatable to everyday life.",
  "leadingQuestion": "Ask a thought-provoking question that leads the student toward discovering the fix themselves.",
  "summary": "A one-sentence summary of the main issue found.",
  "errorCategories": ["Category1", "Category2"]
}

Error categories should be chosen from: "Syntax Error", "Logic Error", "Type Error", "Null/Undefined Reference", "Off-by-One", "Async/Await", "Memory Management", "Data Structure Misuse", "Algorithm Error", "Scope Issue", "Exception Handling", "API Misuse", "Security Vulnerability", "Performance Issue", "Design Pattern Violation"

CRITICAL RULES:
1. NEVER provide the corrected code in the analysis
2. NEVER show what the fix should look like
3. Focus on teaching the CONCEPT behind the error
4. Make your analogy vivid and memorable
5. Your leading question should guide them to the answer
6. If the code is correct, say so and suggest improvements`;

const HINT_PROMPTS: Record<number, string> = {
  1: `You are CodeMentor AI. The student has requested a Level 1 (Concept) hint.
Provide a conceptual hint that:
- Names the specific programming concept involved
- Explains the general rule or principle that applies
- Does NOT show any code or pseudocode
- Keeps it to 2-3 sentences
Respond with plain text only.`,

  2: `You are CodeMentor AI. The student has requested a Level 2 (Pseudocode) hint.
Provide a pseudocode-level hint that:
- Shows the logical steps needed to fix the issue in plain English pseudocode
- Uses indentation to show structure
- Does NOT use any real programming language syntax
- Keeps it concise (5-8 lines of pseudocode max)
Respond with plain text only.`,

  3: `You are CodeMentor AI. The student has requested a Level 3 (Solution) hint.
Now provide the actual code fix:
- Show only the specific lines that need to change
- Include a brief explanation of WHY this fix works
- Relate it back to the concept from earlier hints
Respond with plain text, using code blocks where appropriate.`,
};

// ─── Demo Responses ───

function getDemoAnalysis(code: string, language: string): object {
  return {
    conceptualGap: `Looking at your ${language} code, there appears to be a logical issue related to how control flow and variable scope interact. The concept you might want to revisit is how ${language} handles variable declarations and their lifecycle within different blocks of code. Understanding scope rules is fundamental — a variable declared inside a block may not be accessible outside it, and vice versa.`,
    analogy: `Think of variable scope like rooms in a house. A variable declared in a specific room (code block) is like a piece of furniture in that room — it's only accessible when you're inside that room. If you try to use that furniture from the hallway (an outer scope), you won't be able to reach it. Similarly, global variables are like shared spaces — everyone can access them, but they can also lead to unexpected conflicts.`,
    leadingQuestion: `Take a close look at where your variables are declared versus where they're being used. Are all your variables accessible in the scope where you're trying to use them? What would happen if you traced through the code line by line and tracked where each variable exists?`,
    summary: "Potential scope or control flow issue detected in the submitted code.",
    errorCategories: ["Scope Issue", "Logic Error"],
  };
}

function getDemoHint(level: number): string {
  const hints: Record<number, string> = {
    1: "This issue relates to the concept of variable scope and lifetime. In most programming languages, variables declared inside a code block (like an if-statement or loop) only exist within that block. Consider reviewing where each variable is first declared and whether it's still in scope where it's used.",
    2: `PROCEDURE fix_the_issue:
  1. IDENTIFY which variable is causing the problem
  2. CHECK where it is declared (which block/scope)
  3. IF variable is needed outside the block:
     a. MOVE the declaration to the appropriate outer scope
     b. ENSURE it is initialized properly
  4. VERIFY the variable is accessible everywhere it is used
  5. TEST with a simple example to confirm`,
    3: `Here's the fix — you need to declare the variable in the correct scope:

\`\`\`
// Move the variable declaration outside the block where it's needed
// Before: variable was declared inside a conditional/loop
// After: declare it in the enclosing scope

// Example pattern:
let result; // Declare here, in the outer scope
if (condition) {
  result = computeValue(); // Assign inside the block
}
console.log(result); // Now accessible here
\`\`\`

**Why this works:** By moving the declaration to the outer scope, the variable's lifetime extends beyond the inner block, making it accessible wherever you need it.`,
  };
  return hints[level] || hints[1];
}

// ─── Public API ───

export async function analyzeCode(code: string, language: string): Promise<object> {
  const client = getOpenAI();

  if (!client) {
    console.log('⚠️  No OpenAI API key — returning demo analysis');
    return getDemoAnalysis(code, language);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: `Language: ${language}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`` },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');
    return JSON.parse(content);
  } catch (err) {
    console.error('AI analysis error:', err);
    return getDemoAnalysis(code, language);
  }
}

export async function generateHint(code: string, language: string, level: number): Promise<string> {
  const client = getOpenAI();

  if (!client) {
    console.log('⚠️  No OpenAI API key — returning demo hint');
    return getDemoHint(level);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: HINT_PROMPTS[level] || HINT_PROMPTS[1] },
        { role: 'user', content: `Language: ${language}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`` },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || getDemoHint(level);
  } catch (err) {
    console.error('AI hint error:', err);
    return getDemoHint(level);
  }
}
