import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // In production, forward to Sentry: Sentry.captureException(error, { extra: errorInfo });
    console.error(`[ErrorBoundary:${this.props.name ?? 'unknown'}]`, error, errorInfo);
  }

  handleReset = () => this.setState({ hasError: false, error: undefined, errorInfo: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          textAlign: 'center',
          minHeight: 300,
          gap: 16,
        }}
      >
        <div style={{ fontSize: '3rem', opacity: 0.7 }}>💥</div>
        <h2
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Something went wrong in{' '}
          <span style={{ color: 'var(--color-accent-primary)' }}>
            {this.props.name ?? 'this section'}
          </span>
        </h2>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--color-text-muted)',
            maxWidth: 400,
            lineHeight: 1.6,
          }}
        >
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          onClick={this.handleReset}
          style={{
            padding: '9px 22px',
            borderRadius: 10,
            border: '1px solid var(--color-accent-primary)',
            background: 'rgba(99,102,241,0.1)',
            color: 'var(--color-accent-primary)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          ↺ Try again
        </button>
      </div>
    );
  }
}
