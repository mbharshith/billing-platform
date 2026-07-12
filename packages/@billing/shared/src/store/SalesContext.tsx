// SalesContext - Dexie-backed sales ledger, store-scoped. Covers both counter and online orders.
import {
  createContext, useCallback, useContext, useEffect, useMemo,
  type FC, type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { buildDemoSales, buildDemoOrders } from '@billing/shared/fixtures';
import { db } from '@billing/shared/lib/db';
import type { Sale, OrderStatus, OrderStatusEvent } from '@billing/shared/domain/types';
import { useCurrentStoreId } from './AuthContext';
import { useCustomers } from './CustomersContext';
import { useProducts } from './ProductsContext';
import { useStores } from './StoresContext';

interface SalesContextValue {
  // Sales for the current tenant, newest first.
  readonly sales: readonly Sale[];
  // All sales across every store, newest-first, unscoped by tenant. Vendor views only - regular pages use `sales`.
  readonly allSales: readonly Sale[];
  readonly byId: (id: string) => Sale | undefined;
  readonly forCustomer: (customerId: string) => readonly Sale[];
  readonly recordSale: (sale: Sale) => Promise<void>;
  readonly voidSale: (id: string, reason: string) => Promise<void>;
  readonly clearSales: () => Promise<void>;
  // Online-order lifecycle helpers.
  readonly placeOnlineOrder: (sale: Sale) => Promise<void>;
  readonly advanceOrderStatus: (id: string, next: OrderStatus, by: string, note?: string) => Promise<void>;
}

const SalesContext = createContext<SalesContextValue | null>(null);

const EMPTY: readonly Sale[] = [];

export const SalesProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const currentStoreId = useCurrentStoreId();
  const { allProducts } = useProducts();
  const { allCustomers } = useCustomers();
  const { stores } = useStores();

  // -- scoped read (dashboard / sales page / etc.) ------------------------
  const scoped = useLiveQuery(
    async () => {
      if (!currentStoreId) return EMPTY;
      const rows = await db.sales.where('storeId').equals(currentStoreId).toArray();
      return rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    },
    [currentStoreId],
    EMPTY,
  ) ?? EMPTY;

  // -- unscoped: vendor dashboard + cross-store reporting only ------------
  const all = useLiveQuery(
    () => db.sales.orderBy('completedAt').reverse().toArray(),
    [],
    EMPTY,
  ) ?? EMPTY;

  // -- one-shot demo seeder -----------------------------------------------
  // Counter sales seed once when the sales table is empty.
  // Online orders seed separately: if no online orders exist for any tenant,
  // backfill them. That way an existing DB (pre-v4) gets orders without wiping counter history.
  useEffect(() => {
    if (allProducts.length === 0 || stores.length === 0) return;
    let cancelled = false;
    (async () => {
      const totalSales = await db.sales.count();
      const onlineCount = await db.sales.where('channel').equals('online').count();

      const customerIdsByStore: Record<string, { id: string; mobile: string }[]> = {};
      const customerIdByMobile = new Map<string, string>();
      allCustomers.forEach((c) => {
        (customerIdsByStore[c.storeId] ??= []).push({ id: c.id, mobile: c.mobile });
        customerIdByMobile.set(`${c.storeId}::${c.mobile}`, c.id);
      });
      const taxRateByStore: Record<string, number> = {};
      stores.forEach((s) => { taxRateByStore[s.id] = s.taxRate; });

      if (totalSales === 0 && !cancelled) {
        const demo = buildDemoSales({ products: allProducts, customerIdsByStore, taxRateByStore });
        if (demo.length > 0) await db.sales.bulkAdd(demo);
      }
      if (onlineCount === 0 && !cancelled) {
        const orders = buildDemoOrders({ products: allProducts, taxRateByStore, customerIdByMobile });
        if (orders.length > 0) await db.sales.bulkAdd(orders);
      }
    })();
    return () => { cancelled = true; };
  }, [allProducts, allCustomers, stores]);

  // -- writes -------------------------------------------------------------
  const recordSale = useCallback(async (sale: Sale) => {
    await db.sales.add(sale);
  }, []);

  const placeOnlineOrder = useCallback(async (sale: Sale) => {
    // Same as recordSale from a persistence standpoint - separate name signals intent.
    await db.sales.add(sale);
  }, []);

  const advanceOrderStatus = useCallback(async (
    id: string, next: OrderStatus, by: string, note: string = '',
  ) => {
    const existing = await db.sales.get(id);
    if (!existing) return;
    const event: OrderStatusEvent = { status: next, at: new Date().toISOString(), by, note };
    const history: readonly OrderStatusEvent[] = [...(existing.statusHistory ?? []), event];
    await db.sales.update(id, { orderStatus: next, statusHistory: history });
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

  // -- selectors (in-memory over the already-scoped list) -----------------
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
    placeOnlineOrder, advanceOrderStatus,
  }), [scoped, all, byId, forCustomer, recordSale, voidSale, clearSales, placeOnlineOrder, advanceOrderStatus]);

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};

export const useSales = (): SalesContextValue => {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used within <SalesProvider>');
  return ctx;
};
