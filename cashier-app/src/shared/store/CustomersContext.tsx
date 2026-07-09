// CustomersContext — Dexie-backed CRUD + lending payments.

// Uniqueness on `mobile` is per-tenant, enforced app-side so we can return
// a typed 'duplicateMobile' error.

// `recordPayment` runs inside a Dexie transaction so the payment row and
// the customer's lending-balance decrement land atomically.
import {
  createContext, useCallback, useContext, useMemo,
  type FC, type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@shared/lib/db';
import type { Customer, CustomerPayment } from '@shared/domain/types';
import { useCurrentStoreId } from './AuthContext';

type CreateResult =
  | { readonly ok: true; readonly customer: Customer }
  | { readonly ok: false; readonly error: 'duplicateMobile' | 'noStore' };

interface CustomerInput {
  readonly name: string;
  readonly mobile: string;
  readonly email?: string | null;
  readonly notes?: string | null;
  readonly storeId?: string;
}

interface CustomersContextValue {
  readonly customers: readonly Customer[];
  readonly allCustomers: readonly Customer[];
  readonly payments: readonly CustomerPayment[];
  readonly byId: (id: string) => Customer | undefined;
  readonly byMobile: (mobile: string) => Customer | undefined;
  readonly paymentsFor: (customerId: string) => readonly CustomerPayment[];
  readonly create: (input: CustomerInput) => Promise<CreateResult>;
  readonly update: (id: string, patch: Partial<CustomerInput>) => Promise<CreateResult>;
  readonly remove: (id: string) => Promise<
    { ok: true } | { ok: false; error: 'notFound' | 'hasBalance' }
  >;
  readonly addLending: (customerId: string, amount: number) => Promise<void>;
  readonly recordPayment: (input: {
    customerId: string;
    amount: number;
    method: 'cash' | 'card';
    receivedBy: string;
    notes?: string | null;
  }) => Promise<
    { ok: true } | { ok: false; error: 'tooHigh' | 'invalid' | 'notFound' }
  >;
  readonly ensureFromMobile: (mobile: string, storeIdOverride?: string, defaultName?: string) => Promise<Customer | null>;
}

const CustomersContext = createContext<CustomersContextValue | null>(null);
const EMPTY_C: readonly Customer[] = [];
const EMPTY_P: readonly CustomerPayment[] = [];

export const CustomersProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const currentStoreId = useCurrentStoreId();

  const scoped = useLiveQuery(
    async () => {
      if (!currentStoreId) return EMPTY_C;
      return db.customers.where('storeId').equals(currentStoreId).toArray();
    },
    [currentStoreId],
    EMPTY_C,
  ) ?? EMPTY_C;

  const all = useLiveQuery(() => db.customers.toArray(), [], EMPTY_C) ?? EMPTY_C;
  const payments = useLiveQuery(() => db.customerPayments.toArray(), [], EMPTY_P) ?? EMPTY_P;

  const byId     = useCallback((id: string) => all.find((c) => c.id === id), [all]);
  const byMobile = useCallback(
    (mobile: string) => scoped.find((c) => c.mobile === mobile),
    [scoped],
  );
  const paymentsFor = useCallback(
    (customerId: string) => payments.filter((p) => p.customerId === customerId),
    [payments],
  );

  const create: CustomersContextValue['create'] = useCallback(async (input) => {
    const storeId = input.storeId ?? currentStoreId;
    if (!storeId) return { ok: false, error: 'noStore' };
    const mobile = input.mobile.trim();

    const dup = await db.customers
      .where('[storeId+mobile]').equals([storeId, mobile]).first();
    if (dup) return { ok: false, error: 'duplicateMobile' };

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
    await db.customers.add(customer);
    return { ok: true, customer };
  }, [currentStoreId]);

  const update: CustomersContextValue['update'] = useCallback(async (id, patch) => {
    const target = await db.customers.get(id);
    if (!target) return { ok: false, error: 'duplicateMobile' };

    if (patch.mobile && patch.mobile.trim() !== target.mobile) {
      const dup = await db.customers
        .where('[storeId+mobile]')
        .equals([target.storeId, patch.mobile.trim()])
        .first();
      if (dup && dup.id !== id) return { ok: false, error: 'duplicateMobile' };
    }
    const next: Customer = {
      ...target,
      name:   patch.name?.trim() ?? target.name,
      mobile: patch.mobile?.trim() ?? target.mobile,
      email:  patch.email === undefined ? target.email : (patch.email?.trim() || null),
      notes:  patch.notes === undefined ? target.notes : (patch.notes?.trim() || null),
    };
    await db.customers.put(next);
    return { ok: true, customer: next };
  }, []);

  const remove: CustomersContextValue['remove'] = useCallback(async (id) => {
    const target = await db.customers.get(id);
    if (!target) return { ok: false, error: 'notFound' };
    if (target.lendingBalance > 0.001) return { ok: false, error: 'hasBalance' };

    await db.transaction('rw', [db.customers, db.customerPayments], async () => {
      await db.customers.delete(id);
      await db.customerPayments.where('customerId').equals(id).delete();
    });
    return { ok: true };
  }, []);

  const addLending = useCallback(async (customerId: string, amount: number) => {
    await db.transaction('rw', db.customers, async () => {
      const c = await db.customers.get(customerId);
      if (!c) return;
      await db.customers.update(customerId, { lendingBalance: c.lendingBalance + amount });
    });
  }, []);

  const recordPayment: CustomersContextValue['recordPayment'] = useCallback(async (input) => {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, error: 'invalid' };
    }
    const customer = await db.customers.get(input.customerId);
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
    await db.transaction('rw', [db.customers, db.customerPayments], async () => {
      await db.customerPayments.add(payment);
      await db.customers.update(input.customerId, {
        lendingBalance: Math.max(customer.lendingBalance - payment.amount, 0),
      });
    });
    return { ok: true };
  }, []);

  const ensureFromMobile = useCallback(
    async (mobile: string, storeIdOverride?: string, defaultName?: string): Promise<Customer | null> => {
      const storeId = storeIdOverride ?? currentStoreId;
      if (!storeId) return null;
      const existing = await db.customers
        .where('[storeId+mobile]').equals([storeId, mobile]).first();
      if (existing) {
        // If we have a defaultName and existing customer's name looks auto-generated, upgrade it.
        if (defaultName && existing.name.startsWith('Customer · ')) {
          await db.customers.update(existing.id, { name: defaultName.trim() });
          return { ...existing, name: defaultName.trim() };
        }
        return existing;
      }
      const customer: Customer = {
        id: crypto.randomUUID(),
        name: defaultName?.trim() || `Customer · ${mobile}`,
        mobile,
        email: null,
        notes: storeIdOverride ? 'Auto-created from online order.' : 'Auto-created from lending sale.',
        lendingBalance: 0,
        createdAt: new Date().toISOString(),
        storeId,
      };
      await db.customers.add(customer);
      return customer;
    },
    [currentStoreId],
  );

  const value = useMemo<CustomersContextValue>(() => ({
    customers: scoped,
    allCustomers: all,
    payments,
    byId, byMobile, paymentsFor,
    create, update, remove, addLending, recordPayment, ensureFromMobile,
  }), [scoped, all, payments, byId, byMobile, paymentsFor,
       create, update, remove, addLending, recordPayment, ensureFromMobile]);

  return <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>;
};

export const useCustomers = (): CustomersContextValue => {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error('useCustomers must be used within <CustomersProvider>');
  return ctx;
};
