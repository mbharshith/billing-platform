// FIXTURE — demo customers. Scrap when the real backend is live.
import type { Customer } from '@billing/shared/domain/types';
import {
  SEED_STORE_MAIN_ID, SEED_STORE_BRANCH_ID, SEED_STORE_THIRD_ID,
} from './stores';

const now = (): string => new Date().toISOString();

// v8: every seeded customer belongs to the store's PRIMARY outlet (whose id
// equals the storeId in our fixtures). Same shape as products.ts - lets
// fresh installs skip the migration path and still render correctly.

export const SEED_CUSTOMERS: readonly Customer[] = [
  // Velvet Mumbai customers
  { id: 'c-mm-01', name: 'Ravi Kumar',    mobile: '9876543210',
    email: 'ravi@example.com', notes: 'Ethnic wear enthusiast',
    lendingBalance: 1250.50, createdAt: now(), storeId: SEED_STORE_MAIN_ID, outletId: SEED_STORE_MAIN_ID },
  { id: 'c-mm-02', name: 'Priya Sharma',  mobile: '9123456780',
    email: null, notes: null,
    lendingBalance: 0, createdAt: now(), storeId: SEED_STORE_MAIN_ID, outletId: SEED_STORE_MAIN_ID },
  { id: 'c-mm-03', name: 'Anita Desai',   mobile: '9988776655',
    email: 'anita.d@example.com', notes: 'Prefers COD',
    lendingBalance: 480, createdAt: now(), storeId: SEED_STORE_MAIN_ID, outletId: SEED_STORE_MAIN_ID },

  // Spice Route Kitchen customers
  { id: 'c-fb-01', name: 'Karthik Menon', mobile: '9012345678',
    email: null, notes: 'Weekly electronics buyer',
    lendingBalance: 3200, createdAt: now(), storeId: SEED_STORE_BRANCH_ID, outletId: SEED_STORE_BRANCH_ID },
  { id: 'c-fb-02', name: 'Sneha Iyer',    mobile: '9834567890',
    email: 'sneha@example.com', notes: null,
    lendingBalance: 0, createdAt: now(), storeId: SEED_STORE_BRANCH_ID, outletId: SEED_STORE_BRANCH_ID },

  // Main Street Market customers
  { id: 'c-ws-01', name: 'John Doe',      mobile: '4175550101',
    email: 'jd@example.com', notes: 'Groceries every Sunday',
    lendingBalance: 74.20, createdAt: now(), storeId: SEED_STORE_THIRD_ID, outletId: SEED_STORE_THIRD_ID },
  { id: 'c-ws-02', name: 'Emily Carter',  mobile: '4175550188',
    email: null, notes: null,
    lendingBalance: 0, createdAt: now(), storeId: SEED_STORE_THIRD_ID, outletId: SEED_STORE_THIRD_ID },
];
