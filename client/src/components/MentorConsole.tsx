import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IASTInsight, IAnalysis } from '../types';

interface MentorConsoleProps {
  analysis: IAnalysis | null;
  isLoading: boolean;
  statusMessage: string;
  astInsights?: IASTInsight[];
  struggling?: boolean;
}

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: '🚨' },
  warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: '⚠️' },
  info:     { color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  icon: 'ℹ️' },
};

export default function MentorConsole({ analysis, isLoading, statusMessage, astInsights = [], struggling = false }: MentorConsoleProps) {

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="animate-pulse-glow" style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-accent-primary)' }} />
          <span style={{ color: 'var(--color-accent-primary)', fontWeight: 500, fontSize: '0.9rem' }}>
            {statusMessage || 'Analyzing…'}
          </span>
        </div>
        {/* AST results may arrive before AI — show them early */}
        {astInsights.length > 0 && <ASTInsightsList insights={astInsights} />}
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-shimmer" style={{ height: 80, borderRadius: 12, marginBottom: 12, background: 'var(--color-bg-card)' }} />
        ))}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.4 }}>🧠</div>
        <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 8, color: 'var(--color-text-secondary)' }}>
          Mentor Console
        </h3>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
          Submit your code and I'll analyze it using the Socratic method —<br />
          no direct fixes, just guided learning.
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {/* Struggle mode banner */}
        {struggling && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              fontSize: '0.85rem', color: '#f59e0b', fontWeight: 500,
            }}
          >
            🔥 <strong>Struggle Mode Active</strong> — I can see this concept has been tricky. Let's slow down and really understand it together.
          </motion.div>
        )}

        {/* AST insights — shown before AI analysis cards */}
        {astInsights.length > 0 && <ASTInsightsList insights={astInsights} />}

        {/* Summary */}
        {analysis.summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '14px 18px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-accent-primary)' }}
          >
            💡 {analysis.summary}
          </motion.div>
        )}

        <FeedbackSection delay={0.1} icon="🎯" title="Conceptual Gap"    content={analysis.conceptualGap}   color="#6366f1" />
        <FeedbackSection delay={0.2} icon="🌍" title="Real-World Analogy" content={analysis.analogy}          color="#14b8a6" />
        <FeedbackSection delay={0.3} icon="❓" title="Leading Question"   content={analysis.leadingQuestion}  color="#f59e0b" />
      </motion.div>
    </AnimatePresence>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ASTInsightsList({ insights }: { insights: IASTInsight[] }) {
  const critical = insights.filter((i) => i.severity === 'critical');
  const others   = insights.filter((i) => i.severity !== 'critical');
  const ordered  = [...critical, ...others];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 8 }}>
        🔬 Static Analysis
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ordered.map((insight, i) => {
          const cfg = SEVERITY_CONFIG[insight.severity];
          return (
            <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: '0.85rem' }}>{cfg.icon}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {insight.type.replace(/-/g, ' ')}
                </span>
                {insight.line && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    line {insight.line}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {insight.description}
              </p>
              <p style={{ fontSize: '0.78rem', color: cfg.color, margin: '6px 0 0', opacity: 0.8 }}>
                Fix: {insight.fix}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function FeedbackSection({ icon, title, content, color, delay }: {
  icon: string; title: string; content: string; color: string; delay: number;
}) {
  if (!content) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="mentor-section"
    >
      <h4 style={{ color, display: 'flex', alignItems: 'center', gap: 8 }}>{icon} {title}</h4>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{content}</p>
    </motion.div>
  );
}
