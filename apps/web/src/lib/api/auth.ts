import { apiFetch } from "./client";
import { isDemoMode } from "./demo";
import type { AuthResponse, LoginCredentials, RegisterData, User } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Login do usuário. Retorna user + access token no body.
 * O refresh token é setado pelo backend em cookie HttpOnly (transparente).
 */
export const login = (credentials: LoginCredentials) =>
  apiFetch<AuthResponse>(`/auth/login`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });

/** Registro de novo usuário. Retorna apenas o user; faça login em seguida. */
export const register = (data: RegisterData) =>
  apiFetch<User>(`/auth/register`, {
    method: "POST",
    body: JSON.stringify(data),
  });

/**
 * Logout. O backend revoga o jti do cookie e limpa o cookie.
 * Idempotente: fetch direto (não passa por apiFetch pra evitar refresh-on-401).
 */
export const logoutApi = async (): Promise<void> => {
  if (isDemoMode) return;
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch {
    // Best effort — limpar localmente é o que importa
  }
};
