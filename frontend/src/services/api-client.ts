export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'
).replace(/\/$/, '');

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

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    throw new ApiError(errorBody.error?.message ?? 'The request failed.', response.status);
  }

  return body as T;
}
