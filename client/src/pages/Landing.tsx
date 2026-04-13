import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LanguageCard from '../components/LanguageCard';
import { useAuth } from '../AuthContext';

const LANGUAGES = [
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: '⚡',
    color: '#f7df1e',
    description: 'Master async/await, closures, prototypes, and modern ES6+ patterns.',
  },
  {
    id: 'python',
    name: 'Python',
    icon: '🐍',
    color: '#3776ab',
    description: 'Debug generators, decorators, list comprehensions, and OOP concepts.',
  },
  {
    id: 'cpp',
    name: 'C++',
    icon: '⚙️',
    color: '#00599C',
    description: 'Tackle pointers, memory management, templates, and STL containers.',
  },
  {
    id: 'java',
    name: 'Java',
    icon: '☕',
    color: '#ED8B00',
    description: 'Understand inheritance, generics, streams, and design patterns.',
  },
];

const FEATURES = [
  {
    icon: '🧠',
    title: 'Socratic Method',
    description: 'No direct answers — guided questions help you discover solutions yourself.',
  },
  {
    icon: '🔓',
    title: 'Progressive Hints',
    description: '3-tier system: Concept → Pseudocode → Solution. Unlock at your own pace.',
  },
  {
    icon: '📊',
    title: 'Smart Analytics',
    description: 'Track your weaknesses, spot patterns, and watch yourself grow over time.',
  },
  {
    icon: '🛡️',
    title: 'Production-Grade',
    description: 'Rate limiting, caching, prompt-injection protection — built for scale.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLanguageSelect = (langId: string) => {
    if (user) {
      navigate(`/workspace?lang=${langId}`);
    } else {
      navigate('/register');
    }
  };

  return (
    <div style={{ flex: 1 }}>
      {/* Hero Section */}
      <section style={{
        background: 'var(--gradient-hero)',
        padding: '80px 24px 100px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decorative elements */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.06), transparent)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 50,
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              fontSize: '0.8rem',
              color: 'var(--color-accent-primary)',
              fontWeight: 500,
              marginBottom: 28,
            }}>
              ✨ Teaching-First AI Architecture
            </div>

            {/* Heading */}
            <h1 style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: 20,
            }}>
              Debug with{' '}
              <span className="text-gradient">Understanding</span>,
              <br />
              Not Just Fixes
            </h1>

            {/* Subheading */}
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'var(--color-text-secondary)',
              maxWidth: 600,
              margin: '0 auto 36px',
              lineHeight: 1.7,
            }}>
              CodeMentor AI is your Socratic tutor — it analyzes your code, identifies
              errors, and guides you to the solution through progressive hints and
              concept-driven feedback.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={() => navigate(user ? '/workspace' : '/register')}
                style={{ fontSize: '1rem', padding: '14px 32px' }}
              >
                Start Learning →
              </button>
              <button
                className="btn-secondary"
                onClick={() => document.getElementById('languages')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explore Languages
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 style={{
            textAlign: 'center',
            fontSize: '1.6rem',
            fontWeight: 800,
            marginBottom: 12,
            letterSpacing: '-0.02em',
          }}>
            Learn <span className="text-gradient">Differently</span>
          </h2>
          <p style={{
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: '0.95rem',
            marginBottom: 48,
          }}>
            Built on pedagogical principles, not just pattern matching
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
          }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card"
                style={{ padding: '28px 24px' }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Language Selection */}
      <section id="languages" style={{
        padding: '80px 24px 100px',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 style={{
            textAlign: 'center',
            fontSize: '1.6rem',
            fontWeight: 800,
            marginBottom: 12,
            letterSpacing: '-0.02em',
          }}>
            Choose Your <span className="text-gradient">Language</span>
          </h2>
          <p style={{
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: '0.95rem',
            marginBottom: 48,
          }}>
            Select a language and paste your code to get started
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 20,
          }}>
            {LANGUAGES.map((lang, i) => (
              <motion.div
                key={lang.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <LanguageCard
                  name={lang.name}
                  icon={lang.icon}
                  color={lang.color}
                  description={lang.description}
                  onClick={() => handleLanguageSelect(lang.id)}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '28px 24px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: '0.8rem',
      }}>
        © {new Date().getFullYear()} CodeMentor AI — Teaching-First Debugging Platform. Built with 🧠
      </footer>
    </div>
  );
}
