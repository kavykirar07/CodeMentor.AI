import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import MentorConsole from '../components/MentorConsole';
import HintSystem from '../components/HintSystem';
import { analyzeCodeSSE } from '../api';

const LANGUAGE_MAP: Record<string, { label: string; monacoId: string; icon: string; color: string }> = {
  javascript: { label: 'JavaScript', monacoId: 'javascript', icon: '⚡', color: '#f7df1e' },
  python: { label: 'Python', monacoId: 'python', icon: '🐍', color: '#3776ab' },
  cpp: { label: 'C++', monacoId: 'cpp', icon: '⚙️', color: '#00599C' },
  java: { label: 'Java', monacoId: 'java', icon: '☕', color: '#ED8B00' },
};

const DEFAULT_CODE: Record<string, string> = {
  javascript: `// Paste your JavaScript code here or try this example:\nfunction findMax(arr) {\n  let max = 0;\n  for (let i = 1; i <= arr.length; i++) {\n    if (arr[i] > max) {\n      max = arr[i];\n    }\n  }\n  return max;\n}\n\nconsole.log(findMax([3, 7, 2, 9, 1]));`,
  python: `# Paste your Python code here or try this example:\ndef find_max(arr):\n    max_val = 0\n    for i in range(1, len(arr) + 1):\n        if arr[i] > max_val:\n            max_val = arr[i]\n    return max_val\n\nprint(find_max([3, 7, 2, 9, 1]))`,
  cpp: `// Paste your C++ code here or try this example:\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint findMax(vector<int> arr) {\n    int max = 0;\n    for (int i = 1; i <= arr.size(); i++) {\n        if (arr[i] > max) {\n            max = arr[i];\n        }\n    }\n    return max;\n}\n\nint main() {\n    vector<int> nums = {3, 7, 2, 9, 1};\n    cout << findMax(nums) << endl;\n    return 0;\n}`,
  java: `// Paste your Java code here or try this example:\npublic class Main {\n    public static int findMax(int[] arr) {\n        int max = 0;\n        for (int i = 1; i <= arr.length; i++) {\n            if (arr[i] > max) {\n                max = arr[i];\n            }\n        }\n        return max;\n    }\n\n    public static void main(String[] args) {\n        int[] nums = {3, 7, 2, 9, 1};\n        System.out.println(findMax(nums));\n    }\n}`,
};

export default function Workspace() {
  const [searchParams] = useSearchParams();
  const langParam = searchParams.get('lang') || 'javascript';
  const [selectedLang, setSelectedLang] = useState(langParam);
  const [code, setCode] = useState(DEFAULT_CODE[langParam] || DEFAULT_CODE.javascript);
  const [analysis, setAnalysis] = useState<any>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const langInfo = LANGUAGE_MAP[selectedLang] || LANGUAGE_MAP.javascript;

  const handleSubmit = useCallback(() => {
    if (!code.trim() || isLoading) return;

    setIsLoading(true);
    setAnalysis(null);
    setSubmissionId(null);
    setStatusMessage('Connecting...');

    analyzeCodeSSE(
      code,
      selectedLang,
      (data) => {
        switch (data.type) {
          case 'status':
            setStatusMessage(data.message);
            break;
          case 'analysis':
            setAnalysis(data.data);
            setSubmissionId(data.submissionId);
            setIsLoading(false);
            break;
          case 'done':
            setIsLoading(false);
            break;
          case 'error':
            setStatusMessage(data.message || 'Analysis failed');
            setIsLoading(false);
            break;
        }
      },
      (error) => {
        console.error('SSE error:', error);
        setStatusMessage('Connection failed. Please try again.');
        setIsLoading(false);
      }
    );
  }, [code, selectedLang, isLoading]);

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang);
    setCode(DEFAULT_CODE[lang] || '');
    setAnalysis(null);
    setSubmissionId(null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Language picker */}
          {Object.entries(LANGUAGE_MAP).map(([id, info]) => (
            <button
              key={id}
              onClick={() => handleLanguageChange(id)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: selectedLang === id ? `1px solid ${info.color}` : '1px solid var(--color-border)',
                background: selectedLang === id ? `${info.color}15` : 'transparent',
                color: selectedLang === id ? info.color : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {info.icon} {info.label}
            </button>
          ))}
        </div>

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={isLoading || !code.trim()}
          style={{
            padding: '8px 24px',
            fontSize: '0.85rem',
            opacity: isLoading || !code.trim() ? 0.6 : 1,
            cursor: isLoading || !code.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? '⏳ Analyzing...' : '🚀 Analyze Code'}
        </button>
      </motion.div>

      {/* Main workspace */}
      <div className="workspace-grid" style={{ flex: 1, overflow: 'hidden' }}>
        {/* Left: Code Editor */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            background: '#1e1e1e',
          }}
        >
          <div style={{
            padding: '10px 16px',
            background: 'var(--color-bg-card)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
          }}>
            <span style={{ color: langInfo.color }}>{langInfo.icon}</span>
            <span style={{ fontWeight: 600 }}>Code Editor</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
              {code.split('\n').length} lines
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <Editor
              height="100%"
              language={langInfo.monacoId}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                bracketPairColorization: { enabled: true },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
              }}
            />
          </div>
        </motion.div>

        {/* Right: Mentor Console + Hints */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)',
          }}
        >
          <div style={{
            padding: '10px 16px',
            background: 'var(--color-bg-card)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
          }}>
            <span>🧠</span>
            <span style={{ fontWeight: 600 }}>Mentor Console</span>
            {analysis && (
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(20, 184, 166, 0.15)',
                color: 'var(--color-accent-teal)',
              }}>
                Analysis Complete
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <MentorConsole
              analysis={analysis}
              isLoading={isLoading}
              statusMessage={statusMessage}
            />
            <HintSystem submissionId={submissionId} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
