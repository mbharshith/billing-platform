/**
 * UsersContext — staff records (CRUD).
 * Passwords live plain-text in localStorage because this is a mock/frontend build.
 * A real backend MUST hash + never send them to the client (§6).
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type FC, type ReactNode,
} from 'react';
import { SEED_USERS } from '../domain/seed';
import { storage } from '../lib/storage';
import type { SessionUser, User, UserRole } from '../domain/types';

const STORAGE_KEY = 'users';

interface UsersContextValue {
  readonly users: readonly User[];
  readonly findByUsername: (username: string) => User | undefined;
  readonly create: (input: {
    name: string; username: string; password: string; role: UserRole;
  }) => { ok: true; user: User } | { ok: false; error: string };
  readonly update: (id: string, patch: Partial<Pick<User, 'name' | 'password' | 'role'>>) => void;
  readonly setActive: (id: string, active: boolean) => void;
}

const UsersContext = createContext<UsersContextValue | null>(null);

export const UsersProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<readonly User[]>(
    () => storage.load<readonly User[]>(STORAGE_KEY, SEED_USERS),
  );

  useEffect(() => { storage.save(STORAGE_KEY, users); }, [users]);

  const findByUsername = useCallback(
    (username: string) => users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase(),
    ),
    [users],
  );

  const create: UsersContextValue['create'] = useCallback((input) => {
    const duplicate = users.some(
      (u) => u.username.toLowerCase() === input.username.toLowerCase(),
    );
    if (duplicate) return { ok: false, error: 'duplicate' };
    if (input.password.length < 8) return { ok: false, error: 'weakPassword' };
    const user: User = {
      id: crypto.randomUUID(),
      username: input.username.trim(),
      name: input.name.trim(),
      role: input.role,
      active: true,
      createdAt: new Date().toISOString(),
      password: input.password,
    };
    setUsers((prev) => [...prev, user]);
    return { ok: true, user };
  }, [users]);

  const update: UsersContextValue['update'] = useCallback((id, patch) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u));
  }, []);

  const setActive = useCallback((id: string, active: boolean) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, active } : u));
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
