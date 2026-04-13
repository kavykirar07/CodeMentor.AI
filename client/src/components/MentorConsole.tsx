import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MentorConsoleProps {
  analysis: {
    conceptualGap: string;
    analogy: string;
    leadingQuestion: string;
    summary: string;
  } | null;
  isLoading: boolean;
  statusMessage: string;
}

export default function MentorConsole({ analysis, isLoading, statusMessage }: MentorConsoleProps) {
  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}>
          <div className="animate-pulse-glow" style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'var(--color-accent-primary)',
          }} />
          <span style={{ color: 'var(--color-accent-primary)', fontWeight: 500, fontSize: '0.9rem' }}>
            {statusMessage || 'Analyzing...'}
          </span>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-shimmer" style={{
            height: 80,
            borderRadius: 12,
            marginBottom: 12,
            background: 'var(--color-bg-card)',
          }} />
        ))}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.4 }}>🧠</div>
        <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 8, color: 'var(--color-text-secondary)' }}>
          Mentor Console
        </h3>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
          Submit your code and I'll analyze it using the Socratic method — <br />
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
        style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}
      >
        {/* Summary */}
        {analysis.summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            style={{
              padding: '14px 18px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 10,
              fontSize: '0.9rem',
              fontWeight: 500,
              color: 'var(--color-accent-primary)',
            }}
          >
            💡 {analysis.summary}
          </motion.div>
        )}

        {/* Conceptual Gap */}
        <FeedbackSection
          delay={0.1}
          icon="🎯"
          title="Conceptual Gap"
          content={analysis.conceptualGap}
          color="#6366f1"
        />

        {/* Real-World Analogy */}
        <FeedbackSection
          delay={0.2}
          icon="🌍"
          title="Real-World Analogy"
          content={analysis.analogy}
          color="#14b8a6"
        />

        {/* Leading Question */}
        <FeedbackSection
          delay={0.3}
          icon="❓"
          title="Leading Question"
          content={analysis.leadingQuestion}
          color="#f59e0b"
        />
      </motion.div>
    </AnimatePresence>
  );
}

function FeedbackSection({
  icon,
  title,
  content,
  color,
  delay,
}: {
  icon: string;
  title: string;
  content: string;
  color: string;
  delay: number;
}) {
  if (!content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="mentor-section"
    >
      <h4 style={{ color, display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon} {title}
      </h4>
      <p style={{
        fontSize: '0.9rem',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.7,
      }}>
        {content}
      </p>
    </motion.div>
  );
}
