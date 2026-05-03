import * as acorn from 'acorn';
import logger from '../logger';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ASTInsight {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  line?: number;
  description: string;
  fix: string;
}

export interface ASTResult {
  insights: ASTInsight[];
  mermaidDiagram: string;
  parseSuccess: boolean;
}

// ── JavaScript AST Analysis (via acorn) ───────────────────────────────────────
function analyzeJS(code: string): ASTResult {
  let ast: acorn.Program;
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 2022,
      sourceType: 'module',
      locations: true,
    });
  } catch (err: unknown) {
    logger.debug({ err }, 'acorn parse failed — using regex fallback');
    return { insights: regexFallback(code, 'javascript'), mermaidDiagram: basicMermaid(code, 'javascript'), parseSuccess: false };
  }

  const insights: ASTInsight[] = [];
  const mermaidNodes: string[] = ['flowchart TD', '  Start([▶ Start])'];
  const mermaidEdges: string[] = [];
  const mermaidStyles: string[] = [];
  let nodeIdx = 0;

  function nodeId() { return `N${nodeIdx++}`; }

  function walk(node: acorn.AnyNode, parentId?: string): string | undefined {
    if (!node) return undefined;

    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        const name = (node as any).id?.name ?? 'anonymous';
        const id = nodeId();
        mermaidNodes.push(`  ${id}["⚙️ fn: ${name}()"]`);
        if (parentId) mermaidEdges.push(`  ${parentId} --> ${id}`);
        (node as any).body && walk((node as any).body, id);
        return id;
      }

      case 'ForStatement': {
        const id = nodeId();
        const line = (node as any).loc?.start?.line;
        mermaidNodes.push(`  ${id}{"🔁 for loop"}`);
        if (parentId) mermaidEdges.push(`  ${parentId} --> ${id}`);

        // Off-by-one detection: `i <= arr.length` or `i < arr.length + 1`
        const test = (node as any).test;
        if (test?.type === 'BinaryExpression') {
          const op = test.operator;
          const right = test.right;
          if (
            (op === '<=' && right?.type === 'MemberExpression' && right?.property?.name === 'length') ||
            (op === '<' && right?.type === 'BinaryExpression' && right?.operator === '+')
          ) {
            const insightId = nodeId();
            mermaidNodes.push(`  ${insightId}["⚠️ Off-by-one?"]`);
            mermaidEdges.push(`  ${id} --> ${insightId}`);
            mermaidStyles.push(`  style ${insightId} fill:#f59e0b,color:#000`);
            insights.push({
              type: 'off-by-one',
              severity: 'critical',
              line,
              description: `Loop condition \`i ${op} arr.length\` will access index out of bounds. Arrays are zero-indexed, so the last valid index is \`length - 1\`.`,
              fix: `Change the loop condition to \`i < arr.length\` (use strict less-than, not <=).`,
            });
          }
        }

        // No update expression = potential infinite loop
        if (!(node as any).update) {
          insights.push({
            type: 'infinite-loop',
            severity: 'critical',
            line,
            description: 'For loop has no update expression. This will loop forever.',
            fix: 'Add an increment/decrement (e.g., i++) as the third part of the for-loop.',
          });
          mermaidStyles.push(`  style ${id} fill:#ef4444,color:#fff`);
        }

        walk((node as any).body, id);
        return id;
      }

      case 'WhileStatement': {
        const id = nodeId();
        const line = (node as any).loc?.start?.line;
        const test = (node as any).test;
        mermaidNodes.push(`  ${id}{"🔁 while"}`);
        if (parentId) mermaidEdges.push(`  ${parentId} --> ${id}`);

        // `while(true)` with no break
        if (test?.type === 'Literal' && test?.value === true) {
          const body = JSON.stringify((node as any).body);
          if (!body.includes('"break"') && !body.includes('"return"')) {
            insights.push({
              type: 'infinite-loop',
              severity: 'critical',
              line,
              description: '`while(true)` with no `break` or `return` — this is an infinite loop.',
              fix: 'Add a `break` statement or convert to a `while (condition)` loop.',
            });
            mermaidStyles.push(`  style ${id} fill:#ef4444,color:#fff`);
          }
        }

        walk((node as any).body, id);
        return id;
      }

      case 'IfStatement': {
        const id = nodeId();
        mermaidNodes.push(`  ${id}{"❓ if"}`);
        if (parentId) mermaidEdges.push(`  ${parentId} --> ${id}`);
        walk((node as any).consequent, id);
        if ((node as any).alternate) walk((node as any).alternate, id);
        return id;
      }

      case 'AwaitExpression':
      case 'ReturnStatement': {
        const id = nodeId();
        const label = node.type === 'ReturnStatement' ? '↩️ return' : '⏳ await';
        mermaidNodes.push(`  ${id}["${label}"]`);
        if (parentId) mermaidEdges.push(`  ${parentId} --> ${id}`);
        return id;
      }

      case 'BlockStatement':
        let last: string | undefined = parentId;
        for (const stmt of (node as any).body ?? []) {
          const child = walk(stmt, last);
          if (child) last = child;
        }
        return last;

      case 'Program':
        let prog: string | undefined = 'Start';
        for (const stmt of (node as any).body ?? []) {
          const child = walk(stmt, prog);
          if (child) prog = child;
        }
        return prog;

      default:
        return parentId;
    }
  }

  // Async-without-await detection: async function where body has no AwaitExpression
  function checkAsyncWithoutAwait(node: acorn.AnyNode) {
    if (
      (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') &&
      (node as any).async === true
    ) {
      const bodyStr = JSON.stringify((node as any).body);
      if (!bodyStr.includes('"AwaitExpression"')) {
        insights.push({
          type: 'async-missing-await',
          severity: 'warning',
          line: (node as any).loc?.start?.line,
          description: `Async function \`${(node as any).id?.name ?? 'anonymous'}\` has no \`await\` expression. It will always return a resolved Promise immediately.`,
          fix: 'Add `await` before async calls (e.g., `await fetch(...)`) or remove the `async` keyword if not needed.',
        });
      }
    }
    for (const key of Object.keys(node)) {
      const child = (node as any)[key];
      if (child && typeof child === 'object') {
        if (Array.isArray(child)) child.forEach((c) => c?.type && checkAsyncWithoutAwait(c));
        else if (child.type) checkAsyncWithoutAwait(child);
      }
    }
  }

  walk(ast);
  checkAsyncWithoutAwait(ast);

  const mermaidDiagram = [
    ...mermaidNodes,
    ...mermaidEdges,
    ...mermaidStyles,
  ].join('\n');

  return { insights, mermaidDiagram, parseSuccess: true };
}

