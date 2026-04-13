import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hintsAPI } from '../api';

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
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

  const handleRequestHint = async (level: number) => {
    if (!submissionId) return;
    if (unlockedHints[level]) {
      setExpandedLevel(expandedLevel === level ? null : level);
      return;
    }

    // Check prerequisite
    if (level > 1 && !unlockedHints[level - 1]) return;

    setLoadingLevel(level);
    try {
      const res = await hintsAPI.requestHint(submissionId, level);
      setUnlockedHints((prev) => ({ ...prev, [level]: res.data.hint }));
      setExpandedLevel(level);
    } catch (err: any) {
      console.error('Hint error:', err.response?.data?.error || err.message);
    } finally {
      setLoadingLevel(null);
    }
  };

  if (!submissionId) {
    return null;
  }

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <h3 style={{
        fontSize: '0.85rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--color-text-muted)',
        fontWeight: 600,
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        🔓 Progressive Hints
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {HINT_LEVELS.map((hint) => {
          const isUnlocked = !!unlockedHints[hint.level];
          const isLocked = hint.level > 1 && !unlockedHints[hint.level - 1] && !isUnlocked;
          const isLoading = loadingLevel === hint.level;
          const isExpanded = expandedLevel === hint.level && isUnlocked;

          return (
            <motion.div
              key={hint.level}
              layout
              className={`hint-card ${isLocked ? 'locked' : ''} ${isUnlocked ? 'unlocked' : ''}`}
              onClick={() => !isLocked && !isLoading && handleRequestHint(hint.level)}
              style={{
                borderLeftWidth: 3,
                borderLeftStyle: 'solid',
                borderLeftColor: isUnlocked ? hint.color : isLocked ? 'var(--color-border)' : `${hint.color}50`,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.3rem' }}>{isLocked ? '🔒' : hint.icon}</span>
                  <div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: isLocked ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    }}>
                      Level {hint.level}: {hint.title}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginTop: 2,
                    }}>
                      {isLocked ? `Unlock Level ${hint.level - 1} first` : hint.subtitle}
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="animate-pulse-glow" style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: hint.color,
                  }} />
                ) : isUnlocked ? (
                  <span style={{ fontSize: '0.9rem', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    ▾
                  </span>
                ) : !isLocked ? (
                  <span style={{
                    fontSize: '0.75rem',
                    color: hint.color,
                    fontWeight: 600,
                    padding: '4px 10px',
                    border: `1px solid ${hint.color}40`,
                    borderRadius: 6,
                  }}>
                    Unlock
                  </span>
                ) : null}
              </div>

              {/* Expanded hint content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px solid var(--color-border)',
                      fontSize: '0.88rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      fontFamily: hint.level === 3 ? 'var(--font-mono)' : 'var(--font-sans)',
                    }}>
                      {unlockedHints[hint.level]}
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
