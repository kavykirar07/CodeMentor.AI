import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestHintSSE } from '../api';

interface HintSystemProps {
  submissionId: string | null;
}

const HINT_LEVELS = [
  {
    level: 1,
    title: 'Concept',
    subtitle: 'Understand the theory',
    icon: '📘',
    color: '#6366f1',
    description: 'Get a high-level explanation of the concept behind the error.',
  },
  {
    level: 2,
    title: 'Pseudocode',
    subtitle: 'See the logic',
    icon: '📝',
    color: '#14b8a6',
    description: 'View pseudocode showing the logical steps to fix the issue.',
  },
  {
    level: 3,
    title: 'Solution',
    subtitle: 'Reveal the fix',
    icon: '💡',
    color: '#f59e0b',
    description: 'See the actual code fix with a detailed explanation.',
  },
];

export default function HintSystem({ submissionId }: HintSystemProps) {
  const [unlockedHints, setUnlockedHints] = useState<Record<number, string>>({});
  // streamingHints stores the in-progress text while tokens arrive
  const [streamingHints, setStreamingHints] = useState<Record<number, string>>({});
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keep a ref to the active AbortController so we can cancel if needed
  const abortRef = useRef<AbortController | null>(null);

  const handleRequestHint = (level: number) => {
    if (!submissionId) return;

    // Toggle already-unlocked hints
    if (unlockedHints[level]) {
      setExpandedLevel(expandedLevel === level ? null : level);
      return;
    }

    // Check prerequisite
    if (level > 1 && !unlockedHints[level - 1]) return;
    if (loadingLevel !== null) return; // another request in progress

    setErrorMsg(null);
    setLoadingLevel(level);
    setExpandedLevel(level);
    setStreamingHints((prev) => ({ ...prev, [level]: '' }));

    abortRef.current = requestHintSSE(
      submissionId,
      level,
      // onChunk — append each token to the streaming buffer
      (delta: string) => {
        setStreamingHints((prev) => ({ ...prev, [level]: (prev[level] ?? '') + delta }));
      },
      // onDone — commit the streamed text to the final store
      () => {
        setStreamingHints((prev) => {
          const finalText = prev[level] ?? '';
          setUnlockedHints((u) => ({ ...u, [level]: finalText }));
          setLoadingLevel(null);
          // Clear streaming buffer now that we have the final text
          const next = { ...prev };
          delete next[level];
          return next;
        });
      },
      // onError
      (err: any) => {
        console.error('Hint SSE error:', err);
        setErrorMsg(err.message || 'Failed to generate hint.');
        setLoadingLevel(null);
        setStreamingHints((prev) => {
          const next = { ...prev };
          delete next[level];
          return next;
        });
      },
    );
  };

  if (!submissionId) return null;

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <h3
        style={{
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--color-text-muted)',
          fontWeight: 600,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        🔓 Progressive Hints
      </h3>

      {errorMsg && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          borderRadius: 8,
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.2)',
          color: 'var(--color-accent-rose)',
          fontSize: '0.85rem',
          lineHeight: 1.5,
        }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {HINT_LEVELS.map((hint) => {
          const isUnlocked = !!unlockedHints[hint.level];
          const isStreaming = loadingLevel === hint.level;
          const isLocked = hint.level > 1 && !unlockedHints[hint.level - 1] && !isUnlocked && !isStreaming;
          const isExpanded = expandedLevel === hint.level && (isUnlocked || isStreaming);

          // Show the live stream buffer if streaming, otherwise show committed text
          const displayText = isStreaming
            ? streamingHints[hint.level] ?? ''
            : unlockedHints[hint.level] ?? '';

          return (
            <motion.div
              key={hint.level}
              layout
              className={`hint-card ${isLocked ? 'locked' : ''} ${isUnlocked ? 'unlocked' : ''}`}
              onClick={() => !isLocked && !isStreaming && handleRequestHint(hint.level)}
              style={{
                borderLeftWidth: 3,
                borderLeftStyle: 'solid',
                borderLeftColor: isUnlocked || isStreaming
                  ? hint.color
                  : isLocked
                  ? 'var(--color-border)'
                  : `${hint.color}50`,
                cursor: isLocked || isStreaming ? 'default' : 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.3rem' }}>{isLocked ? '🔒' : hint.icon}</span>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: isLocked ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      }}
                    >
                      Level {hint.level}: {hint.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {isLocked
                        ? `Unlock Level ${hint.level - 1} first`
                        : isStreaming
                        ? 'Generating...'
                        : hint.subtitle}
                    </div>
                  </div>
                </div>

                {isStreaming ? (
                  <StreamingDot color={hint.color} />
                ) : isUnlocked ? (
                  <span
                    style={{
                      fontSize: '0.9rem',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    ▾
                  </span>
                ) : !isLocked ? (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: hint.color,
                      fontWeight: 600,
                      padding: '4px 10px',
                      border: `1px solid ${hint.color}40`,
                      borderRadius: 6,
                    }}
                  >
                    Unlock
                  </span>
                ) : null}
              </div>

              {/* Expanded / streaming hint content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTop: '1px solid var(--color-border)',
                        fontSize: '0.88rem',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                        fontFamily:
                          hint.level === 3 ? 'var(--font-mono)' : 'var(--font-sans)',
                      }}
                    >
                      {displayText}
                      {isStreaming && <BlinkingCursor />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StreamingDot({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: color }}
        />
      ))}
    </div>
  );
}

function BlinkingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.6, repeat: Infinity }}
      style={{
        display: 'inline-block',
        width: 2,
        height: '1em',
        background: 'var(--color-accent-primary)',
        marginLeft: 2,
        verticalAlign: 'text-bottom',
        borderRadius: 1,
      }}
    />
  );
}
