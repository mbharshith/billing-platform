/**
 * SalesContext — recorded sales, persisted to localStorage.
 * Void = keep the record for audit but mark voided (§14 audit trail intent).
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer,
  type FC, type ReactNode,
} from 'react';
import { storage } from '../lib/storage';
import type { Sale } from '../domain/types';

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
  readonly sales: readonly Sale[];
  readonly byId: (id: string) => Sale | undefined;
  readonly forCustomer: (customerId: string) => readonly Sale[];
  readonly recordSale: (sale: Sale) => void;
  readonly voidSale: (id: string, reason: string) => void;
  readonly clearSales: () => void;
}

const SalesContext = createContext<SalesContextValue | null>(null);

export const SalesProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => ({ sales: storage.load<readonly Sale[]>(STORAGE_KEY, []) }),
  );

  useEffect(() => { storage.save(STORAGE_KEY, state.sales); }, [state.sales]);

  const recordSale = useCallback((sale: Sale) => {
    dispatch({ type: 'sale/recorded', sale });
  }, []);
  const voidSale = useCallback((id: string, reason: string) => {
    dispatch({ type: 'sale/voided', id, at: new Date().toISOString(), reason });
  }, []);
  const clearSales = useCallback(() => dispatch({ type: 'sales/cleared' }), []);

  const byId = useCallback((id: string) => state.sales.find((s) => s.id === id), [state.sales]);
  const forCustomer = useCallback(
    (customerId: string) => state.sales.filter((s) => s.customerId === customerId),
    [state.sales],
  );

  const value = useMemo<SalesContextValue>(() => ({
    sales: state.sales, byId, forCustomer, recordSale, voidSale, clearSales,
  }), [state.sales, byId, forCustomer, recordSale, voidSale, clearSales]);

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};

export const useSales = (): SalesContextValue => {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used within <SalesProvider>');
  return ctx;
};
