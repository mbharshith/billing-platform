/**
 * AuthContext — login / logout, current session.
 * Reads users from UsersContext (must be nested inside UsersProvider).
 * Session persisted in localStorage so refresh doesn't kick you out.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type FC, type ReactNode,
} from 'react';
import { storage } from '../lib/storage';
import type { SessionUser } from '../domain/types';
import { toSessionUser, useUsers } from './UsersContext';

const STORAGE_KEY = 'session';

export type LoginResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'invalid' | 'inactive' };

interface AuthContextValue {
  readonly currentUser: SessionUser | null;
  readonly isAdmin: boolean;
  readonly login: (username: string, password: string) => LoginResult;
  readonly logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { findByUsername } = useUsers();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(
    () => storage.load<SessionUser | null>(STORAGE_KEY, null),
  );

  useEffect(() => {
    if (currentUser) storage.save(STORAGE_KEY, currentUser);
    else storage.remove(STORAGE_KEY);
  }, [currentUser]);

  const login = useCallback((username: string, password: string): LoginResult => {
    const user = findByUsername(username.trim());
    if (!user || user.password !== password) return { ok: false, reason: 'invalid' };
    if (!user.active)                          return { ok: false, reason: 'inactive' };
    setCurrentUser(toSessionUser(user));
    return { ok: true };
  }, [findByUsername]);

  const logout = useCallback(() => setCurrentUser(null), []);

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    isAdmin: currentUser?.role === 'admin',
    login,
    logout,
  }), [currentUser, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
