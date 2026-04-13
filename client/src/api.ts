import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('codementor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Code Analysis (SSE)
export function analyzeCodeSSE(
  code: string,
  language: string,
  onMessage: (data: any) => void,
  onError: (error: any) => void
) {
  const token = localStorage.getItem('codementor_token');

  fetch(`${API_BASE}/code/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code, language }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        onError(err);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError({ error: 'No response stream' });
        return;
      }

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
            } catch {
              // skip malformed
            }
          }
        }
      }
    })
    .catch(onError);
}

// Hints
export const hintsAPI = {
  requestHint: (submissionId: string, level: number) =>
    api.post('/hints/request', { submissionId, level }),
};

// Analytics
export const analyticsAPI = {
  getSummary: () => api.get('/analytics/summary'),
  getHistory: (page = 1, limit = 10) =>
    api.get(`/analytics/history?page=${page}&limit=${limit}`),
};

export default api;