// ── Regex-based heuristics for Python, C++, Java ──────────────────────────────
function regexFallback(code: string, language: string): ASTInsight[] {
  const insights: ASTInsight[] = [];
  const lines = code.split('\n');

  lines.forEach((line, idx) => {
    const ln = idx + 1;
    const trimmed = line.trim();

    // Off-by-one: array[arr.length] or arr[len]
    if (/\w+\s*\[\s*\w+\s*\.\s*length\s*\]/.test(trimmed) || /\w+\s*\[\s*len\s*\]/.test(trimmed)) {
      insights.push({
        type: 'off-by-one', severity: 'critical', line: ln,
        description: 'Possible off-by-one: accessing `arr[arr.length]` reads one past the last element.',
        fix: 'Use `arr[arr.length - 1]` for the last element.',
      });
    }

    // Python: `range(1, len(arr) + 1)` — off-by-one
    if (language === 'python' && /range\s*\(\s*1\s*,\s*len\s*\(/.test(trimmed)) {
      insights.push({
        type: 'off-by-one', severity: 'critical', line: ln,
        description: '`range(1, len(arr)+1)` will attempt to access index `len(arr)`, which is out of bounds.',
        fix: 'Use `range(len(arr))` to iterate valid indices 0 to len-1.',
      });
    }

    // Null init: `let max = 0` or `max = 0` — risky when array can have negatives
    if (/(?:let|var|const)?\s*max\s*=\s*0/.test(trimmed)) {
      insights.push({
        type: 'logic-error', severity: 'warning', line: ln,
        description: 'Initializing `max = 0` will return 0 for arrays of all-negative numbers.',
        fix: 'Initialize with the first element: `let max = arr[0]`, or use `Number.NEGATIVE_INFINITY`.',
      });
    }

    // C++: array access with size() used as index
    if (language === 'cpp' && /\w+\s*\[\s*\w+\.size\s*\(\s*\)\s*\]/.test(trimmed)) {
      insights.push({
        type: 'off-by-one', severity: 'critical', line: ln,
        description: 'Accessing `arr[arr.size()]` is undefined behaviour — one past the end.',
        fix: 'Use `arr[arr.size() - 1]` for the last element.',
      });
    }
  });

  return insights;
}

function basicMermaid(code: string, language: string): string {
  const hasLoop    = /for|while/.test(code);
  const hasIf      = /if\s*\(|if /.test(code);
  const hasReturn  = /return /.test(code);
  const lines = [
    'flowchart TD',
    '  Start([▶ Start])',
    `  Lang["${language.toUpperCase()} code"]`,
    '  Start --> Lang',
  ];
  if (hasLoop)   lines.push('  Loop{"🔁 Loop detected"}\n  Lang --> Loop');
  if (hasIf)     lines.push('  Cond{"❓ Condition"}\n  Lang --> Cond');
  if (hasReturn) lines.push('  Ret["↩️ return"]\n  Lang --> Ret');
  lines.push('  End([⏹ End])\n  Lang --> End');
  return lines.join('\n');
}

// ── Public entry point ─────────────────────────────────────────────────────────
export function analyzeAST(code: string, language: string): ASTResult {
  if (language === 'javascript' || language === 'typescript') {
    return analyzeJS(code);
  }
  const insights = regexFallback(code, language);
  return {
    insights,
    mermaidDiagram: basicMermaid(code, language),
    parseSuccess: true,
  };
}
