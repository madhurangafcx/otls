// Typed fetch client for the Bun backend.
// Uses absolute URLs (NEXT_PUBLIC_API_URL) rather than relative /api/* so it
// works from both the server (RSC fetch) and the client. In dev, both host
// localhost origins; in prod the backend runs at a different host.

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

type ApiErrorBody = { error: { code: string; message: string; request_id?: string } };

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    let body: ApiErrorBody;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = { error: { code: 'UNKNOWN', message: res.statusText } };
    }
    throw new ApiClientError(
      res.status,
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? res.statusText,
      body.error?.request_id
    );
  }

  return (await res.json()) as T;
}

export type SessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
};

export type ProfilePayload = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'student';
  created_at: string;
};

export const api = {
  auth: {
    register: (body: { email: string; password: string; full_name?: string }) =>
      request<{
        data: {
          user: { id: string; email: string };
          session: SessionPayload | null;
        };
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    login: (body: { email: string; password: string }) =>
      request<{
        data: {
          user: { id: string; email: string };
          session: SessionPayload;
        };
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    me: (accessToken: string) =>
      request<{ data: ProfilePayload }>('/api/auth/me', undefined, accessToken),

    logout: (accessToken: string) =>
      request<{ data: { ok: boolean } }>(
        '/api/auth/logout',
        { method: 'POST' },
        accessToken
      ),
  },
};
