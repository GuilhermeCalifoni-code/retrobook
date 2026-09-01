/**
 * Origem da API.
 *
 * Em desenvolvimento e no deploy padrao a API responde no mesmo dominio, sob
 * `/api` — no dev via proxy do Vite, em producao via rewrite da Vercel. Manter
 * a API na mesma origem nao e detalhe de conveniencia: a sessao vive em cookie
 * `httpOnly`, e cookie same-origin dispensa `SameSite=None`, que exige
 * confianca no navegador e quebra em bloqueadores de cookie de terceiros.
 *
 * `VITE_API_URL` existe para o caso de a API ser servida em outro dominio.
 * Quando usada, a API precisa marcar os cookies como `SameSite=None; Secure`
 * (ver COOKIE_SAMESITE no backend) e listar esta origem no CORS.
 */
const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: ApiErrorPayload,
  ) {
    super(payload.message);
    this.name = 'ApiError';
  }

  get code() {
    return this.payload.code;
  }

  /** 402 = acao bloqueada pelo plano atual. A UI usa isso para propor o upgrade. */
  get isPlanLimit() {
    return this.status === 402;
  }

  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.payload.details)) return {};
    const entries = (this.payload.details as { field?: string; message?: string }[])
      .filter((d) => d.field && d.message)
      .map((d) => [d.field!, d.message!] as const);
    return Object.fromEntries(entries);
  }
}

/** Evita uma tempestade de refresh quando varias queries recebem 401 juntas. */
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        window.setTimeout(() => {
          refreshPromise = null;
        }, 0);
      });
  }
  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Nao tenta renovar a sessao (usado pelos proprios endpoints de auth). */
  skipRefresh?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { body, query, skipRefresh, headers, ...rest } = options;

  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...rest,
  });

  if (response.status === 401 && !isRetry && !skipRefresh) {
    const renewed = await refreshSession();
    if (renewed) return request<T>(path, options, true);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error ?? { code: 'network_error', message: 'Nao conseguimos falar com o servidor.' },
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'POST', body, ...options }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
};
