import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import MentorConsole from '../components/MentorConsole';
import HintSystem from '../components/HintSystem';
import ExecutionSandbox from '../components/ExecutionSandbox';
import MermaidDiagram from '../components/MermaidDiagram';
import ErrorBoundary from '../components/ErrorBoundary';
import { analyzeCodeSSE } from '../api';
import type { IASTInsight } from '../types';

const LANGUAGE_MAP: Record<string, { label: string; monacoId: string; icon: string; color: string }> = {
  javascript: { label: 'JavaScript', monacoId: 'javascript', icon: '⚡', color: '#f7df1e' },
  python:     { label: 'Python',     monacoId: 'python',     icon: '🐍', color: '#3776ab' },
  cpp:        { label: 'C++',        monacoId: 'cpp',        icon: '⚙️', color: '#00599C' },
  java:       { label: 'Java',       monacoId: 'java',       icon: '☕', color: '#ED8B00' },
};

const DEFAULT_CODE: Record<string, string> = {
  javascript: `// Paste your code or try this buggy example:\nfunction findMax(arr) {\n  let max = 0;\n  for (let i = 1; i <= arr.length; i++) {\n    if (arr[i] > max) max = arr[i];\n  }\n  return max;\n}\nconsole.log(findMax([3, 7, 2, 9, 1]));`,
  python:     `# Paste your code or try this buggy example:\ndef find_max(arr):\n    max_val = 0\n    for i in range(1, len(arr) + 1):\n        if arr[i] > max_val:\n            max_val = arr[i]\n    return max_val\n\nprint(find_max([3, 7, 2, 9, 1]))`,
  cpp:        `// Paste your code or try this buggy example:\n#include <iostream>\n#include <vector>\nusing namespace std;\nint findMax(vector<int> arr) {\n    int max = 0;\n    for (int i = 1; i <= arr.size(); i++) {\n        if (arr[i] > max) max = arr[i];\n    }\n    return max;\n}\nint main() {\n    vector<int> nums = {3, 7, 2, 9, 1};\n    cout << findMax(nums) << endl;\n}`,
  java:       `// Paste your code or try this buggy example:\npublic class Main {\n    public static int findMax(int[] arr) {\n        int max = 0;\n        for (int i = 1; i <= arr.length; i++) {\n            if (arr[i] > max) max = arr[i];\n        }\n        return max;\n    }\n    public static void main(String[] args) {\n        int[] nums = {3, 7, 2, 9, 1};\n        System.out.println(findMax(nums));\n    }\n}`,
};

type ActiveView = 'editor' | 'mentor';

