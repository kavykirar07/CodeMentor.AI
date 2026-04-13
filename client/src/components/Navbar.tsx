import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'var(--gradient-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          fontWeight: 800,
          color: 'white',
        }}>
          CM
        </div>
        <span style={{
          fontSize: '1.15rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
        }}>
          CodeMentor<span style={{ color: 'var(--color-accent-primary)' }}> AI</span>
        </span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {user && (
          <>
            <NavLink to="/workspace" active={isActive('/workspace')}>Workspace</NavLink>
            <NavLink to="/analytics" active={isActive('/analytics')}>Analytics</NavLink>
          </>
        )}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8 }}>
            <span style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-secondary)',
              padding: '6px 12px',
              background: 'var(--color-bg-card)',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
            }}>
              {user.name}
            </span>
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                padding: '6px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-rose)';
                e.currentTarget.style.color = 'var(--color-accent-rose)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            <NavLink to="/login" active={isActive('/login')}>Sign In</NavLink>
            <Link to="/register" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
              Get Started
            </Link>
          </>
        )}
      </div>
    </motion.nav>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        padding: '6px 14px',
        borderRadius: 8,
        fontSize: '0.9rem',
        fontWeight: 500,
        color: active ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
        background: active ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </Link>
  );
}
