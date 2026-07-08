/**
 * SalesContext — recorded sales, store-scoped.
 * Void = keep the record for audit (§14 audit trail intent).
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer,
  type FC, type ReactNode,
} from 'react';
import { SEED_STORE_MAIN_ID } from '../domain/seed';
import { buildDemoSales } from '../domain/demoSales';
import { storage } from '../lib/storage';
import type { Sale } from '../domain/types';
import { useCurrentStoreId } from './AuthContext';
import { useCustomers } from './CustomersContext';
import { useProducts } from './ProductsContext';
import { useStores } from './StoresContext';

const STORAGE_KEY = 'sales';

interface SalesState { readonly sales: readonly Sale[] }

type SalesAction =
  | { type: 'sale/recorded'; sale: Sale }
  | { type: 'sale/voided'; id: string; at: string; reason: string }
  | { type: 'sales/cleared' }
  | { type: 'sales/hydrated'; sales: readonly Sale[] };

const reducer = (state: SalesState, action: SalesAction): SalesState => {
  switch (action.type) {
    case 'sale/recorded':
      return { sales: [action.sale, ...state.sales] };
    case 'sale/voided':
      return {
        sales: state.sales.map((s) => s.id === action.id
          ? { ...s, voided: true, voidedAt: action.at, voidedReason: action.reason }
          : s),
      };
    case 'sales/cleared':
      return { sales: [] };
    case 'sales/hydrated':
      return { sales: action.sales };
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
};

interface SalesContextValue {
  readonly sales: readonly Sale[];        // scoped to current store
  readonly allSales: readonly Sale[];     // unscoped (super_admin analytics)
  readonly byId: (id: string) => Sale | undefined;
  readonly forCustomer: (customerId: string) => readonly Sale[];
  readonly recordSale: (sale: Sale) => void;
  readonly voidSale: (id: string, reason: string) => void;
  readonly clearSales: () => void;
}

const SalesContext = createContext<SalesContextValue | null>(null);

const migrate = (list: readonly Sale[]): readonly Sale[] =>
  list.map((s) => s.storeId ? s : { ...s, storeId: SEED_STORE_MAIN_ID });

export const SalesProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const currentStoreId = useCurrentStoreId();
  const { allProducts } = useProducts();
  const { allCustomers } = useCustomers();
  const { stores } = useStores();

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => ({ sales: migrate(storage.load<readonly Sale[]>(STORAGE_KEY, [])) }),
  );

  // Demo seeder — runs once when sales list is empty AND we have products +
  // customers loaded. Idempotent by storage: after first save, list is
  // non-empty and won't reseed. Adds ~60 sales across both stores.
  useEffect(() => {
    if (state.sales.length > 0) return;
    if (allProducts.length === 0) return;
    const customerIdsByStore: Record<string, { id: string; mobile: string }[]> = {};
    allCustomers.forEach((c) => {
      const list = customerIdsByStore[c.storeId] ?? (customerIdsByStore[c.storeId] = []);
      list.push({ id: c.id, mobile: c.mobile });
    });
    const taxRateByStore: Record<string, number> = {};
    stores.forEach((s) => { taxRateByStore[s.id] = s.taxRate; });
    const demo = buildDemoSales({
      products: allProducts,
      customerIdsByStore,
      taxRateByStore,
    });
    if (demo.length > 0) {
      dispatch({ type: 'sales/hydrated', sales: demo });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts.length, allCustomers.length, stores.length]);

  useEffect(() => { storage.save(STORAGE_KEY, state.sales); }, [state.sales]);

  const recordSale = useCallback((sale: Sale) => {
    dispatch({ type: 'sale/recorded', sale });
  }, []);
  const voidSale = useCallback((id: string, reason: string) => {
    dispatch({ type: 'sale/voided', id, at: new Date().toISOString(), reason });
  }, []);
  const clearSales = useCallback(() => dispatch({ type: 'sales/cleared' }), []);

  const scoped = useMemo(
    () => currentStoreId ? state.sales.filter((s) => s.storeId === currentStoreId) : [],
    [state.sales, currentStoreId],
  );

  const byId = useCallback((id: string) => state.sales.find((s) => s.id === id), [state.sales]);
  const forCustomer = useCallback(
    (customerId: string) => scoped.filter((s) => s.customerId === customerId),
    [scoped],
  );

  const value = useMemo<SalesContextValue>(() => ({
    sales: scoped,
    allSales: state.sales,
    byId, forCustomer, recordSale, voidSale, clearSales,
  }), [scoped, state.sales, byId, forCustomer, recordSale, voidSale, clearSales]);

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};

export const useSales = (): SalesContextValue => {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used within <SalesProvider>');
  return ctx;
};