export default function Workspace() {
  const [searchParams] = useSearchParams();
  const langParam = searchParams.get('lang') ?? 'javascript';

  const [selectedLang, setSelectedLang]     = useState(langParam);
  const [code, setCode]                     = useState(DEFAULT_CODE[langParam] ?? DEFAULT_CODE.javascript);
  const [compilerError, setCompilerError]   = useState('');
  const [showCompilerInput, setShowCompilerInput] = useState(false);

  const [analysis, setAnalysis]             = useState<Record<string, unknown> | null>(null);
  const [submissionId, setSubmissionId]     = useState<string | null>(null);
  const [astInsights, setAstInsights]       = useState<IASTInsight[]>([]);
  const [mermaidDiagram, setMermaidDiagram] = useState('');
  const [struggling, setStruggling]         = useState(false);

  const [isLoading, setIsLoading]           = useState(false);
  const [statusMessage, setStatusMessage]   = useState('');

  // Responsive toggle for tablet/mobile
  const [activeView, setActiveView]         = useState<ActiveView>('editor');

  const langInfo = LANGUAGE_MAP[selectedLang] ?? LANGUAGE_MAP.javascript;

  const handleSubmit = useCallback(() => {
    if (!code.trim() || isLoading) return;
    setIsLoading(true);
    setAnalysis(null);
    setSubmissionId(null);
    setAstInsights([]);
    setMermaidDiagram('');
    setStruggling(false);
    setStatusMessage('Connecting…');

    analyzeCodeSSE(
      code,
      selectedLang,
      (data: Record<string, unknown>) => {
        switch (data.type) {
          case 'status':
            setStatusMessage(data.message as string);
            break;
          case 'ast':
            setAstInsights(((data.data as Record<string, unknown>).insights as IASTInsight[]) ?? []);
            break;
          case 'analysis':
            setAnalysis(data.data as Record<string, unknown>);
            setSubmissionId(data.submissionId as string);
            setMermaidDiagram((data.mermaidDiagram as string) ?? '');
            setStruggling((data.struggling as boolean) ?? false);
            setIsLoading(false);
            // On mobile — auto-switch to mentor view after analysis
            setActiveView('mentor');
            break;
          case 'done':
            setIsLoading(false);
            break;
          case 'error':
            setStatusMessage((data.message as string) || 'Analysis failed');
            setIsLoading(false);
            break;
        }
      },
      (error: unknown) => {
        console.error('SSE error:', error);
        setStatusMessage('Connection failed. Please try again.');
        setIsLoading(false);
      },
      compilerError || undefined,
    );
  }, [code, selectedLang, isLoading, compilerError]);

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang);
    setCode(DEFAULT_CODE[lang] ?? '');
    setAnalysis(null);
    setSubmissionId(null);
    setAstInsights([]);
    setMermaidDiagram('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>

      {/* ── Toolbar ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px', borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)', flexShrink: 0, flexWrap: 'wrap', gap: 8,
        }}
      >
        {/* Language selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(LANGUAGE_MAP).map(([id, info]) => (
            <button key={id} onClick={() => handleLanguageChange(id)} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
              border: selectedLang === id ? `1px solid ${info.color}` : '1px solid var(--color-border)',
              background: selectedLang === id ? `${info.color}15` : 'transparent',
              color: selectedLang === id ? info.color : 'var(--color-text-secondary)',
            }}>
              {info.icon} {info.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Compiler error toggle */}
          <button
            onClick={() => setShowCompilerInput((v) => !v)}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--color-border)', background: 'transparent',
              color: compilerError ? '#f59e0b' : 'var(--color-text-muted)',
            }}
            title="Paste compiler/runtime error for richer AI context"
          >
            {compilerError ? '⚠️ Error Context Set' : '+ Add Error Context'}
          </button>

          <button className="btn-primary" onClick={handleSubmit}
            disabled={isLoading || !code.trim()}
            style={{ padding: '8px 22px', fontSize: '0.85rem', opacity: isLoading || !code.trim() ? 0.6 : 1, cursor: isLoading || !code.trim() ? 'not-allowed' : 'pointer' }}
          >
            {isLoading ? '⏳ Analyzing…' : '🚀 Analyze Code'}
          </button>
        </div>
      </motion.div>

      {/* Compiler error input */}
      <AnimatePresence>
        {showCompilerInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <textarea
              value={compilerError}
              onChange={(e) => setCompilerError(e.target.value)}
              placeholder="Paste your compiler / runtime error here for deeper AI context (optional)…"
              rows={3}
              style={{
                width: '100%', resize: 'none', background: 'rgba(245,158,11,0.06)',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                borderBottom: '1px solid var(--color-border)', padding: '10px 20px',
                fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
                color: '#f59e0b', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Responsive view toggle (shown on < 1024 px) ── */}
      <div className="view-toggle">
        {(['editor', 'mentor'] as ActiveView[]).map((v) => (
          <button key={v} onClick={() => setActiveView(v)} style={{
            flex: 1, padding: '8px', fontSize: '0.85rem', fontWeight: 600,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: activeView === v ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: activeView === v ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
            borderBottom: activeView === v ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
          }}>
            {v === 'editor' ? '📝 Editor' : '🧠 Mentor'}
            {v === 'mentor' && analysis && (
              <span style={{ marginLeft: 6, fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(20,184,166,0.2)', color: '#14b8a6' }}>
                Ready
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Main workspace grid ── */}
      <div className="workspace-grid" style={{ flex: 1, overflow: 'hidden' }}>

        {/* Left — Code Editor */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className={`workspace-panel ${activeView === 'editor' ? 'panel-active' : 'panel-hidden'}`}
          style={{ display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)', background: '#1e1e1e' }}
        >
          <div style={{ padding: '10px 16px', background: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
            <span style={{ color: langInfo.color }}>{langInfo.icon}</span>
            <span style={{ fontWeight: 600 }}>Code Editor</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{code.split('\n').length} lines</span>
          </div>
          <div style={{ flex: 1 }}>
            <Editor
              height="100%"
              language={langInfo.monacoId}
              value={code}
              onChange={(v) => setCode(v ?? '')}
              theme="vs-dark"
              options={{
                fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false }, padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false, lineNumbers: 'on', renderLineHighlight: 'all',
                bracketPairColorization: { enabled: true }, smoothScrolling: true,
                cursorBlinking: 'smooth', cursorSmoothCaretAnimation: 'on',
              }}
            />
          </div>
          <div style={{ flexShrink: 0, borderTop: '1px solid var(--color-border)' }}>
            <ErrorBoundary name="ExecutionSandbox">
              <ExecutionSandbox code={code} language={selectedLang} />
            </ErrorBoundary>
          </div>
        </motion.div>

        {/* Right — Mentor Console */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className={`workspace-panel ${activeView === 'mentor' ? 'panel-active' : 'panel-hidden'}`}
          style={{ display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}
        >
          <div style={{ padding: '10px 16px', background: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
            <span>🧠</span>
            <span style={{ fontWeight: 600 }}>Mentor Console</span>
            {struggling && (
              <span style={{ marginLeft: 8, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                🔥 Struggle Mode
              </span>
            )}
            {analysis && !struggling && (
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(20,184,166,0.15)', color: 'var(--color-accent-teal)' }}>
                Analysis Complete
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ErrorBoundary name="MentorConsole">
              <MentorConsole
                analysis={analysis as any}
                isLoading={isLoading}
                statusMessage={statusMessage}
                astInsights={astInsights}
                struggling={struggling}
              />
            </ErrorBoundary>

            {mermaidDiagram && (
              <ErrorBoundary name="MermaidDiagram">
                <MermaidDiagram diagram={mermaidDiagram} title="Code Logic Flow" />
              </ErrorBoundary>
            )}

            <ErrorBoundary name="HintSystem">
              <HintSystem submissionId={submissionId} />
            </ErrorBoundary>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
