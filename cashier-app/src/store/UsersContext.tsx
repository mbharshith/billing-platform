/**
 * UsersContext — Dexie-backed staff CRUD.
 *
 * Passwords still live plain-text in the browser because this is a
 * mock/frontend-only build. A real backend MUST hash them (§6).
 *
 * Uniqueness on `username` is global (case-insensitive) — enforced
 * app-side so we can return a typed 'duplicate' error.
 */
import {
  createContext, useCallback, useContext, useMemo,
  type FC, type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { SessionUser, User, UserRole } from '../domain/types';

interface UsersContextValue {
  readonly users: readonly User[];
  readonly findByUsername: (username: string) => User | undefined;
  readonly create: (input: {
    name: string; username: string; password: string; role: UserRole;
    storeId: string;
  }) => Promise<{ ok: true; user: User } | { ok: false; error: 'duplicate' | 'weakPassword' }>;
  readonly update: (
    id: string,
    patch: Partial<Pick<User, 'name' | 'password' | 'role'>>,
  ) => Promise<void>;
  readonly setActive: (id: string, active: boolean) => Promise<void>;
}

const UsersContext = createContext<UsersContextValue | null>(null);
const EMPTY: readonly User[] = [];

export const UsersProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const users = useLiveQuery(() => db.users.toArray(), [], EMPTY) ?? EMPTY;

  const findByUsername = useCallback(
    (username: string) => users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase(),
    ),
    [users],
  );

  const create: UsersContextValue['create'] = useCallback(async (input) => {
    if (input.password.length < 8) return { ok: false, error: 'weakPassword' };
    // Case-insensitive uniqueness — index lookup + filter for case variants.
    const uname = input.username.trim();
    const dup = await db.users
      .filter((u) => u.username.toLowerCase() === uname.toLowerCase())
      .first();
    if (dup) return { ok: false, error: 'duplicate' };

    const user: User = {
      id: crypto.randomUUID(),
      username: uname,
      name: input.name.trim(),
      role: input.role,
      active: true,
      createdAt: new Date().toISOString(),
      storeId: input.storeId,
      password: input.password,
    };
    await db.users.add(user);
    return { ok: true, user };
  }, []);

  const update: UsersContextValue['update'] = useCallback(async (id, patch) => {
    await db.users.update(id, patch);
  }, []);

  const setActive = useCallback(async (id: string, active: boolean) => {
    await db.users.update(id, { active });
  }, []);

  const value = useMemo<UsersContextValue>(
    () => ({ users, findByUsername, create, update, setActive }),
    [users, findByUsername, create, update, setActive],
  );
  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
};

export const useUsers = (): UsersContextValue => {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsers must be used within <UsersProvider>');
  return ctx;
};

/** Convert a full User to a SessionUser (strips password). */
export const toSessionUser = (u: User): SessionUser => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = u;
  return rest;
};
