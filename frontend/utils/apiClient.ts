/**
 * apiClient.ts — JWT-aware HTTP client for the Vyapari FastAPI backend
 *
 * Usage:
 *   import { apiClient } from '../utils/apiClient';
 *   const store = await apiClient.get('/api/stores/mine');
 *   const bill  = await apiClient.post('/api/stores/abc/bills', { items: [...], total: 99 });
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Base URL ─────────────────────────────────────────────────────────────────
// Physical Android device cannot use 'localhost' — it points to the phone itself.
// Set EXPO_PUBLIC_FASTAPI_URL in your frontend/.env to your PC's LAN IP.
const FALLBACK_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
export const BASE_URL = (process.env.EXPO_PUBLIC_FASTAPI_URL || FALLBACK_URL).replace(/\/$/, '');

const REQUEST_TIMEOUT_MS = 15_000;
const TOKEN_KEY = '@vyapari_token';

// ── Token storage ────────────────────────────────────────────────────────────
export const TokenStore = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY),
};

// ── Core fetch wrapper ───────────────────────────────────────────────────────
async function request<T = any>(
  path: string,
  options: RequestInit = {},
  requiresAuth = true,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (requiresAuth) {
    const token = await TokenStore.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (res.status === 204) return undefined as T;

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = json?.detail || json?.message || `HTTP ${res.status}`;
      throw new Error(message);
    }

    return json as T;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error(
        `Request timed out (${REQUEST_TIMEOUT_MS / 1000}s).\n` +
        `Ensure FastAPI is running at ${BASE_URL}`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ── Public API client ────────────────────────────────────────────────────────
export const apiClient = {
  get<T = any>(path: string, requiresAuth = true) {
    return request<T>(path, { method: 'GET' }, requiresAuth);
  },

  post<T = any>(path: string, body?: object, requiresAuth = true) {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body) }, requiresAuth);
  },

  patch<T = any>(path: string, body?: object, requiresAuth = true) {
    return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, requiresAuth);
  },

  delete<T = any>(path: string, requiresAuth = true) {
    return request<T>(path, { method: 'DELETE' }, requiresAuth);
  },
};
