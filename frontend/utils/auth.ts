/**
 * auth.ts — Signup, Login, Logout helpers + auth state with role support
 */
import { apiClient, TokenStore } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROLE_KEY = '@vyapari_role';
const USER_ID_KEY = '@vyapari_user_id';
const USER_EMAIL_KEY = '@vyapari_user_email';

export type UserRole = 'customer' | 'vendor';
export type AuthUser = { id: string; email: string; role: UserRole; has_store?: boolean };

// ── Persist user info locally ─────────────────────────────────
async function saveUserLocally(user: AuthUser, token: string) {
  await Promise.all([
    TokenStore.set(token),
    AsyncStorage.setItem(ROLE_KEY, user.role),
    AsyncStorage.setItem(USER_ID_KEY, user.id),
    AsyncStorage.setItem(USER_EMAIL_KEY, user.email),
  ]);
}

// ── Sign up a new account ─────────────────────────────────────
export async function signUp(
  email: string,
  password: string,
  role: UserRole = 'customer',
): Promise<AuthUser> {
  const res = await apiClient.post<{ access_token: string; user_id: string; role: string }>(
    '/auth/signup',
    { email, password, role },
    false,
  );
  const user: AuthUser = { id: res.user_id, email, role: res.role as UserRole };
  await saveUserLocally(user, res.access_token);
  return user;
}

// ── Log in an existing account ────────────────────────────────
export async function logIn(email: string, password: string): Promise<AuthUser> {
  const res = await apiClient.post<{ access_token: string; user_id: string; role: string }>(
    '/auth/login',
    { email, password },
    false,
  );
  const user: AuthUser = { id: res.user_id, email, role: res.role as UserRole };
  await saveUserLocally(user, res.access_token);
  return user;
}

// ── Upgrade current user to vendor ───────────────────────────
export async function becomeVendor(): Promise<AuthUser> {
  const res = await apiClient.post<{ access_token: string; user_id: string; role: string }>(
    '/auth/become-vendor',
    {},
  );
  const email = (await AsyncStorage.getItem(USER_EMAIL_KEY)) || '';
  const user: AuthUser = { id: res.user_id, email, role: 'vendor' };
  await saveUserLocally(user, res.access_token);
  return user;
}

// ── Log out — clear all stored data ──────────────────────────
export async function logOut(): Promise<void> {
  await Promise.all([
    TokenStore.clear(),
    AsyncStorage.removeItem(ROLE_KEY),
    AsyncStorage.removeItem(USER_ID_KEY),
    AsyncStorage.removeItem(USER_EMAIL_KEY),
  ]);
}

// ── Get current user from local storage (fast, no network) ───
export async function getCachedUser(): Promise<AuthUser | null> {
  const [token, role, id, email] = await Promise.all([
    TokenStore.get(),
    AsyncStorage.getItem(ROLE_KEY),
    AsyncStorage.getItem(USER_ID_KEY),
    AsyncStorage.getItem(USER_EMAIL_KEY),
  ]);
  if (!token || !id) return null;
  return { id, email: email || '', role: (role as UserRole) || 'customer' };
}

// ── Verify with server and get fresh user data ────────────────
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const me = await apiClient.get<{ id: string; email: string; role: string; has_store: boolean }>(
      '/auth/me',
    );
    const user: AuthUser = { ...me, role: me.role as UserRole };
    // Refresh local cache
    await Promise.all([
      AsyncStorage.setItem(ROLE_KEY, user.role),
      AsyncStorage.setItem(USER_ID_KEY, user.id),
      AsyncStorage.setItem(USER_EMAIL_KEY, user.email),
    ]);
    return user;
  } catch {
    return null;
  }
}

// ── Quick check — is there a local token? ────────────────────
export async function isLoggedIn(): Promise<boolean> {
  const token = await TokenStore.get();
  return !!token;
}

// ── Quick role check from cache ───────────────────────────────
export async function getCachedRole(): Promise<UserRole | null> {
  const role = await AsyncStorage.getItem(ROLE_KEY);
  return (role as UserRole) || null;
}
