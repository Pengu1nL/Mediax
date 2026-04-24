const TOKEN_KEY = 'mediax.auth-token.v1';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function notifyAuthExpired(): void {
  window.dispatchEvent(new CustomEvent('mediax:auth-expired'));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(path, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    notifyAuthExpired();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as any).error ?? `请求失败 (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(`/api${path}`);
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(`/api${path}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(`/api${path}`, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(`/api${path}`, { method: 'DELETE' });
  },
};
