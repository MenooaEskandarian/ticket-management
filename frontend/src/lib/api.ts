import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import type { ApiError } from "@/types";

const STORAGE_KEY = "golgift.tokens";

export interface Tokens {
  access: string;
  refresh: string;
}

export function readTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function writeTokens(tokens: Tokens | null) {
  try {
    if (tokens) localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // A browser with storage disabled still works, just not across reloads.
  }
}

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const tokens = readTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

/** Queue of requests parked while a single refresh is in flight. */
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens?.refresh) return null;

  try {
    const { data } = await axios.post<Tokens>("/api/auth/refresh", {
      refresh: tokens.refresh,
    });
    const next = { access: data.access, refresh: data.refresh ?? tokens.refresh };
    writeTokens(next);
    return next.access;
  } catch {
    writeTokens(null);
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = request?.url?.includes("/auth/");

    if (error.response?.status === 401 && request && !request._retried && !isAuthCall) {
      request._retried = true;
      // Share one refresh between every request that raced into a 401.
      refreshing = refreshing ?? refreshAccessToken();
      const access = await refreshing;
      refreshing = null;

      if (access) {
        request.headers = { ...request.headers, Authorization: `Bearer ${access}` };
        return api.request(request);
      }
    }

    return Promise.reject(error);
  },
);

/** Pull a readable sentence out of whatever the API returned. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  const payload = (error as AxiosError<ApiError>)?.response?.data;
  if (!payload) return fallback;
  if (payload.detail) return payload.detail;

  const first = Object.values(payload.fields ?? {})[0];
  if (Array.isArray(first)) return String(first[0]);
  if (typeof first === "string") return first;
  return fallback;
}

export function apiErrorBody(error: unknown): ApiError | undefined {
  return (error as AxiosError<ApiError>)?.response?.data;
}
