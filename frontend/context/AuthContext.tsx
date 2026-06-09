/**
 * AuthContext.tsx — Global auth state provider
 *
 * Provides:
 *   user      — cached user (id, email, role) or null
 *   loading   — true while reading from AsyncStorage on first launch
 *   refresh() — re-fetch from server to update role/has_store
 *   logout()  — clear and reset
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getCachedUser, getCurrentUser, logOut, AuthUser } from '../utils/auth';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: load from local cache instantly, then verify with server
  useEffect(() => {
    (async () => {
      const cached = await getCachedUser();
      setUser(cached);
      setLoading(false);
      // Background verify — updates role if it changed on server
      const fresh = await getCurrentUser();
      if (fresh) setUser(fresh);
    })();
  }, []);

  const refresh = useCallback(async () => {
    const fresh = await getCurrentUser();
    setUser(fresh);
  }, []);

  const logout = useCallback(async () => {
    await logOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
