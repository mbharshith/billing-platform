// SalesContext - Dexie-backed sales ledger, store-scoped. Covers both counter and online orders.
import {
  createContext, useCallback, useContext, useEffect, useMemo,
  type FC, type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { buildDemoSales, buildDemoOrders } from '@billing/shared/fixtures';
import { db } from '@billing/shared/lib/db';
import type { Sale, OrderStatus, OrderStatusEvent } from '@billing/shared/domain/types';
import { useCurrentOutletId, useCurrentStoreId } from './AuthContext';
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
  // Held-order helpers.
  readonly heldSales: readonly Sale[];
  readonly holdSale: (sale: Sale) => Promise<void>;
  readonly resumeHeldSale: (id: string) => Promise<Sale | null>;
  readonly discardHeldSale: (id: string) => Promise<void>;
  // Online-order lifecycle helpers.
  readonly placeOnlineOrder: (sale: Sale) => Promise<void>;
  readonly advanceOrderStatus: (id: string, next: OrderStatus, by: string, note?: string) => Promise<void>;
}

const SalesContext = createContext<SalesContextValue | null>(null);

const EMPTY: readonly Sale[] = [];

export const SalesProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const currentStoreId = useCurrentStoreId();
  const currentOutletId = useCurrentOutletId();
  const { allProducts } = useProducts();
  const { allCustomers } = useCustomers();
  const { stores } = useStores();

  // -- scoped read (dashboard / sales page / etc.) ------------------------
  // Filters to the CURRENT OUTLET when one is selected. Legacy sales without
  // an outletId fall back to matching the storeId (they surface under the
  // 'primary' outlet - see v8 migration). Vendor / cross-outlet reporting
  // uses `allSales` instead.
  const scoped = useLiveQuery(
    async () => {
      if (!currentStoreId) return EMPTY;
      const rows = currentOutletId
        ? await db.sales.where('[storeId+outletId]').equals([currentStoreId, currentOutletId]).toArray()
        : await db.sales.where('storeId').equals(currentStoreId).toArray();
      return rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    },
    [currentStoreId, currentOutletId],
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
      // Self-heal STALE seed data: earlier builds generated invoice numbers
      // with a hard-coded 'WM-' prefix (Walmart cruft) and collision-prone
      // Date.now()-only suffix. If the DB still has any of those, wipe the
      // seeded online orders so the fresh generator (INV-<ts><tick>) can
      // re-seed with realistic minutes-old timestamps.
      // Counter sales are safe because they used a separate monotonic
      // counter, not nextInvoiceNo().
      const staleOnline = await db.sales
        .where('channel').equals('online')
        .and((s) => s.invoiceNo.startsWith('WM-'))
        .toArray();
      if (staleOnline.length > 0 && !cancelled) {
        await db.sales.bulkDelete(staleOnline.map((s) => s.id));
      }

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

  const holdSale = useCallback(async (sale: Sale) => {
    // Held sales share the sales table; the heldAt discriminator flags them.
    // completedAt reflects when they were parked, not sold.
    await db.sales.add({ ...sale, heldAt: new Date().toISOString() });
  }, []);

  const resumeHeldSale = useCallback(async (id: string): Promise<Sale | null> => {
    const sale = await db.sales.get(id);
    if (!sale || !sale.heldAt) return null;
    await db.sales.delete(id);
    return sale;
  }, []);

  const discardHeldSale = useCallback(async (id: string) => {
    await db.sales.delete(id);
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
    sales: scoped.filter((s) => s.heldAt == null),      // exclude parked sales from dashboards
    allSales: all,
    byId, forCustomer, recordSale, voidSale, clearSales,
    heldSales: scoped.filter((s) => s.heldAt != null),
    holdSale, resumeHeldSale, discardHeldSale,
    placeOnlineOrder, advanceOrderStatus,
  }), [scoped, all, byId, forCustomer, recordSale, voidSale, clearSales, holdSale, resumeHeldSale, discardHeldSale, placeOnlineOrder, advanceOrderStatus]);

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};

export const useSales = (): SalesContextValue => {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used within <SalesProvider>');
  return ctx;
};
