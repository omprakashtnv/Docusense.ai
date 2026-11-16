export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'
).replace(/\/$/, '');

const DEMO_ACCESS_KEY_STORAGE = 'docusense-demo-access-key';

interface ApiErrorBody {
  error?: { message?: string };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getStoredDemoAccessKey(): string | null {
  return window.sessionStorage.getItem(DEMO_ACCESS_KEY_STORAGE);
}

function requestDemoAccessKey(): string | null {
  const key = window.prompt('Enter the DocuSense AI demo access key:')?.trim();
  if (!key) return null;
  window.sessionStorage.setItem(DEMO_ACCESS_KEY_STORAGE, key);
  return key;
}

function withDemoAccess(options: RequestInit | undefined, key: string | null): RequestInit {
  const headers = new Headers(options?.headers);
  if (key) headers.set('Authorization', `Bearer ${key}`);
  return { ...options, headers };
}

async function sendRequest(path: string, options: RequestInit | undefined, key: string | null) {
  return fetch(`${API_BASE_URL}${path}`, withDemoAccess(options, key));
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let key = getStoredDemoAccessKey();
  let response = await sendRequest(path, options, key);

  if (response.status === 401) {
    window.sessionStorage.removeItem(DEMO_ACCESS_KEY_STORAGE);
    key = requestDemoAccessKey();
    if (key) response = await sendRequest(path, options, key);
  }

  const body = response.status === 204 ? null : await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    throw new ApiError(errorBody.error?.message ?? 'The request failed.', response.status);
  }

  return body as T;
}
