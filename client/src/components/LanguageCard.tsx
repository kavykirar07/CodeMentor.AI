import React from 'react';
import { motion } from 'framer-motion';

interface LanguageCardProps {
  name: string;
  icon: string;
  color: string;
  description: string;
  onClick: () => void;
}

export default function LanguageCard({ name, icon, color, description, onClick }: LanguageCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        padding: '32px 28px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 8px 32px ${color}25, 0 0 0 1px ${color}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Gradient glow background */}
      <div style={{
        position: 'absolute',
        top: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}15, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Icon */}
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.6rem',
        marginBottom: 20,
      }}>
        {icon}
      </div>

      {/* Content */}
      <h3 style={{
        fontSize: '1.2rem',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: 8,
      }}>
        {name}
      </h3>
      <p style={{
        fontSize: '0.85rem',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.6,
      }}>
        {description}
      </p>

      {/* Arrow indicator */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 24,
        color: color,
        fontSize: '1.2rem',
        opacity: 0.6,
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}>
        →
      </div>
    </motion.div>
  );
}
