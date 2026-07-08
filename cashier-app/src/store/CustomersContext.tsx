/**
 * CustomersContext — store-scoped customer CRUD + lending payments.
 *
 * All reads are filtered by currentStoreId.
 * `create`, `ensureFromMobile`, `remove` operate on the current store.
 * Payments are scoped by lookup through the customer's storeId.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type FC, type ReactNode,
} from 'react';
import { SEED_CUSTOMERS, SEED_STORE_MAIN_ID } from '../domain/seed';
import { storage } from '../lib/storage';
import type { Customer, CustomerPayment } from '../domain/types';
import { useCurrentStoreId } from './AuthContext';

const CUSTOMERS_KEY = 'customers';
const PAYMENTS_KEY  = 'customer-payments';

type CreateResult =
  | { readonly ok: true; readonly customer: Customer }
  | { readonly ok: false; readonly error: 'duplicateMobile' | 'noStore' };

interface CustomerInput {
  readonly name: string;
  readonly mobile: string;
  readonly email?: string | null;
  readonly notes?: string | null;
  readonly storeId?: string;   // optional override (super_admin)
}

interface CustomersContextValue {
  readonly customers: readonly Customer[];       // scoped
  readonly allCustomers: readonly Customer[];    // unscoped
  readonly payments: readonly CustomerPayment[];
  readonly byId: (id: string) => Customer | undefined;
  readonly byMobile: (mobile: string) => Customer | undefined;
  readonly paymentsFor: (customerId: string) => readonly CustomerPayment[];
  readonly create: (input: CustomerInput) => CreateResult;
  readonly update: (id: string, patch: Partial<CustomerInput>) => CreateResult;
  readonly remove: (id: string) =>
    | { ok: true }
    | { ok: false; error: 'notFound' | 'hasBalance' };
  readonly addLending: (customerId: string, amount: number) => void;
  readonly recordPayment: (input: {
    customerId: string;
    amount: number;
    method: 'cash' | 'card';
    receivedBy: string;
    notes?: string | null;
  }) => { ok: true } | { ok: false; error: 'tooHigh' | 'invalid' | 'notFound' };
  /** Ensure a customer exists for a lending sale (in the current store); return the record. */
  readonly ensureFromMobile: (mobile: string, defaultName?: string) => Customer | null;
}

const CustomersContext = createContext<CustomersContextValue | null>(null);

const migrate = (list: readonly Customer[]): readonly Customer[] =>
  list.map((c) => c.storeId ? c : { ...c, storeId: SEED_STORE_MAIN_ID });

