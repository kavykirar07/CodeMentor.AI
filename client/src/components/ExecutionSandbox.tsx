import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { executeAPI } from '../api';

interface ExecutionSandboxProps {
  code: string;
  language: string;
}

export default function ExecutionSandbox({ code, language }: ExecutionSandboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    time: string;
    sandbox: string;
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  const handleRun = async () => {
    if (!code.trim() || isRunning) return;
    setIsRunning(true);
    setError('');
    setResult(null);

    try {
      const res = await executeAPI.run({ code, language, stdin });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Execution failed. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const hasOutput = result?.stdout || result?.stderr;

  return (
    <div style={{ padding: '0 20px 20px' }}>
      {/* Trigger bar */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid rgba(99,102,241,0.25)',
          background: 'rgba(99,102,241,0.06)',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          fontSize: '0.85rem',
          fontWeight: 600,
          transition: 'all 0.2s',
          marginBottom: isOpen ? 12 : 0,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          ▶ Run Sandbox
          {result && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: '0.7rem',
                background: result.exitCode === 0 ? 'rgba(20,184,166,0.15)' : 'rgba(244,63,94,0.15)',
                color: result.exitCode === 0 ? '#14b8a6' : '#f43f5e',
              }}
            >
              {result.exitCode === 0 ? '✓ OK' : '✕ Error'} · {result.time}
            </span>
          )}
        </span>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▾</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                background: 'var(--color-bg-card)',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
              }}
            >
              {/* stdin */}
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-text-muted)',
                    marginBottom: 6,
                  }}
                >
                  Standard Input (stdin)
                </label>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Optional input for your program..."
                  rows={2}
                  style={{
                    width: '100%',
                    resize: 'none',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Action row */}
              <div
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderBottom: hasOutput ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <button
                  className="btn-primary"
                  onClick={handleRun}
                  disabled={isRunning || !code.trim()}
                  style={{
                    padding: '7px 20px',
                    fontSize: '0.82rem',
                    opacity: isRunning || !code.trim() ? 0.6 : 1,
                    cursor: isRunning || !code.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isRunning ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                        ⏳
                      </motion.span>
                      Running...
                    </>
                  ) : (
                    '▶ Run Code'
                  )}
                </button>

                {result && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {result.sandbox === 'judge0' ? '🌐 Judge0' : '🔲 Mock Sandbox'} · {result.time}
                  </span>
                )}

                {error && (
                  <span style={{ fontSize: '0.78rem', color: '#f43f5e' }}>⚠ {error}</span>
                )}
              </div>

              {/* Output */}
              <AnimatePresence>
                {hasOutput && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {result?.stdout && (
                      <OutputPane label="stdout" content={result.stdout} color="#14b8a6" />
                    )}
                    {result?.stderr && (
                      <OutputPane label="stderr" content={result.stderr} color="#f43f5e" isLast />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OutputPane({
  label,
  content,
  color,
  isLast = false,
}: {
  label: string;
  content: string;
  color: string;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        borderTop: '1px solid var(--color-border)',
        padding: '10px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <div
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <pre
        style={{
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: 180,
          overflowY: 'auto',
        }}
      >
        {content}
      </pre>
    </div>
  );
}
