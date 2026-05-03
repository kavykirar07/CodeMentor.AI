import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from './api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('codementor_token'));
  const [loading, setLoading] = useState(true);

  // ── Rehydrate session on mount ───────────────────────────────────────────────
  // If we have a stored token, verify it's still valid with the server.
  // This also handles the case where the server set an HttpOnly cookie — in
  // that scenario, the `getMe` call succeeds via cookie even if localStorage
  // has been cleared.
  useEffect(() => {
    const storedToken = localStorage.getItem('codementor_token');
    if (storedToken) {
      authAPI
        .getMe()
        .then((res) => {
          setUser(res.data.user);
          setToken(storedToken);
        })
        .catch(() => {
          // Token is stale — wipe client-side state
          localStorage.removeItem('codementor_token');
          setToken(null);
          setUser(null);
          // ALSO wipe the server-side HttpOnly cookie to prevent infinite loops
          authAPI.logout().catch(() => {});
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('codementor_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await authAPI.register({ email, password, name });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('codementor_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await authAPI.logout(); // clears HttpOnly cookie server-side
    } catch {
      // ignore network errors on logout
    }
    localStorage.removeItem('codementor_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
