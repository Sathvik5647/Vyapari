/**
 * auth.ts — Signup, Login, Logout helpers + auth state
 */
import { apiClient, TokenStore } from './apiClient';

export type AuthUser = { id: string; email: string };

// ── Sign up a new vendor ──────────────────────────────────────
export async function signUp(email: string, password: string): Promise<AuthUser> {
  const res = await apiClient.post<{ access_token: string; user_id: string }>(
    '/auth/signup',
    { email, password },
    false,
  );
  await TokenStore.set(res.access_token);
  return { id: res.user_id, email };
}

// ── Log in an existing vendor ─────────────────────────────────
export async function logIn(email: string, password: string): Promise<AuthUser> {
  const res = await apiClient.post<{ access_token: string; user_id: string }>(
    '/auth/login',
    { email, password },
    false,
  );
  await TokenStore.set(res.access_token);
  return { id: res.user_id, email };
}

// ── Log out — clear stored token ──────────────────────────────
export async function logOut(): Promise<void> {
  await TokenStore.clear();
}

// ── Get current user info from the backend ────────────────────
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const me = await apiClient.get<{ id: string; email: string }>('/auth/me');
    return me;
  } catch {
    return null;
  }
}

// ── Check if there's a saved token (quick local check) ────────
export async function isLoggedIn(): Promise<boolean> {
  const token = await TokenStore.get();
  return !!token;
}
