import {
  getTokenFromStore,
  logoutFromStore,
  setTokenInStore,
} from "@/lib/stores/authStore";
import { DemoApiError, demoFetch, isDemoMode } from "./demo";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** Custom API error com status HTTP e body da resposta. */
export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`API Error ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// Single-flight: garante que múltiplas requisições 401 simultâneas só
// chamam /auth/refresh uma vez.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include", // envia cookie HttpOnly do refresh
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { token: string };
    setTokenInStore(data.token);
    return data.token;
  } catch {
    return null;
  }
}

function shouldSkipRefresh(path: string): boolean {
  return path.startsWith("/auth/");
}

function buildHeaders(token: string | null, options?: RequestInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options?.body instanceof FormData) {
    delete headers["Content-Type"];
  }
  return headers;
}

/**
 * Wrapper de fetch com:
 *  - injeção automática de access token
 *  - credentials: "include" para enviar cookie HttpOnly do refresh
 *  - tentativa de refresh single-flight em 401 (uma vez por request)
 *  - logout local se refresh falhar
 *  - ApiError com status + body em caso de erro
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (isDemoMode) {
    return demoFetch<T>(path, options).catch((err) => {
      throw err instanceof DemoApiError ? new ApiError(err.status, err.body) : err;
    });
  }

  let token = getTokenFromStore();

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: buildHeaders(token, options),
  });

  if (res.status === 401 && !shouldSkipRefresh(path)) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;

    if (!newToken) {
      logoutFromStore();
      const body = await res.text().catch(() => "");
      throw new ApiError(401, body || "Sessão expirada");
    }

    token = newToken;
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: buildHeaders(token, options),
    });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
