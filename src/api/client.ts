import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiError } from '@/types';

const TOKEN_STORAGE_KEY = 'kurio.session.token';

export const SESSION_EXPIRED_EVENT = 'kurio:session-expired';

export function getSessionToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function clearSessionAndNotify(): void {
  const hadToken = Boolean(getSessionToken());
  setSessionToken(null);
  if (hadToken && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'content-type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class ApiRequestError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;
  details?: Record<string, unknown>;

  constructor(error: ApiError, status: number) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.code = error.code;
    this.status = status;
    this.fields = error.fields;
    this.details = error.details;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: ApiError }>) => {
    const status = error.response?.status;
    const body = error.response?.data;
    if (status === 401 && body && 'error' in body && !body.error?.fields) {
      clearSessionAndNotify();
    }
    if (error.response?.data && 'error' in error.response.data) {
      const apiError = error.response.data.error;
      return Promise.reject(new ApiRequestError(apiError, error.response.status));
    }
    return Promise.reject(error);
  },
);

export function isApiError(value: unknown): value is ApiRequestError {
  return value instanceof ApiRequestError;
}

export function isNetworkError(value: unknown): boolean {
  return value instanceof AxiosError && !value.response;
}