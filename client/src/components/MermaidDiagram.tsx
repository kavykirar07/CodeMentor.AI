import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  darkMode: true,
  themeVariables: {
    primaryColor: '#6366f1',
    primaryTextColor: '#f1f5f9',
    primaryBorderColor: '#6366f1',
    lineColor: '#64748b',
    secondaryColor: '#1a2235',
    tertiaryColor: '#111827',
    mainBkg: '#1a2235',
    nodeBorder: '#334155',
    clusterBkg: '#111827',
    titleColor: '#f1f5f9',
    edgeLabelBackground: '#1a2235',
    fontSize: '13px',
  },
});

interface MermaidDiagramProps {
  diagram: string;
  title?: string;
}

let diagramCounter = 0;

export default function MermaidDiagram({ diagram, title = 'Logic Flow' }: MermaidDiagramProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const idRef = useRef(`mermaid-${++diagramCounter}`);

  useEffect(() => {
    if (!diagram || !isOpen) return;
    setError('');

    mermaid
      .render(idRef.current, diagram)
      .then(({ svg: rendered }) => setSvg(rendered))
      .catch((err: unknown) => {
        console.warn('[MermaidDiagram] render failed:', err);
        setError('Could not render diagram.');
      });
  }, [diagram, isOpen]);

  if (!diagram) return null;

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid rgba(20,184,166,0.25)',
          background: 'rgba(20,184,166,0.06)',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: isOpen ? 10 : 0,
          transition: 'all 0.2s',
        }}
      >
        <span>🗺️ {title}</span>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
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
                padding: 16,
                overflowX: 'auto',
              }}
            >
              {error ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                  {error}
                </p>
              ) : svg ? (
                <div
                  style={{ display: 'flex', justifyContent: 'center' }}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                  Rendering diagram…
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
