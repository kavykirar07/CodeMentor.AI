import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send/receive HttpOnly cookies automatically
});

// Attach JWT token to every request (LocalStorage strategy)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('codementor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 (expired token)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url?.includes('/auth/logout')) {
      localStorage.removeItem('codementor_token');
      authAPI.logout().catch(() => {});
      // Let the auth context / router handle the redirect
    }
    return Promise.reject(err);
  },
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// ── Code Analysis (SSE) ───────────────────────────────────────────────────────
export function analyzeCodeSSE(
  code: string,
  language: string,
  onMessage: (data: any) => void,
  onError: (error: any) => void,
  compilerError?: string,
) {
  const token = localStorage.getItem('codementor_token');
  const controller = new AbortController();

  fetch(`${API_BASE}/code/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ code, language, compilerError }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        onError(err);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { onError({ error: 'No response stream' }); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onMessage(data);
              if (data.type === 'done' || data.type === 'error') {
                controller.abort();
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err);
    });
}

// ── Hints (SSE streaming) ─────────────────────────────────────────────────────
export function requestHintSSE(
  submissionId: string,
  level: number,
  onChunk: (delta: string) => void,
  onDone: () => void,
  onError: (err: any) => void,
): AbortController {
  const controller = new AbortController();
  const token = localStorage.getItem('codementor_token');

  fetch(`${API_BASE}/hints/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ submissionId, level }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Hint request failed' }));
        onError(err);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { onError({ error: 'No response stream' }); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'delta') onChunk(event.content);
              if (event.type === 'done') {
                onDone();
                controller.abort();
              }
              if (event.type === 'error' || event.type === 'blocked') {
                onError(new Error(event.message));
                controller.abort();
              }
            } catch { /* skip */ }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err);
    });

  return controller;
}

// ── Code Execution ────────────────────────────────────────────────────────────
export const executeAPI = {
  run: (data: { code: string; language: string; stdin?: string }) =>
    api.post('/execute', data),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getSummary: () => api.get('/analytics/summary'),
  getHistory: (page = 1, limit = 10) =>
    api.get(`/analytics/history?page=${page}&limit=${limit}`),
};

export default api;
