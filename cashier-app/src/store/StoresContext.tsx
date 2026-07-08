/**
 * StoresContext — CRUD for stores. Only super_admin should call mutations
 * (the UI gates via `can(user, 'store:create')` etc.).
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type FC, type ReactNode,
} from 'react';
import { SEED_STORES } from '../domain/seed';
import { storage } from '../lib/storage';
import type { Store } from '../domain/types';

const STORAGE_KEY = 'stores';

export interface StoreInput {
  readonly name: string;
  readonly city: string;
  readonly phone: string;
  readonly address: string;
  readonly taxRate: number;
  readonly currency: string;
}

type CreateResult =
  | { readonly ok: true; readonly store: Store }
  | { readonly ok: false; readonly error: 'duplicateName' | 'invalid' };

interface StoresContextValue {
  readonly stores: readonly Store[];
  readonly activeStores: readonly Store[];
  readonly byId: (id: string | null | undefined) => Store | undefined;
  readonly create: (input: StoreInput) => CreateResult;
  readonly update: (id: string, patch: Partial<StoreInput>) => CreateResult;
  readonly setActive: (id: string, active: boolean) => void;
  readonly remove: (id: string) => { ok: true } | { ok: false; error: 'notFound' };
}

const StoresContext = createContext<StoresContextValue | null>(null);

export const StoresProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [stores, setStores] = useState<readonly Store[]>(
    () => storage.load<readonly Store[]>(STORAGE_KEY, SEED_STORES),
  );

  useEffect(() => { storage.save(STORAGE_KEY, stores); }, [stores]);

  const byId = useCallback(
    (id: string | null | undefined) => (id ? stores.find((s) => s.id === id) : undefined),
    [stores],
  );

  const create: StoresContextValue['create'] = useCallback((input) => {
    const name = input.name.trim();
    if (!name || input.taxRate < 0) return { ok: false, error: 'invalid' };
    if (stores.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: 'duplicateName' };
    }
    const store: Store = {
      id: crypto.randomUUID(),
      name,
      city:     input.city.trim(),
      phone:    input.phone.trim(),
      address:  input.address.trim(),
      taxRate:  input.taxRate,
      currency: input.currency.trim() || 'USD',
      active:   true,
      createdAt: new Date().toISOString(),
    };
    setStores((prev) => [...prev, store]);
    return { ok: true, store };
  }, [stores]);

  const update: StoresContextValue['update'] = useCallback((id, patch) => {
    const target = stores.find((s) => s.id === id);
    if (!target) return { ok: false, error: 'invalid' };
    if (patch.name && patch.name.trim().toLowerCase() !== target.name.toLowerCase()) {
      const dup = stores.some(
        (s) => s.id !== id && s.name.toLowerCase() === patch.name!.trim().toLowerCase(),
      );
      if (dup) return { ok: false, error: 'duplicateName' };
    }
    const next: Store = {
      ...target,
      name:     patch.name?.trim()    ?? target.name,
      city:     patch.city?.trim()    ?? target.city,
      phone:    patch.phone?.trim()   ?? target.phone,
      address:  patch.address?.trim() ?? target.address,
      taxRate:  patch.taxRate ?? target.taxRate,
      currency: patch.currency?.trim() ?? target.currency,
    };
    setStores((prev) => prev.map((s) => s.id === id ? next : s));
    return { ok: true, store: next };
  }, [stores]);

  const setActive = useCallback((id: string, active: boolean) => {
    setStores((prev) => prev.map((s) => s.id === id ? { ...s, active } : s));
  }, []);

  const remove: StoresContextValue['remove'] = useCallback((id) => {
    if (!stores.some((s) => s.id === id)) return { ok: false, error: 'notFound' };
    setStores((prev) => prev.filter((s) => s.id !== id));
    return { ok: true };
  }, [stores]);

  const value = useMemo<StoresContextValue>(() => ({
    stores,
    activeStores: stores.filter((s) => s.active),
    byId, create, update, setActive, remove,
  }), [stores, byId, create, update, setActive, remove]);

  return <StoresContext.Provider value={value}>{children}</StoresContext.Provider>;
};

export const useStores = (): StoresContextValue => {
  const ctx = useContext(StoresContext);
  if (!ctx) throw new Error('useStores must be used within <StoresProvider>');
  return ctx;
};
