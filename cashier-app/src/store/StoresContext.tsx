/**
 * StoresContext — Dexie-backed tenant catalog.
 *
 * All reads go through `useLiveQuery` so the UI reactively updates whenever
 * a store row changes — including changes made in another tab.
 * All writes go straight to `db.stores` (async, non-blocking).
 *
 * Uniqueness (case-insensitive name) is enforced at the app layer, not
 * as an IDB `& unique` index, so we can return a typed 'duplicateName'
 * error instead of a raw Dexie throw.
 */
import {
  createContext, useCallback, useContext, useMemo,
  type FC, type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Store } from '../domain/types';

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
  readonly create: (input: StoreInput) => Promise<CreateResult>;
  readonly update: (id: string, patch: Partial<StoreInput>) => Promise<CreateResult>;
  readonly setActive: (id: string, active: boolean) => Promise<void>;
  /** Vendor-only lifecycle: suspended stores block their users at login. */
  readonly setStatus: (id: string, status: 'active' | 'suspended') => Promise<void>;
  readonly remove: (id: string) => Promise<
    { ok: true } | { ok: false; error: 'notFound' }
  >;
}

const StoresContext = createContext<StoresContextValue | null>(null);

const EMPTY: readonly Store[] = [];

export const StoresProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Live query — re-runs whenever the stores table changes.
  const stores = useLiveQuery(() => db.stores.orderBy('name').toArray(), [], EMPTY);
  const rows = stores ?? EMPTY;

  const byId = useCallback(
    (id: string | null | undefined) => (id ? rows.find((s) => s.id === id) : undefined),
    [rows],
  );

  const create: StoresContextValue['create'] = useCallback(async (input) => {
    const name = input.name.trim();
    if (!name || input.taxRate < 0) return { ok: false, error: 'invalid' };

    const existing = await db.stores
      .filter((s) => s.name.toLowerCase() === name.toLowerCase())
      .first();
    if (existing) return { ok: false, error: 'duplicateName' };

    const store: Store = {
      id: crypto.randomUUID(),
      name,
      city:     input.city.trim(),
      phone:    input.phone.trim(),
      address:  input.address.trim(),
      taxRate:  input.taxRate,
      currency: input.currency.trim() || 'USD',
      active:   true,
      status:   'active',
      createdAt: new Date().toISOString(),
    };
    await db.stores.add(store);
    return { ok: true, store };
  }, []);

  const update: StoresContextValue['update'] = useCallback(async (id, patch) => {
    // VENDOR-ONLY: this is intentionally only invoked from the vendor console
    // (EditTenantModal). Tenant admins have a READ-ONLY StorePage. Store
    // metadata (name, currency, tax) ripples through every past invoice and
    // analytic — letting tenants self-edit would silently corrupt reports.
    // If we ever add a backend, this rule moves into an RLS policy that
    // requires the caller to have role='vendor'.
    const target = await db.stores.get(id);
    if (!target) return { ok: false, error: 'invalid' };

    if (patch.name && patch.name.trim().toLowerCase() !== target.name.toLowerCase()) {
      const dup = await db.stores
        .filter((s) => s.id !== id
          && s.name.toLowerCase() === patch.name!.trim().toLowerCase())
        .first();
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
    await db.stores.put(next);
    return { ok: true, store: next };
  }, []);

  const setActive = useCallback(async (id: string, active: boolean) => {
    await db.stores.update(id, { active });
  }, []);

  const setStatus = useCallback<StoresContextValue['setStatus']>(async (id, status) => {
    await db.stores.update(id, { status });
  }, []);

  const remove: StoresContextValue['remove'] = useCallback(async (id) => {
    const exists = await db.stores.get(id);
    if (!exists) return { ok: false, error: 'notFound' };
    await db.stores.delete(id);
    return { ok: true };
  }, []);

  const value = useMemo<StoresContextValue>(() => ({
    stores: rows,
    activeStores: rows.filter((s) => s.active),
    byId, create, update, setActive, setStatus, remove,
  }), [rows, byId, create, update, setActive, setStatus, remove]);

  return <StoresContext.Provider value={value}>{children}</StoresContext.Provider>;
};

export const useStores = (): StoresContextValue => {
  const ctx = useContext(StoresContext);
  if (!ctx) throw new Error('useStores must be used within <StoresProvider>');
  return ctx;
};
