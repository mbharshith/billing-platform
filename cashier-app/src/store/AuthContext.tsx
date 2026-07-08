/**
 * AuthContext — login / logout / current session.
 *
 * SaaS model: every user belongs to exactly one tenant (store).
 * `currentStoreId` is derived from `currentUser.storeId` — there is no
 * runtime switcher, no cross-tenant view, no ambient scope choice.
 * This is the same pattern Jira / Shopify / Notion enforce.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type FC, type ReactNode,
} from 'react';
import { storage } from '../lib/storage';
import { can, isMaster, type Action } from '../domain/permissions';
import type { SessionUser } from '../domain/types';
import { toSessionUser, useUsers } from './UsersContext';

const SESSION_KEY = 'session';

export type LoginResult =
  | { readonly ok: true; readonly user: SessionUser }
  | { readonly ok: false; readonly reason: 'invalid' | 'inactive' };

interface AuthContextValue {
  readonly currentUser: SessionUser | null;
  /** The tenant id this session is bound to. Null iff not logged in. */
  readonly currentStoreId: string | null;
  readonly isMaster: boolean;
  readonly login: (username: string, password: string) => LoginResult;
  /** Directly promote a freshly-created user (e.g. right after signup). */
  readonly loginAs: (user: SessionUser) => void;
  readonly logout: () => void;
  readonly can: (action: Action) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { users, findByUsername } = useUsers();

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(
    () => storage.load<SessionUser | null>(SESSION_KEY, null),
  );

  // Re-hydrate the persisted session against the LIVE users list once it's
  // actually loaded from IndexedDB. Guarded by a ref so we only run the
  // reconciliation the first time we see a non-empty users array — otherwise
  // the empty first-render list would spuriously log the user out.
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (reconciledRef.current) return;
    if (users.length === 0) return;      // users still hydrating from Dexie
    reconciledRef.current = true;
    if (!currentUser) return;
    const fresh = findByUsername(currentUser.username);
    if (!fresh) { setCurrentUser(null); return; }
    if (fresh.storeId !== currentUser.storeId || fresh.role !== currentUser.role) {
      setCurrentUser(toSessionUser(fresh));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  useEffect(() => {
    if (currentUser) storage.save(SESSION_KEY, currentUser);
    else storage.remove(SESSION_KEY);
  }, [currentUser]);

  const login = useCallback((username: string, password: string): LoginResult => {
    const user = findByUsername(username.trim());
    if (!user || user.password !== password) return { ok: false, reason: 'invalid' };
    if (!user.active)                          return { ok: false, reason: 'inactive' };
    const session = toSessionUser(user);
    setCurrentUser(session);
    return { ok: true, user: session };
  }, [findByUsername]);

  const loginAs = useCallback((user: SessionUser) => {
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => setCurrentUser(null), []);

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    currentStoreId: currentUser?.storeId ?? null,
    isMaster: isMaster(currentUser),
    login,
    loginAs,
    logout,
    can: (action) => can(currentUser, action),
  }), [currentUser, login, loginAs, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};

/** Helper — the tenant id this session is bound to. */
export const useCurrentStoreId = (): string | null => useAuth().currentStoreId;