export const CustomersProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const currentStoreId = useCurrentStoreId();

  const [customers, setCustomers] = useState<readonly Customer[]>(
    () => migrate(storage.load<readonly Customer[]>(CUSTOMERS_KEY, SEED_CUSTOMERS)),
  );
  const [payments, setPayments] = useState<readonly CustomerPayment[]>(
    () => storage.load<readonly CustomerPayment[]>(PAYMENTS_KEY, []),
  );

  useEffect(() => { storage.save(CUSTOMERS_KEY, customers); }, [customers]);
  useEffect(() => { storage.save(PAYMENTS_KEY,  payments);  }, [payments]);

  const scoped = useMemo(
    () => currentStoreId ? customers.filter((c) => c.storeId === currentStoreId) : [],
    [customers, currentStoreId],
  );

  const byId      = useCallback((id: string)     => customers.find((c) => c.id === id),         [customers]);
  const byMobile  = useCallback(
    (mobile: string) => scoped.find((c) => c.mobile === mobile),
    [scoped],
  );
  const paymentsFor = useCallback(
    (customerId: string) => payments.filter((p) => p.customerId === customerId),
    [payments],
  );

  const create = useCallback((input: CustomerInput): CreateResult => {
    const storeId = input.storeId ?? currentStoreId;
    if (!storeId) return { ok: false, error: 'noStore' };
    const mobile = input.mobile.trim();
    if (customers.some((c) => c.storeId === storeId && c.mobile === mobile)) {
      return { ok: false, error: 'duplicateMobile' };
    }
    const customer: Customer = {
      id: crypto.randomUUID(),
      name:  input.name.trim(),
      mobile,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
      lendingBalance: 0,
      createdAt: new Date().toISOString(),
      storeId,
    };
    setCustomers((prev) => [customer, ...prev]);
    return { ok: true, customer };
  }, [customers, currentStoreId]);

  const update = useCallback((id: string, patch: Partial<CustomerInput>): CreateResult => {
    const target = customers.find((c) => c.id === id);
    if (!target) return { ok: false, error: 'duplicateMobile' };
    if (patch.mobile && patch.mobile.trim() !== target.mobile) {
      if (customers.some(
        (c) => c.id !== id && c.storeId === target.storeId && c.mobile === patch.mobile!.trim(),
      )) {
        return { ok: false, error: 'duplicateMobile' };
      }
    }
    const next: Customer = {
      ...target,
      name:   patch.name?.trim() ?? target.name,
      mobile: patch.mobile?.trim() ?? target.mobile,
      email:  patch.email === undefined ? target.email : (patch.email?.trim() || null),
      notes:  patch.notes === undefined ? target.notes : (patch.notes?.trim() || null),
    };
    setCustomers((prev) => prev.map((c) => c.id === id ? next : c));
    return { ok: true, customer: next };
  }, [customers]);

  const remove: CustomersContextValue['remove'] = useCallback((id) => {
    const target = customers.find((c) => c.id === id);
    if (!target) return { ok: false, error: 'notFound' };
    if (target.lendingBalance > 0.001) return { ok: false, error: 'hasBalance' };
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setPayments((prev)  => prev.filter((p) => p.customerId !== id));
    return { ok: true };
  }, [customers]);

  const addLending = useCallback((customerId: string, amount: number) => {
    setCustomers((prev) => prev.map((c) =>
      c.id === customerId ? { ...c, lendingBalance: c.lendingBalance + amount } : c,
    ));
  }, []);

  const recordPayment: CustomersContextValue['recordPayment'] = useCallback((input) => {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, error: 'invalid' };
    }
    const customer = customers.find((c) => c.id === input.customerId);
    if (!customer) return { ok: false, error: 'notFound' };
    if (input.amount > customer.lendingBalance + 0.001) {
      return { ok: false, error: 'tooHigh' };
    }
    const payment: CustomerPayment = {
      id: crypto.randomUUID(),
      customerId: input.customerId,
      amount: Math.round(input.amount * 100) / 100,
      method: input.method,
      receivedAt: new Date().toISOString(),
      receivedBy: input.receivedBy,
      notes: input.notes?.trim() || null,
    };
    setPayments((prev) => [payment, ...prev]);
    setCustomers((prev) => prev.map((c) =>
      c.id === input.customerId
        ? { ...c, lendingBalance: Math.max(c.lendingBalance - payment.amount, 0) }
        : c,
    ));
    return { ok: true };
  }, [customers]);

  const ensureFromMobile = useCallback(
    (mobile: string, defaultName?: string): Customer | null => {
      if (!currentStoreId) return null;
      const existing = customers.find(
        (c) => c.storeId === currentStoreId && c.mobile === mobile,
      );
      if (existing) return existing;
      const customer: Customer = {
        id: crypto.randomUUID(),
        name: defaultName?.trim() || `Customer · ${mobile}`,
        mobile,
        email: null,
        notes: 'Auto-created from lending sale.',
        lendingBalance: 0,
        createdAt: new Date().toISOString(),
        storeId: currentStoreId,
      };
      setCustomers((prev) => [customer, ...prev]);
      return customer;
    },
    [customers, currentStoreId],
  );

  const value = useMemo<CustomersContextValue>(() => ({
    customers: scoped,
    allCustomers: customers,
    payments,
    byId, byMobile, paymentsFor,
    create, update, remove, addLending, recordPayment, ensureFromMobile,
  }), [scoped, customers, payments, byId, byMobile, paymentsFor,
       create, update, remove, addLending, recordPayment, ensureFromMobile]);

  return <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>;
};

export const useCustomers = (): CustomersContextValue => {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error('useCustomers must be used within <CustomersProvider>');
  return ctx;
};
