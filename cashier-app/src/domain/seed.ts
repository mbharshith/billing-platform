import type { Customer, Store, StoreSettings, User } from './types';

/**
 * Seed data — first-run defaults, loaded when localStorage is empty.
 *
 * SaaS model: each `Store` is a tenant (a company using our SaaS).
 * These three seed tenants are picked to look OBVIOUSLY separate so the
 * multi-tenancy story is unmistakable in demos.
 *
 * NEVER used once a real backend is present.
 */

const now = (): string => new Date().toISOString();

/** Well-known store ids used by seed & migrations. */
export const SEED_STORE_MAIN_ID     = 'store-myntra';
export const SEED_STORE_BRANCH_ID   = 'store-flipkart';
export const SEED_STORE_THIRD_ID    = 'store-walmart';

export const SEED_STORES: readonly Store[] = [
  {
    id: SEED_STORE_MAIN_ID,
    name: 'Myntra Mumbai Flagship',
    city: 'Mumbai',
    phone: '+91 22 4000 1000',
    address: 'Kamala Mills, Lower Parel, Mumbai 400013',
    taxRate: 0.18,          // GST 18%
    currency: 'INR',
    active: true,
    createdAt: now(),
  },
  {
    id: SEED_STORE_BRANCH_ID,
    name: 'Flipkart Bengaluru Central',
    city: 'Bengaluru',
    phone: '+91 80 4700 2000',
    address: 'Vaishnavi Summit, Bellandur, Bengaluru 560103',
    taxRate: 0.18,
    currency: 'INR',
    active: true,
    createdAt: now(),
  },
  {
    id: SEED_STORE_THIRD_ID,
    name: 'Walmart Springfield #4210',
    city: 'Springfield',
    phone: '+1 (417) 555-0100',
    address: '3520 W Sunshine St, Springfield, MO 65807',
    taxRate: 0.0825,
    currency: 'USD',
    active: true,
    createdAt: now(),
  },
];

/**
 * Every user is bound to exactly ONE tenant.
 * Demo credentials — one admin + one cashier per tenant.
 */
export const SEED_USERS: readonly User[] = [
  // --- Myntra Mumbai ------------------------------------------------------
  {
    id: 'u-myntra-admin',
    username: 'myntra',
    name: 'Aditi Rao',
    role: 'admin',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_MAIN_ID,
    password: 'myntra123',
  },
  {
    id: 'u-myntra-cashier',
    username: 'myntra.cashier',
    name: 'Rohan Iyer',
    role: 'cashier',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_MAIN_ID,
    password: 'cashier123',
  },

  // --- Flipkart Bengaluru -------------------------------------------------
  {
    id: 'u-flipkart-admin',
    username: 'flipkart',
    name: 'Vikram Shetty',
    role: 'admin',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_BRANCH_ID,
    password: 'flipkart123',
  },
  {
    id: 'u-flipkart-cashier',
    username: 'flipkart.cashier',
    name: 'Neha Reddy',
    role: 'cashier',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_BRANCH_ID,
    password: 'cashier123',
  },

  // --- Walmart Springfield ------------------------------------------------
  {
    id: 'u-walmart-admin',
    username: 'walmart',
    name: 'Marcus Bennett',
    role: 'admin',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_THIRD_ID,
    password: 'walmart123',
  },
  {
    id: 'u-walmart-cashier',
    username: 'walmart.cashier',
    name: 'Sam Cashier',
    role: 'cashier',
    active: true,
    createdAt: now(),
    storeId: SEED_STORE_THIRD_ID,
    password: 'cashier123',
  },
];

export const SEED_CUSTOMERS: readonly Customer[] = [
  // Myntra Mumbai customers
  { id: 'c-mm-01', name: 'Ravi Kumar',    mobile: '9876543210',
    email: 'ravi@example.com', notes: 'Ethnic wear enthusiast',
    lendingBalance: 1250.50, createdAt: now(), storeId: SEED_STORE_MAIN_ID },
  { id: 'c-mm-02', name: 'Priya Sharma',  mobile: '9123456780',
    email: null, notes: null,
    lendingBalance: 0, createdAt: now(), storeId: SEED_STORE_MAIN_ID },
  { id: 'c-mm-03', name: 'Anita Desai',   mobile: '9988776655',
    email: 'anita.d@example.com', notes: 'Prefers COD',
    lendingBalance: 480, createdAt: now(), storeId: SEED_STORE_MAIN_ID },

  // Flipkart Bengaluru customers
  { id: 'c-fb-01', name: 'Karthik Menon', mobile: '9012345678',
    email: null, notes: 'Weekly electronics buyer',
    lendingBalance: 3200, createdAt: now(), storeId: SEED_STORE_BRANCH_ID },
  { id: 'c-fb-02', name: 'Sneha Iyer',    mobile: '9834567890',
    email: 'sneha@example.com', notes: null,
    lendingBalance: 0, createdAt: now(), storeId: SEED_STORE_BRANCH_ID },

  // Walmart Springfield customers
  { id: 'c-ws-01', name: 'John Doe',      mobile: '4175550101',
    email: 'jd@example.com', notes: 'Groceries every Sunday',
    lendingBalance: 74.20, createdAt: now(), storeId: SEED_STORE_THIRD_ID },
  { id: 'c-ws-02', name: 'Emily Carter',  mobile: '4175550188',
    email: null, notes: null,
    lendingBalance: 0, createdAt: now(), storeId: SEED_STORE_THIRD_ID },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'QuickBill Corner Store',
  address: '123 Market Street, Springfield, IL 62701',
  phone: '+1 (555) 123-4567',
  gstin: '',
  taxRate: 0.0825,
  currency: 'USD',
  receiptFooter: 'Thank you for shopping with us. Returns accepted within 30 days.',
};
