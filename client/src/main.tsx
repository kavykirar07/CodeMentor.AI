import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Landing   from './pages/Landing';
import Workspace from './pages/Workspace';
import Analytics from './pages/Analytics';
import Login     from './pages/Login';
import Register  from './pages/Register';
import Navbar    from './components/Navbar';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="animate-pulse-glow" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gradient-primary)' }} />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    // Top-level ErrorBoundary so any fatal crash shows a friendly screen
    <ErrorBoundary name="App">
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/"          element={<Landing />} />
            <Route path="/login"     element={<Login />} />
            <Route path="/register"  element={<Register />} />
            <Route path="/workspace" element={
              <ProtectedRoute>
                <ErrorBoundary name="Workspace">
                  <Workspace />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <ErrorBoundary name="Analytics">
                  <Analytics />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            {/* 404 */}
            <Route path="*" element={
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
                <div style={{ fontSize: '4rem', opacity: 0.4 }}>🌌</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>404 — Page not found</h1>
                <Navigate to="/" replace />
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
