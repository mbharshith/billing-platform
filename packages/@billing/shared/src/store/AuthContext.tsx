
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type FC, type ReactNode,
} from 'react';
import { storage } from '@billing/shared/lib/storage';
import { db } from '@billing/shared/lib/db';
import { can, isAdmin, isVendor, type Action } from '@billing/shared/domain/permissions';
import type { SessionUser } from '@billing/shared/domain/types';
import { VENDOR_SCOPE } from '@billing/shared/domain/types';
import { toSessionUser, useUsers } from './UsersContext';

const SESSION_KEY = 'session';
const OUTLET_KEY_PREFIX = 'active-outlet:';   // per-user active outlet id

// * SHA-256 hash — used to avoid storing passwords in plaintext.
const sha256 = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text);
  const buf   = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

export type LoginResult =
  | { readonly ok: true; readonly user: SessionUser }
  | { readonly ok: false; readonly reason: 'invalid' | 'inactive' | 'suspended' };

interface AuthContextValue {
  readonly currentUser: SessionUser | null;
  // The tenant id this session is bound to. Null iff not logged in.
  readonly currentStoreId: string | null;
  // Physical outlet the user is operating at. Defaults to their storeId if *  no outlet has been explicitly picked yet. Null iff not logged in.
  readonly currentOutletId: string | null;
  readonly setCurrentOutletId: (outletId: string) => void;
  readonly isAdmin: boolean;
  readonly isVendor: boolean;
  readonly login: (username: string, password: string) => Promise<LoginResult>;
  // Directly promote a freshly-created user (e.g. right after signup).
  readonly loginAs: (user: SessionUser) => void;
  readonly logout: () => void;
  readonly can: (action: Action) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// * Read the persisted outlet id for a user, defaulting to their storeId.
const readOutletFor = (user: SessionUser | null): string | null => {
  if (!user) return null;
  try {
    return localStorage.getItem(OUTLET_KEY_PREFIX + user.id) ?? user.storeId;
  } catch { return user.storeId; }
};

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { users, findByUsername } = useUsers();

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(
    () => storage.load<SessionUser | null>(SESSION_KEY, null),
  );

  // -- Active outlet ---------------------------------------------------- * * Persisted per-user under 'active-outlet:<userId>' so switching users * doesn't leak outlet state. Defaults to the user's storeId (which is * always guaranteed to have a matching outlet row via seed).
  const [currentOutletId, setCurrentOutletIdState] =
    useState<string | null>(() => readOutletFor(currentUser));

  const setCurrentOutletId = useCallback((outletId: string) => {
    if (!currentUser) return;
    try { localStorage.setItem(OUTLET_KEY_PREFIX + currentUser.id, outletId); }
    catch { /* quota */ }
    setCurrentOutletIdState(outletId);
  }, [currentUser]);

  // Re-hydrate active outlet whenever the current user changes (login/logout).
  useEffect(() => {
    setCurrentOutletIdState(readOutletFor(currentUser));
  }, [currentUser]);

  // Reconcile the persisted session against the live users list, guarded to run once after first non-empty load.
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

  }, [users, findByUsername, currentUser]);  // reconciledRef prevents re-runs; all deps listed for correctness

  useEffect(() => {
    if (currentUser) storage.save(SESSION_KEY, currentUser);
    else storage.remove(SESSION_KEY);
  }, [currentUser]);

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    const user = findByUsername(username.trim());
    if (!user) return { ok: false, reason: 'invalid' };
    if (!user.active) return { ok: false, reason: 'inactive' };

    const hash = await sha256(password);
    // Accept both the hashed form and legacy plaintext (auto-upgrades on login).
    const matches = user.password === hash || user.password === password;
    if (!matches) return { ok: false, reason: 'invalid' };
    // Upgrade legacy plaintext password to hash on first successful login.
    if (user.password === password) {
      await db.users.update(user.id, { password: hash } as Record<string, unknown>);
    }
    // Tenant-suspended? Block non-vendor logins for that store.
    if (user.storeId !== VENDOR_SCOPE) {
      const store = await db.stores.get(user.storeId);
      if (store && store.status === 'suspended') {
        return { ok: false, reason: 'suspended' };
      }
    }
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
    currentOutletId,
    setCurrentOutletId,
    isAdmin: isAdmin(currentUser),
    isVendor: isVendor(currentUser),
    login,
    loginAs,
    logout,
    can: (action) => can(currentUser, action),
  }), [currentUser, currentOutletId, setCurrentOutletId, login, loginAs, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};

// Helper - the tenant id this session is bound to.
export const useCurrentStoreId = (): string | null => useAuth().currentStoreId;

// Helper - the physical outlet the cashier is operating at right now.
// Falls back to the tenant id if no outlet has been explicitly chosen yet.
export const useCurrentOutletId = (): string | null => useAuth().currentOutletId;
