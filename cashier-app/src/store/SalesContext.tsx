/**
 * SalesContext — Dexie-backed sales ledger, store-scoped.
 *
 * All reads use `useLiveQuery` so the dashboard/history pages update in
 * real time whenever a sale is recorded or voided (including from another
 * tab). Store-scoping is done at the index level:
 *   db.sales.where('storeId').equals(currentStoreId)
 * — which is an O(log n) B-tree lookup, not an O(n) array filter.
 *
 * The demo-seed effect runs exactly once when the sales table is empty
 * and the required parents (products + customers + stores) have loaded.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo,
  type FC, type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { buildDemoSales } from '../domain/demoSales';
import { db } from '../lib/db';
import type { Sale } from '../domain/types';
import { useCurrentStoreId } from './AuthContext';
import { useCustomers } from './CustomersContext';
import { useProducts } from './ProductsContext';
import { useStores } from './StoresContext';

interface SalesContextValue {
  /** Sales for the current tenant, newest first. */
  readonly sales: readonly Sale[];
  /** Every sale, unscoped (rarely used — kept for parity with old API). */
  readonly allSales: readonly Sale[];
  readonly byId: (id: string) => Sale | undefined;
  readonly forCustomer: (customerId: string) => readonly Sale[];
  readonly recordSale: (sale: Sale) => Promise<void>;
  readonly voidSale: (id: string, reason: string) => Promise<void>;
  readonly clearSales: () => Promise<void>;
}

const SalesContext = createContext<SalesContextValue | null>(null);

const EMPTY: readonly Sale[] = [];

export const SalesProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const currentStoreId = useCurrentStoreId();
  const { allProducts } = useProducts();
  const { allCustomers } = useCustomers();
  const { stores } = useStores();

  /* -- scoped read (dashboard / sales page / etc.) ---------------------- */
  const scoped = useLiveQuery(
    async () => {
      if (!currentStoreId) return EMPTY;
      // Fetch the tenant's rows via the `storeId` index, then order by
      // completedAt descending in memory (per-tenant list, not global).
      const rows = await db.sales
        .where('storeId').equals(currentStoreId).toArray();
      return rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    },
    [currentStoreId],
    EMPTY,
  ) ?? EMPTY;

  /* -- unscoped (rare, for legacy consumers) ---------------------------- */
  const all = useLiveQuery(
    () => db.sales.orderBy('completedAt').reverse().toArray(),
    [],
    EMPTY,
  ) ?? EMPTY;

  /* -- one-shot demo seeder --------------------------------------------- */
  // Fires once when: no sales exist AND products/customers/stores are ready.
  // `db.sales.count()` gate makes it idempotent across reloads.
  useEffect(() => {
    if (allProducts.length === 0 || stores.length === 0) return;
    let cancelled = false;
    (async () => {
      const existing = await db.sales.count();
      if (existing > 0 || cancelled) return;

      const customerIdsByStore: Record<string, { id: string; mobile: string }[]> = {};
      allCustomers.forEach((c) => {
        (customerIdsByStore[c.storeId] ??= []).push({ id: c.id, mobile: c.mobile });
      });
      const taxRateByStore: Record<string, number> = {};
      stores.forEach((s) => { taxRateByStore[s.id] = s.taxRate; });

      const demo = buildDemoSales({
        products: allProducts,
        customerIdsByStore,
        taxRateByStore,
      });
      if (demo.length > 0) await db.sales.bulkAdd(demo);
    })();
    return () => { cancelled = true; };
  }, [allProducts, allCustomers, stores]);

  /* -- writes ------------------------------------------------------------ */
  const recordSale = useCallback(async (sale: Sale) => {
    await db.sales.add(sale);
  }, []);

  const voidSale = useCallback(async (id: string, reason: string) => {
    await db.sales.update(id, {
      voided: true,
      voidedAt: new Date().toISOString(),
      voidedReason: reason,
    });
  }, []);

  const clearSales = useCallback(async () => {
    await db.sales.clear();
  }, []);

  /* -- selectors (in-memory over the already-scoped list) --------------- */
  const byId = useCallback(
    (id: string) => scoped.find((s) => s.id === id) ?? all.find((s) => s.id === id),
    [scoped, all],
  );
  const forCustomer = useCallback(
    (customerId: string) => scoped.filter((s) => s.customerId === customerId),
    [scoped],
  );

  const value = useMemo<SalesContextValue>(() => ({
    sales: scoped,
    allSales: all,
    byId, forCustomer, recordSale, voidSale, clearSales,
  }), [scoped, all, byId, forCustomer, recordSale, voidSale, clearSales]);

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};

export const useSales = (): SalesContextValue => {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used within <SalesProvider>');
  return ctx;
};
